import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        const destinationUrl = state.url; // Use state.url (destination), NOT this.router.url (current)

        // If not authenticated or token expired, redirect to login
        if (!isAuthenticated || this.authService.isTokenExpired()) {
          console.warn('AuthGuard: Not authenticated, redirecting to login from:', destinationUrl);
          this.authService.clearAuthData(); // clear stale data if token expired
          return this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: destinationUrl }
          });
        }

        console.log('AuthGuard: Authenticated, allowing access to:', destinationUrl);
        return true;
      })
    );
  }

  private getRoleBasedRedirect(): UrlTree {
    const userRole = this.authService.getUserRole();

    switch (userRole) {
      case 'ADMIN':
        return this.router.parseUrl('/admin/dashboard');
      case 'STAGIAIRE':
        return this.router.parseUrl('/student/dashboard');
      case 'ENCADRANT_PROFESSIONNEL':
      case 'ENCADRANT_ACADEMIQUE':
        return this.router.parseUrl('/encadrant/dashboard');
      case 'RESPONSABLE_SERVICE_STAGES':
        return this.router.parseUrl('/responsable/dashboard');
      case 'RESPONSABLE_ENTREPRISE':
        return this.router.parseUrl('/company/dashboard');
      default:
        return this.router.parseUrl('/login');
    }
  }
}

