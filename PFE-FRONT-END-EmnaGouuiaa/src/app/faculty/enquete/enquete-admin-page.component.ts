import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnqueteSatisfaction, EnqueteService } from '../../services/enquete.service';

@Component({
  selector: 'app-enquete-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">

      <!-- En-tête -->
      <header class="page-hero">
        <div>
          <h1>Enquête de satisfaction</h1>
          <p>Configurez l'enquête générale proposée aux stagiaires, encadrants et représentants d'entreprise.</p>
          <div class="hero-badges">
            <span class="hero-badge">Formulaire externe</span>
            <span class="hero-badge"
              [class.badge-active]="enquete?.active"
              [class.badge-inactive]="!enquete?.active">
              {{ enquete?.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary"
            (click)="loadEnquete()"
            [disabled]="isLoading || isSaving || isToggling">
            Actualiser
          </button>
        </div>
      </header>

      <!-- Alertes globales -->
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage"   class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="isLoading"      class="loading">Chargement de l'enquête...</div>

      <section class="content-grid single-form-grid" *ngIf="!isLoading">

        <!-- ─── Colonne principale : formulaire ─── -->
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Configuration</h2>
              <div class="panel-subtitle">
                Une seule enquête est enregistrée pour toute l'application.
              </div>
            </div>
            <span class="status-pill"
              [class.status-positive]="isConfigured"
              [class.status-neutral]="!isConfigured">
              {{ isConfigured ? 'Configurée' : 'Non configurée' }}
            </span>
          </div>

          <form class="stack" (ngSubmit)="saveEnquete()">
            <div class="form-grid">

              <!-- Titre -->
              <div class="full-width">
                <label for="enq-titre">Titre de l'enquête *</label>
                <input
                  id="enq-titre"
                  name="titre"
                  class="input"
                  type="text"
                  [(ngModel)]="draft.titre"
                  placeholder="Enquête de satisfaction"
                  [disabled]="isSaving"
                />
                <div *ngIf="errors.titre" class="field-error">{{ errors.titre }}</div>
              </div>

              <!-- Description -->
              <div class="full-width">
                <label for="enq-description">Description *</label>
                <textarea
                  id="enq-description"
                  name="description"
                  class="textarea"
                  rows="4"
                  [(ngModel)]="draft.description"
                  placeholder="Merci de répondre à cette enquête de satisfaction."
                  [disabled]="isSaving"
                ></textarea>
                <div *ngIf="errors.description" class="field-error">{{ errors.description }}</div>
              </div>

              <!-- URL formulaire -->
              <div class="full-width">
                <label for="enq-url">URL externe du formulaire *</label>
                <input
                  id="enq-url"
                  name="urlFormulaire"
                  class="input"
                  type="url"
                  [(ngModel)]="draft.urlFormulaire"
                  placeholder="https://forms.gle/..."
                  [disabled]="isSaving"
                />
                <div *ngIf="errors.urlFormulaire" class="field-error">{{ errors.urlFormulaire }}</div>
                <div class="field-hint">
                  Doit commencer par <code>http://</code> ou <code>https://</code>.
                </div>
              </div>

            </div><!-- /form-grid -->

            <!-- Boutons du formulaire -->
            <div class="inline-actions">
              <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button type="button" class="btn btn-secondary"
                (click)="resetDraft()"
                [disabled]="isSaving">
                Réinitialiser
              </button>
              <a *ngIf="isConfigured && enquete?.urlFormulaire"
                class="link-button"
                [href]="enquete!.urlFormulaire!"
                target="_blank"
                rel="noopener noreferrer">
                Prévisualiser le formulaire
              </a>
            </div>
          </form>
        </article>

        <!-- ─── Colonne secondaire : statut & toggle ─── -->
        <aside class="stack">

          <!-- Panneau statut -->
          <article class="panel">
            <div class="panel-header">
              <div>
                <h2>Statut de l'enquête</h2>
                <div class="panel-subtitle">Contrôle la visibilité pour les utilisateurs.</div>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Visibilité actuelle</div>
              <div class="status-block"
                [class.status-block-active]="enquete?.active"
                [class.status-block-inactive]="!enquete?.active">
                <span class="status-dot"></span>
                {{ enquete?.active
                    ? 'Active — visible par les stagiaires, encadrants et représentants'
                    : 'Inactive — masquée pour tous les utilisateurs' }}
              </div>

              <div *ngIf="toggleError" class="field-error" style="margin-top:8px">{{ toggleError }}</div>

              <div class="inline-actions" style="margin-top: 16px">
                <button type="button"
                  class="btn"
                  [class.btn-danger]="enquete?.active"
                  [class.btn-success]="!enquete?.active"
                  (click)="toggleEnquete()"
                  [disabled]="isToggling || isSaving">
                  {{ toggleLabel }}
                </button>
              </div>
            </div>

            <!-- Date de modification -->
            <div *ngIf="enquete?.dateModification" class="detail-card" style="margin-top: 12px">
              <div class="info-title">Dernière modification</div>
              <div class="info-meta">{{ formatDate(enquete!.dateModification!) }}</div>
            </div>
          </article>

          <!-- Panneau règles d'affichage -->
          <article class="panel">
            <div class="panel-header">
              <div>
                <h2>Règles d'affichage</h2>
              </div>
            </div>
            <div class="detail-card">
              <div class="info-meta">• L'enquête apparaît dans le tableau de bord de chaque utilisateur concerné si elle est <strong>active</strong>.</div>
              <div class="info-meta">• Un bouton "Répondre à l'enquête" redirige vers le formulaire externe dans un nouvel onglet.</div>
              <div class="info-meta">• Si l'URL est absente ou invalide, le bouton n'est pas affiché (E2).</div>
              <div class="info-meta">• Seul le RESPONSABLE_STAGE peut modifier ou activer/désactiver l'enquête (E3).</div>
            </div>
          </article>

        </aside>

      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css'],
  styles: [`
    .single-form-grid {
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
    }
    @media (max-width: 920px) {
      .single-form-grid { grid-template-columns: 1fr; }
    }

    .field-error {
      margin-top: 6px;
      color: var(--primary-color, #c0392b);
      font-size: 0.84rem;
      font-weight: 700;
    }
    .field-hint {
      margin-top: 4px;
      font-size: 0.82rem;
      color: var(--text-muted, #888);
    }
    code {
      background: var(--bg-subtle, #f4f4f4);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.85em;
    }

    /* Badge d'état dans le hero */
    .badge-active  { background: #d4edda; color: #155724; }
    .badge-inactive { background: #f8d7da; color: #721c24; }

    /* Bloc statut coloré */
    .status-block {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      margin-top: 8px;
    }
    .status-block-active  { background: #d4edda; color: #155724; }
    .status-block-inactive { background: #f8d7da; color: #721c24; }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: currentColor;
    }

    /* Boutons extra */
    .btn-success { background: #28a745; color: #fff; border: none; }
    .btn-success:hover:not(:disabled) { background: #218838; }
    .btn-danger  { background: #dc3545; color: #fff; border: none; }
    .btn-danger:hover:not(:disabled)  { background: #c82333; }
  `]
})
export class EnqueteAdminPageComponent implements OnInit {

  enquete: EnqueteSatisfaction | null = null;

  draft: { titre: string; description: string; urlFormulaire: string } = {
    titre: '',
    description: '',
    urlFormulaire: ''
  };

  errors: { titre?: string; description?: string; urlFormulaire?: string } = {};
  toggleError = '';

  isLoading = false;
  isSaving  = false;
  isToggling = false;

  successMessage = '';
  errorMessage   = '';

  constructor(private enqueteService: EnqueteService) {}

  ngOnInit(): void {
    this.loadEnquete();
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  get isConfigured(): boolean {
    return !!(
      this.trim(this.enquete?.titre)
      && this.trim(this.enquete?.description)
      && this.trim(this.enquete?.urlFormulaire)
    );
  }

  get toggleLabel(): string {
    if (this.isToggling) return 'Mise à jour...';
    return this.enquete?.active ? "Désactiver l'enquête" : "Activer l'enquête";
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  loadEnquete(): void {
    this.isLoading = true;
    this.clearMessages();

    this.enqueteService.getEnquete().subscribe({
      next: (data) => {
        this.enquete = data;
        this.resetDraft();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, 'E1 — Enquête introuvable ou service indisponible.');
        this.isLoading = false;
      }
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  saveEnquete(): void {
    this.clearMessages();
    this.errors = {};

    const titre       = this.trim(this.draft.titre);
    const description = this.trim(this.draft.description);
    const url         = this.validateUrl(this.draft.urlFormulaire);

    if (!titre)       this.errors.titre       = 'Le titre est obligatoire.';
    if (!description) this.errors.description = 'La description est obligatoire.';
    if (url === null)      this.errors.urlFormulaire = 'E2 — L\'URL du formulaire est obligatoire.';
    else if (url === false) this.errors.urlFormulaire = 'E2 — L\'URL doit commencer par http:// ou https://.';

    if (Object.keys(this.errors).length > 0) return;

    this.isSaving = true;
    this.enqueteService.updateEnquete({
      titre: titre!,
      description: description!,
      urlFormulaire: url as string
    }).subscribe({
      next: (data) => {
        this.enquete = data;
        this.resetDraft();
        this.successMessage = 'L\'enquête a été enregistrée avec succès.';
        this.isSaving = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, 'E4 — Erreur technique lors de l\'enregistrement.');
        this.isSaving = false;
      }
    });
  }

  // ── Toggle ──────────────────────────────────────────────────────────────────

  toggleEnquete(): void {
    this.toggleError = '';
    this.clearMessages();
    this.isToggling = true;

    this.enqueteService.toggleEnquete().subscribe({
      next: (data) => {
        this.enquete = data;
        this.successMessage = data.active
          ? 'L\'enquête est maintenant active et visible.'
          : 'L\'enquête a été désactivée.';
        this.isToggling = false;
      },
      error: (err) => {
        this.toggleError = this.describeError(err, 'E4 — Impossible de modifier le statut de l\'enquête.');
        this.isToggling = false;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  resetDraft(): void {
    this.errors = {};
    this.draft = {
      titre:         this.enquete?.titre         ?? '',
      description:   this.enquete?.description   ?? '',
      urlFormulaire: this.enquete?.urlFormulaire ?? ''
    };
  }

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage   = '';
  }

  private trim(v?: string | null): string | null {
    const t = (v ?? '').trim();
    return t || null;
  }

  /** Retourne la valeur nettoyée (string), null si vide, false si invalide. */
  private validateUrl(v: string): string | null | false {
    const t = v.trim();
    if (!t) return null;
    try {
      const p = new URL(t);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') return false;
      return t;
    } catch {
      return false;
    }
  }

  private describeError(err: any, fallback: string): string {
    if (err?.status === 401) return 'E3 — Session expirée. Veuillez vous reconnecter.';
    if (err?.status === 403) return 'E3 — Accès refusé à cette fonctionnalité.';
    if (err?.status === 404) return 'E1 — Enquête introuvable (endpoint absent).';
    if (typeof err?.error?.message === 'string' && err.error.message.trim()) return err.error.message;
    if (typeof err?.error === 'string' && err.error.trim()) return err.error;
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  }
}
