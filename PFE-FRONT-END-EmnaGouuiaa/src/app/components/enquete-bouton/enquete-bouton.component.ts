import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EnqueteSatisfaction, EnqueteService } from '../../services/enquete.service';

/**
 * Composant autonome affiché dans les tableaux de bord des rôles non-admin.
 * Il charge la configuration de l'enquête et affiche un bouton uniquement si
 * l'enquête est active ET que l'URL est valide.
 *
 * Cas d'exception couverts :
 *   E1 — Enquête introuvable (erreur 404 ou technique) → message discret
 *   E2 — URL absente ou invalide                       → bouton masqué
 *   E3 — Accès refusé (401/403)                        → message d'erreur
 *   E4 — Erreur technique                              → message discret
 */
@Component({
  selector: 'app-enquete-bouton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Chargement silencieux -->
    <div *ngIf="isLoading" class="enquete-loading">
      <span class="enquete-dot-anim">Chargement de l'enquête...</span>
    </div>

    <!-- Erreur non-bloquante (E1, E3, E4) -->
    <div *ngIf="!isLoading && errorMessage" class="enquete-error-note">
      {{ errorMessage }}
    </div>

    <!-- Enquête active avec URL valide -->
    <div *ngIf="!isLoading && showButton" class="enquete-card">
      <div class="enquete-card-body">
        <div class="enquete-icon">📋</div>
        <div class="enquete-text">
          <div class="enquete-title">{{ enquete!.titre }}</div>
          <div class="enquete-desc">{{ enquete!.description }}</div>
        </div>
      </div>
      <a
        [href]="enquete!.urlFormulaire!"
        target="_blank"
        rel="noopener noreferrer"
        class="enquete-btn"
        (click)="trackOpen()">
        Répondre à l'enquête
        <span class="enquete-arrow">↗</span>
      </a>
    </div>

    <!-- Enquête inactive — rien n'est affiché (comportement volontaire) -->
  `,
  styles: [`
    .enquete-loading,
    .enquete-error-note {
      font-size: 0.82rem;
      color: var(--text-muted, #aaa);
      padding: 6px 0;
    }
    .enquete-error-note {
      color: var(--primary-color, #c0392b);
    }

    .enquete-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
      border: 1px solid #bee3f8;
      border-radius: 12px;
      padding: 18px 20px;
      margin: 12px 0;
    }

    .enquete-card-body {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .enquete-icon {
      font-size: 1.6rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .enquete-text {
      flex: 1;
    }

    .enquete-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1a3a5c;
      margin-bottom: 4px;
    }

    .enquete-desc {
      font-size: 0.87rem;
      color: #4a6785;
      line-height: 1.45;
    }

    .enquete-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: #2563eb;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      align-self: flex-start;
      transition: background 0.18s;
    }
    .enquete-btn:hover {
      background: #1d4ed8;
    }

    .enquete-arrow {
      font-size: 0.85rem;
      opacity: 0.85;
    }

    @keyframes dotPulse {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 1; }
    }
    .enquete-dot-anim { animation: dotPulse 1.4s infinite; }
  `]
})
export class EnqueteBoutonComponent implements OnInit {

  enquete: EnqueteSatisfaction | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private enqueteService: EnqueteService) {}

  ngOnInit(): void {
    this.isLoading = true;
    // Utilise /api/enquete/acteur (accessible à tous les rôles authentifiés)
    // au lieu de /api/enquete (restreint à RESPONSABLE_STAGE / ADMINISTRATEUR),
    // ce qui évitait le 401 → déconnexion intempestive pour EP, EA, STAGIAIRE, RE.
    this.enqueteService.getEnqueteActeur().subscribe({
      next: (data) => {
        this.enquete = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err);
        this.isLoading = false;
      }
    });
  }

  /** Vrai uniquement si active ET URL http(s) valide. */
  get showButton(): boolean {
    if (!this.enquete?.active) return false;
    const url = (this.enquete.urlFormulaire ?? '').trim();
    if (!url) return false;  // E2 — URL absente
    try {
      const p = new URL(url);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch {
      return false;  // E2 — URL invalide
    }
  }

  trackOpen(): void {
    // Point d'extension : log analytique si besoin.
    console.info('[EnqueteBouton] Ouverture du formulaire :', this.enquete?.urlFormulaire);
  }

  private describeError(err: any): string {
    if (err?.status === 401 || err?.status === 403)
      return 'E3 — Accès non autorisé à l\'enquête.';
    if (err?.status === 404)
      return '';  // E1 — Pas d'enquête configurée → silence
    return '';    // E4 — Erreur technique → silence (non-bloquant)
  }
}
