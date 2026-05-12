import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur, UtilisateurActuel } from '../../services/authentification.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-card">
        <div class="icon-section" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>

        <div class="content-section">
          <h1>Accès refusé</h1>
          <p>Vous n’avez pas la permission d’accéder à cette page.</p>

          <div class="user-info" *ngIf="(currentUser$ | async) as u">
            <p><strong>Votre rôle :</strong> {{ getRoleDisplayName(u.role || '') }}</p>
<<<<<<< HEAD
            <p><strong>Rôles requis :</strong> {{ getRequiredRoles() }}</p>
=======
            <p><strong>Required Roles:</strong> {{ getRequiredRoles() }}</p>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
          </div>
          
          <div class="actions">
            <button class="btn btn-primary" (click)="goToDashboard()">
              Aller au tableau de bord
            </button>
            <button class="btn btn-secondary" (click)="logout()">
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .unauthorized-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
      max-width: 500px;
      width: 100%;
    }

    .icon-section {
      background: #f8f9fa;
      padding: 3rem;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }

    .icon-section svg {
      color: #dc3545;
    }

    .content-section {
      padding: 2rem;
    }

    .content-section h1 {
      color: #2c3e50;
      margin-bottom: 1rem;
      text-align: center;
    }

    .content-section p {
      color: #6c757d;
      text-align: center;
      margin-bottom: 2rem;
    }

    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .user-info p {
      text-align: left;
      margin: 0.5rem 0;
      color: #495057;
    }

    .user-info strong {
      color: #2c3e50;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .unauthorized-container {
        padding: 1rem;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class Unauthorized implements OnInit {
  currentUser$: Observable<UtilisateurActuel | null>;
  requiredRoles: string[] = [];

  constructor(
    private authService: AuthentificationService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.utilisateurActuel$;
  }

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as any;
    const fromState = (state?.rolesRequis ?? state?.requiredRoles) as any;
    if (Array.isArray(fromState)) this.requiredRoles = fromState.map((r) => String(r));
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      [RoleUtilisateur.ADMINISTRATEUR]: 'Administrateur',
      [RoleUtilisateur.STAGIAIRE]: 'Stagiaire',
      [RoleUtilisateur.ENCADRANT_PROFESSIONNEL]: 'Encadrant professionnel',
      [RoleUtilisateur.ENCADRANT_ACADEMIQUE]: 'Encadrant académique',
<<<<<<< HEAD
      [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES]: 'Responsable du service des stages',
      [RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'Responsable universitaire des stages',
      [RoleUtilisateur.RESPONSABLE_ENTREPRISE]: 'Responsable d’entreprise'
=======
      [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES]: 'Responsable service stages',
      [RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'Responsable universitaire stages',
      [RoleUtilisateur.RESPONSABLE_ENTREPRISE]: 'Responsable entreprise'
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    };
    return roleNames[role] || role || '—';
  }

  getRequiredRoles(): string {
<<<<<<< HEAD
    if (this.requiredRoles.length === 0) return 'Inconnu';
=======
    if (this.requiredRoles.length === 0) return 'Unknown';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    return this.requiredRoles.map(role => this.getRoleDisplayName(role)).join(', ');
  }

  goToDashboard(): void {
    const role = this.authService.getRoleUtilisateur();

    switch (role) {
      case RoleUtilisateur.ADMINISTRATEUR:
        this.router.navigate(['/admin/tableau-de-bord']);
        return;
      case RoleUtilisateur.STAGIAIRE:
        this.router.navigate(['/etudiant/tableau-de-bord']);
        return;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        this.router.navigate(['/enseignant/tableau-de-bord']);
        return;
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
<<<<<<< HEAD
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        this.router.navigate(['/responsable/tableau-de-bord']);
        return;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        this.router.navigate(['/entreprise/tableau-de-bord']);
        return;
      default:
        this.router.navigate(['/connexion']);
        return;
    }
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
