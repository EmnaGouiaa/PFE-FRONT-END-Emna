import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar student-sidebar">
        <div class="sidebar-header student-header">
          <div class="title">Espace stagiaire</div>
          <div class="subtitle">Gestion de votre parcours de stage</div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/etudiant/tableau-de-bord" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3h7v7H3z" />
                <path d="M14 3h7v4h-7z" />
                <path d="M14 11h7v10h-7z" />
                <path d="M3 14h7v7H3z" />
              </svg>
            </span>
            <span>Tableau de bord</span>
          </a>

          <a routerLink="/etudiant/demande-entreprise" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21V7a2 2 0 0 1 2-2h6v16" />
                <path d="M13 21V3h6a2 2 0 0 1 2 2v16" />
              </svg>
            </span>
            <span>Demande entreprise</span>
          </a>

          <a routerLink="/etudiant/offres" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7h16" />
                <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                <path d="M9 11h6" />
                <path d="M9 15h4" />
              </svg>
            </span>
            <span>Offres de stage</span>
          </a>

          <a routerLink="/etudiant/mon-stage" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10l1 7H6z" />
              </svg>
            </span>
            <span>Mon stage</span>
          </a>

          <a routerLink="/etudiant/suivi-stage" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 4 4 6-8" />
              </svg>
            </span>
            <span>Suivi du stage</span>
          </a>

          <a routerLink="/etudiant/reunions" routerLinkActive="active" class="nav-item">
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

          <a routerLink="/etudiant/enquete-satisfaction" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <path d="M9 5a3 3 0 0 1 6 0" />
                <path d="M9 13l2 2 4-4" />
              </svg>
            </span>
            <span>Enquête de satisfaction</span>
          </a>

          <a routerLink="/etudiant/documents-stage" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <span>Documents de stage</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/etudiant/profil" routerLinkActive="active" class="nav-item">
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
  styleUrls: ['../../admin/layout/admin-layout.component.css', './student-layout.component.css']
})
export class StudentLayoutComponent {
  constructor(
    private authService: AuthentificationService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
