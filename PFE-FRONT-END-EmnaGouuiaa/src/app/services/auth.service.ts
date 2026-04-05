import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  compteValide: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ENCADRANT_PROFESSIONNEL = 'ENCADRANT_PROFESSIONNEL',
  ENCADRANT_ACADEMIQUE = 'ENCADRANT_ACADEMIQUE',
  RESPONSABLE_SERVICE_STAGES = 'RESPONSABLE_SERVICE_STAGES',
  RESPONSABLE_UNIVERSITAIRE_STAGES = 'RESPONSABLE_UNIVERSITAIRE_STAGES',
  RESPONSABLE_ENTREPRISE = 'RESPONSABLE_ENTREPRISE',
  STAGIAIRE = 'STAGIAIRE'
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:9999/api/v1';
  private readonly TOKEN_KEY = 'jwtToken';
  private readonly USER_KEY = 'currentUser';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthFromStorage();
  }

  private initializeAuthFromStorage(): void {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.clearAuthData();
    }
  }

  login(data: { email: string; password: string }): Observable<LoginResponse> {
    const loginUrl = 'http://localhost:9999/api/v1/auth/authenticate';

    console.log('🌍 AuthService: Login request details:');
    console.log('🔗 URL:', loginUrl);
    console.log('📧 Email:', data.email);
    console.log('🔑 Password length:', data.password.length);
    console.log('📦 Request body:', JSON.stringify(data, null, 2));

    return this.http.post<LoginResponse>(loginUrl, data)
      .pipe(
        tap(response => {
          console.log('✅ AuthService: Received response:', response);
          console.log('✅ AuthService: Token received:', !!response.token);
          console.log('✅ AuthService: User data:', response.user);

          if (response.token && response.user) {
            console.log('💾 AuthService: Storing auth data...');

            // Store in localStorage with consistent keys
            localStorage.setItem(this.TOKEN_KEY, response.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

            // Update BehaviorSubjects
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);

            console.log('✅ AuthService: Auth data stored successfully');
            console.log('✅ AuthService: Current user role:', this.getUserRole());
            console.log('✅ AuthService: Is authenticated:', this.isAuthenticatedSubject.value);
          } else {
            console.error('❌ AuthService: Missing token or user in response!');
          }
        }),
        catchError(error => {
          console.error('❌ AuthService: Login error:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          return throwError(() => error);
        })
      );
  }

  logout(showMessage: boolean = true): void {
    this.clearAuthData();

    if (showMessage) {
      sessionStorage.setItem('logoutMessage', 'You have been successfully logged out');
    }

    this.router.navigate(['/login']);
  }

  private setAuthData(token: string, user: User): void {
    console.log('💾 setAuthData called with:', { token: token.substring(0, 20) + '...', user });

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);

    console.log('💾 Auth subjects updated:', {
      currentUser: this.currentUserSubject.value,
      isAuthenticated: this.isAuthenticatedSubject.value
    });
  }

  public clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  hasRole(role: UserRole): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getUserRole();
    return roles.includes(userRole as UserRole);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isStagiaire(): boolean {
    return this.hasRole(UserRole.STAGIAIRE);
  }

  isEncadrant(): boolean {
    return this.hasAnyRole([
      UserRole.ENCADRANT_PROFESSIONNEL,
      UserRole.ENCADRANT_ACADEMIQUE
    ]);
  }

  isResponsable(): boolean {
    return this.hasAnyRole([
      UserRole.RESPONSABLE_SERVICE_STAGES,
      UserRole.RESPONSABLE_ENTREPRISE
    ]);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  getLogoutMessage(): string | null {
    const message = sessionStorage.getItem('logoutMessage');
    sessionStorage.removeItem('logoutMessage');
    return message;
  }

  refreshToken(): Observable<LoginResponse> {
    return throwError(() => new Error('Token refresh not implemented'));
  }
}
