import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token for login and register endpoints
    if (this.isAuthEndpoint(request.url)) {
      return next.handle(request);
    }

    const token = this.authService.getToken();
    
    if (token) {
      request = this.addTokenToRequest(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expired or invalid
          console.warn('JWT Token expired or invalid');
          
          // Check if token is actually expired
          if (this.authService.isTokenExpired()) {
            // Auto-logout with message
            this.authService.logout(true);
            return throwError(() => new Error('Session expired. Please login again.'));
          } else {
            // Token is invalid, logout without message
            this.authService.logout(false);
            return throwError(() => new Error('Authentication failed. Please login again.'));
          }
        } else if (error.status === 403) {
          // Forbidden - insufficient permissions
          console.warn('Access forbidden: Insufficient permissions');
          return throwError(() => new Error('You do not have permission to perform this action.'));
        } else {
          return throwError(() => error);
        }
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/authenticate') || 
           url.includes('/auth/register') || 
           url.includes('/auth/refresh');
  }
}
