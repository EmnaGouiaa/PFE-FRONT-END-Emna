import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  currentUser$: Observable<User | null>;
  isAdmin$: Observable<boolean>;
  isStagiaire$: Observable<boolean>;
  isEncadrant$: Observable<boolean>;
  isResponsable$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => this.authService.hasRole(UserRole.ADMIN))
    );
    this.isStagiaire$ = this.authService.currentUser$.pipe(
      map(user => this.authService.hasRole(UserRole.STAGIAIRE))
    );
    this.isEncadrant$ = this.authService.currentUser$.pipe(
      map(user => this.authService.isEncadrant())
    );
    this.isResponsable$ = this.authService.currentUser$.pipe(
      map(user => this.authService.isResponsable())
    );
  }

  ngOnInit(): void {}

  logout(): void {
    this.authService.logout();
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  getUserName(): Observable<string> {
    return this.currentUser$.pipe(
      map(user => user ? `${user.prenom} ${user.nom}` : '')
    );
  }

  getUserRole(): Observable<string> {
    return this.currentUser$.pipe(
      map(user => user?.role || '')
    );
  }

  getRoleDisplayName(role: string | null): string {
    if (!role) return 'User';
    
    const roleNames: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.STAGIAIRE]: 'Student',
      [UserRole.ENCADRANT_PROFESSIONNEL]: 'Professional Supervisor',
      [UserRole.ENCADRANT_ACADEMIQUE]: 'Academic Supervisor',
      [UserRole.RESPONSABLE_SERVICE_STAGES]: 'Internship Service Manager',
      [UserRole.RESPONSABLE_ENTREPRISE]: 'Company Manager'
    };
    return roleNames[role] || role;
  }
}
