import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService, UserRole } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const allowedRoles = route.data?.['roles'] as UserRole[] || [];

    console.log('🔒 RoleGuard checking access to:', state.url);
    console.log('🔒 Required roles:', allowedRoles);

    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        console.log('🔒 isAuthenticated:', isAuthenticated);

        if (!isAuthenticated || this.authService.isTokenExpired()) {
          console.warn('🔒 Not authenticated, redirecting to login');
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        const userRole = this.authService.getUserRole();
        console.log('🔒 User role:', userRole);

        if (!userRole) {
          console.error('🔒 No user role found, redirecting to unauthorized');
          this.router.navigate(['/unauthorized']);
          return false;
        }

        const hasRequiredRole = allowedRoles.includes(userRole as UserRole);
        console.log('🔒 Has required role:', hasRequiredRole);

        if (!hasRequiredRole) {
          // Redirect to unauthorized page with required roles info
          console.warn('🔒 Insufficient permissions. Required:', allowedRoles, 'Got:', userRole);
          this.router.navigate(['/unauthorized'], {
            state: { requiredRoles: allowedRoles }
          });
          return false;
        }

        console.log('✅ RoleGuard: Access granted');
        return true;
      })
    );
  }

  private redirectToUserDashboard(userRole: string): void {
    const dashboardRoutes: { [key: string]: string } = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.STAGIAIRE]: '/student/dashboard',
      [UserRole.ENCADRANT_PROFESSIONNEL]: '/encadrant/dashboard',
      [UserRole.ENCADRANT_ACADEMIQUE]: '/encadrant/dashboard',
      [UserRole.RESPONSABLE_SERVICE_STAGES]: '/responsable/dashboard',
      [UserRole.RESPONSABLE_ENTREPRISE]: '/company/dashboard'
    };

    const dashboard = dashboardRoutes[userRole] || '/dashboard';
    this.router.navigate([dashboard]);
  }
}
