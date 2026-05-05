import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { SupervisorRole } from '../../services/supervisor/supervisor.models';

@Component({
  selector: 'app-supervisor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell supervisor-shell">
      <aside class="admin-sidebar supervisor-sidebar">
        <div class="sidebar-header supervisor-header">
          <div class="title">{{ role === 'ENCADRANT_ACADEMIQUE' ? 'Encadrant académique' : 'Encadrant professionnel' }}</div>
          <div class="subtitle">Gestion et suivi des stages</div>
        </div>

        <div class="supervisor-identity">
          <div class="identity-name">{{ fullName }}</div>
          <div class="identity-meta">{{ email || 'Session active' }}</div>
          <div class="identity-meta">Rôle : {{ roleLabel }}</div>
        </div>

        <nav class="sidebar-nav">
          <a [routerLink]="[basePath, 'tableau-de-bord']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 13h8V3H3z" />
                <path d="M13 21h8v-6h-8z" />
                <path d="M13 11h8V3h-8z" />
                <path d="M3 21h8v-6H3z" />
              </svg>
            </span>
            <span>Tableau de bord</span>
          </a>

          <a [routerLink]="[basePath, 'stagiaires']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 2 6 2 9 0v-5" />
              </svg>
            </span>
            <span>Stagiaires / Stages</span>
          </a>

          <a [routerLink]="[basePath, 'reunions']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <span>Réunions</span>
          </a>

          <a [routerLink]="[basePath, 'enquete-satisfaction']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <path d="M9 5a3 3 0 0 1 6 0" />
                <path d="M9 13l2 2 4-4" />
              </svg>
            </span>
            <span>Enquête de satisfaction</span>
          </a>

          <a [routerLink]="[basePath, 'documents-stage']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
                <path d="M20 2H6.5A2.5 2.5 0 0 0 4 4.5v15" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
              </svg>
            </span>
            <span>Documents de stage</span>
          </a>

          <a [routerLink]="[basePath, 'notifications']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <span>Notifications</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a [routerLink]="[basePath, 'profil']" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
              </svg>
            </span>
            <span>Gérer profil</span>
          </a>

          <button type="button" class="nav-item nav-item-logout" (click)="logout()">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['../../admin/layout/admin-layout.component.css', '../supervisor-shared.css']
})
export class SupervisorLayoutComponent {
  readonly role: SupervisorRole;
  readonly fullName: string;
  readonly email: string;

  constructor(private authService: AuthentificationService, private router: Router) {
    const currentRole = this.authService.getRoleUtilisateur();
    this.role =
      currentRole === RoleUtilisateur.ENCADRANT_ACADEMIQUE
        ? 'ENCADRANT_ACADEMIQUE'
        : 'ENCADRANT_PROFESSIONNEL';
    this.fullName = this.authService.getNomComplet() || 'Encadrant';
    this.email = this.authService.getEmail() || '';
  }

  get basePath(): string {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? '/encadrant-academique' : '/encadrant-professionnel';
  }

  get roleLabel(): string {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? 'Encadrant académique' : 'Encadrant professionnel';
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
