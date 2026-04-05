import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      console.log('🔒 AdminGuard: No token found, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }

    // Check if token is expired
    if (this.authService.isTokenExpired()) {
      console.log('🔒 AdminGuard: Token expired, redirecting to login');
      this.authService.logout();
      this.router.navigate(['/login']);
      return false;
    }

    // Check if user has ADMIN role
    const userRole = this.authService.getUserRole();
    if (userRole !== 'ADMIN' || userRole === null) {
      console.log('🔒 AdminGuard: User is not ADMIN or role is null, redirecting to unauthorized');
      this.router.navigate(['/unauthorized']);
      return false;
    }

    console.log('✅ AdminGuard: User is authenticated as ADMIN');
    return true;
  }
}
