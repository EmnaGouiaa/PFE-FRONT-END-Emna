import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-faculty-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar faculty-sidebar">
        <div class="sidebar-header faculty-header">
          <div class="title">Portail responsable</div>
          <div class="subtitle">{{ portalSubtitle }}</div>
        </div>

        <div class="faculty-identity">
          <div class="identity-name">{{ fullName }}</div>
          <div class="identity-meta">{{ email || 'Session active' }}</div>
          <div class="identity-meta">Rôle : {{ roleLabel }}</div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/responsable/tableau-de-bord" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
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

          <a routerLink="/responsable/validation-offres" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span>Offres à valider</span>
          </a>

          <a routerLink="/responsable/offres" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10" />
                <path d="M7 12h10" />
                <path d="M7 16h6" />
              </svg>
            </span>
            <span>Offres de stage</span>
          </a>

          <a routerLink="/responsable/demandes-entreprises" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7h16" />
                <path d="M7 3v4" />
                <path d="M17 3v4" />
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 12h8" />
                <path d="M12 9v6" />
              </svg>
            </span>
            <span>Demandes d’entreprise</span>
          </a>

          <a routerLink="/responsable/stages" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 2 6 2 9 0v-5" />
              </svg>
            </span>
            <span>Stages</span>
          </a>

          <a routerLink="/responsable/affectations-encadrants" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 11h-6" />
                <path d="M20 8v6" />
              </svg>
            </span>
            <span>Encadrants</span>
          </a>

          <a routerLink="/responsable/documents-stage" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M8 13h8" />
                <path d="M8 17h6" />
              </svg>
            </span>
            <span>Documents de stage</span>
          </a>

          <a routerLink="/responsable/reunions" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 15h8" />
              </svg>
            </span>
            <span>Réunions finales</span>
          </a>

          <a routerLink="/responsable/enquete-satisfaction" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                <path d="M8 7h5" />
                <path d="M8 17h8" />
              </svg>
            </span>
            <span>Enquête de satisfaction</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/responsable/profil" routerLinkActive="active" class="nav-item">
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
  styleUrls: ['../../admin/layout/admin-layout.component.css', './faculty-layout.component.css']
})
export class FacultyLayoutComponent {
  readonly fullName: string;
  readonly email: string;
  readonly roleLabel: string;
  readonly portalSubtitle = 'Responsable des stages';

  constructor(
    private authService: AuthentificationService,
    private router: Router
  ) {
    this.fullName = this.authService.getNomComplet() || 'Responsable des stages';
    this.email = this.authService.getEmail() || '';
    this.roleLabel = this.authService.getRoleUtilisateur() || 'RESPONSABLE_STAGES';
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
