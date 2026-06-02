import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnqueteSatisfaction, EnqueteService } from '../../services/enquete.service';
import { SatisfactionSurveyPageShellComponent } from '../../components/satisfaction-survey/satisfaction-survey-page-shell.component';
import { SatisfactionSurveyStateViewComponent } from '../../components/satisfaction-survey/satisfaction-survey-state-view.component';
import {
  resolveSatisfactionSurveyAdminPreview,
  SatisfactionSurveyViewModel
} from '../../components/satisfaction-survey/satisfaction-survey-state.model';

@Component({
  selector: 'app-enquete-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SatisfactionSurveyPageShellComponent,
    SatisfactionSurveyStateViewComponent
  ],
  template: `
    <app-satisfaction-survey-page-shell
      [wide]="true"
      [isLoading]="isLoading"
      [errorMessage]="errorMessage"
      [subtitle]="adminSubtitle"
      (refresh)="loadEnquete()"
    >
      <div *ngIf="successMessage" class="enq-alert enq-alert--success" role="status">{{ successMessage }}</div>

      <div class="enq-admin-grid" *ngIf="!isLoading">
        <article class="enq-admin-panel">
          <div class="enq-admin-panel__header">
            <h2>Configuration</h2>
            <span class="enq-state-badge enq-state-badge--unavailable" *ngIf="!isConfigured">Non configurée</span>
            <span class="enq-state-badge enq-state-badge--active" *ngIf="isConfigured">Configurée</span>
          </div>
          <p class="enq-admin-panel__hint">Une seule enquête est enregistrée pour toute l'application.</p>

          <form class="enq-admin-form" (ngSubmit)="saveEnquete()">
            <label for="enq-titre">Titre de l'enquête *</label>
            <input
              id="enq-titre"
              name="titre"
              class="enq-input"
              type="text"
              [(ngModel)]="draft.titre"
              placeholder="Enquête de satisfaction"
              [disabled]="isSaving"
            />
            <div *ngIf="errors.titre" class="enq-field-error">{{ errors.titre }}</div>

            <label for="enq-description">Description *</label>
            <textarea
              id="enq-description"
              name="description"
              class="enq-textarea"
              rows="4"
              [(ngModel)]="draft.description"
              placeholder="Merci de répondre à cette enquête de satisfaction."
              [disabled]="isSaving"
            ></textarea>
            <div *ngIf="errors.description" class="enq-field-error">{{ errors.description }}</div>

            <label for="enq-url">URL externe du formulaire *</label>
            <input
              id="enq-url"
              name="urlFormulaire"
              class="enq-input"
              type="url"
              [(ngModel)]="draft.urlFormulaire"
              placeholder="https://forms.gle/..."
              [disabled]="isSaving"
            />
            <div *ngIf="errors.urlFormulaire" class="enq-field-error">{{ errors.urlFormulaire }}</div>
            <p class="enq-field-hint">Doit commencer par http:// ou https://</p>

            <div class="enq-admin-actions">
              <button type="submit" class="enq-btn enq-btn--primary" [disabled]="isSaving">
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button type="button" class="enq-btn enq-btn--secondary" (click)="resetDraft()" [disabled]="isSaving">
                Réinitialiser
              </button>
              <a
                *ngIf="isConfigured && enquete?.urlFormulaire"
                class="enq-link"
                [href]="enquete!.urlFormulaire!"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prévisualiser le formulaire
              </a>
            </div>
          </form>

          <div class="enq-admin-toggle">
            <h3>Activation</h3>
            <p>{{ enquete?.active ? 'Enquête active — visible selon les règles de période.' : 'Enquête inactive — masquée pour tous les utilisateurs.' }}</p>
            <div *ngIf="toggleError" class="enq-field-error">{{ toggleError }}</div>
            <button
              type="button"
              class="enq-btn"
              [class.enq-btn--danger]="enquete?.active"
              [class.enq-btn--primary]="!enquete?.active"
              (click)="toggleEnquete()"
              [disabled]="isToggling || isSaving"
            >
              {{ toggleLabel }}
            </button>
            <p class="enq-field-hint" *ngIf="enquete?.dateModification">
              Dernière modification : {{ formatDate(enquete!.dateModification!) }}
            </p>
          </div>
        </article>

        <section class="enq-admin-preview">
          <h2 class="enq-admin-preview__title">Aperçu utilisateur</h2>
          <p class="enq-admin-preview__subtitle">
            Représentation identique à celle affichée aux stagiaires, encadrants et entreprises.
          </p>
          <app-satisfaction-survey-state-view
            *ngIf="previewModel"
            [viewModel]="previewModel"
          />
          <div class="enq-empty" *ngIf="!previewModel">
            <p>Chargement de l'aperçu...</p>
          </div>
        </section>
      </div>
    </app-satisfaction-survey-page-shell>
  `,
  styleUrls: ['../../components/satisfaction-survey/satisfaction-survey.shared.css'],
  styles: [`
    .enq-alert--success {
      background: rgba(22, 163, 74, 0.08);
      border: 1px solid rgba(22, 163, 74, 0.2);
      color: #15803d;
      margin-bottom: 18px;
    }

    .enq-admin-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 22px;
      align-items: start;
    }

    @media (max-width: 920px) {
      .enq-admin-grid { grid-template-columns: 1fr; }
    }

    .enq-admin-panel {
      padding: 24px;
      border-radius: 22px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.07);
    }

    .enq-admin-panel__header {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .enq-admin-panel__header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
    }

    .enq-admin-panel__hint {
      margin: 0 0 18px;
      font-size: 0.88rem;
      color: #64748b;
    }

    .enq-admin-form {
      display: grid;
      gap: 10px;
    }

    .enq-admin-form label {
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
    }

    .enq-input,
    .enq-textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      font: inherit;
    }

    .enq-field-error {
      color: #9f1239;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .enq-field-hint {
      margin: 0;
      font-size: 0.82rem;
      color: #64748b;
    }

    .enq-admin-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 8px;
    }

    .enq-link {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1d4ed8;
    }

    .enq-admin-toggle {
      margin-top: 22px;
      padding-top: 20px;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      display: grid;
      gap: 10px;
    }

    .enq-admin-toggle h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #0f172a;
    }

    .enq-admin-toggle p {
      margin: 0;
      font-size: 0.9rem;
      color: #475569;
    }

    .enq-btn--danger {
      background: #dc2626;
      color: #fff;
    }

    .enq-admin-preview__title {
      margin: 0 0 6px;
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
    }

    .enq-admin-preview__subtitle {
      margin: 0 0 14px;
      font-size: 0.88rem;
      color: #64748b;
    }
  `]
})
export class EnqueteAdminPageComponent implements OnInit {

  readonly adminSubtitle =
    "Configurez l'enquête générale. L'aperçu reflète le design vu par tous les utilisateurs de la plateforme.";

  enquete: EnqueteSatisfaction | null = null;
  previewModel: SatisfactionSurveyViewModel | null = null;

  draft: { titre: string; description: string; urlFormulaire: string } = {
    titre: '',
    description: '',
    urlFormulaire: ''
  };

  errors: { titre?: string; description?: string; urlFormulaire?: string } = {};
  toggleError = '';

  isLoading = false;
  isSaving = false;
  isToggling = false;

  successMessage = '';
  errorMessage = '';

  constructor(private enqueteService: EnqueteService) {}

  ngOnInit(): void {
    this.loadEnquete();
  }

  get isConfigured(): boolean {
    return !!(
      this.trim(this.enquete?.titre)
      && this.trim(this.enquete?.description)
      && this.trim(this.enquete?.urlFormulaire)
    );
  }

  get toggleLabel(): string {
    if (this.isToggling) {
      return 'Mise à jour...';
    }
    return this.enquete?.active ? "Désactiver l'enquête" : "Activer l'enquête";
  }

  loadEnquete(): void {
    this.isLoading = true;
    this.clearMessages();

    this.enqueteService.getEnquete().subscribe({
      next: (data) => {
        this.enquete = data;
        this.resetDraft();
        this.refreshPreview();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, 'Enquête introuvable ou service indisponible.');
        this.isLoading = false;
      }
    });
  }

  saveEnquete(): void {
    this.clearMessages();
    this.errors = {};

    const titre = this.trim(this.draft.titre);
    const description = this.trim(this.draft.description);
    const url = this.validateUrl(this.draft.urlFormulaire);

    if (!titre) {
      this.errors.titre = 'Le titre est obligatoire.';
    }
    if (!description) {
      this.errors.description = 'La description est obligatoire.';
    }
    if (url === null) {
      this.errors.urlFormulaire = "L'URL du formulaire est obligatoire.";
    } else if (url === false) {
      this.errors.urlFormulaire = "L'URL doit commencer par http:// ou https://.";
    }

    if (Object.keys(this.errors).length > 0) {
      return;
    }

    this.isSaving = true;
    this.enqueteService.updateEnquete({
      titre: titre!,
      description: description!,
      urlFormulaire: url as string
    }).subscribe({
      next: (data) => {
        this.enquete = data;
        this.resetDraft();
        this.refreshPreview();
        this.successMessage = "L'enquête a été enregistrée avec succès.";
        this.isSaving = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, "Erreur technique lors de l'enregistrement.");
        this.isSaving = false;
      }
    });
  }

  toggleEnquete(): void {
    this.toggleError = '';
    this.clearMessages();
    this.isToggling = true;

    this.enqueteService.toggleEnquete().subscribe({
      next: (data) => {
        this.enquete = data;
        this.refreshPreview();
        this.successMessage = data.active
          ? "L'enquête est maintenant active."
          : "L'enquête a été désactivée.";
        this.isToggling = false;
      },
      error: (err) => {
        this.toggleError = this.describeError(err, "Impossible de modifier le statut de l'enquête.");
        this.isToggling = false;
      }
    });
  }

  resetDraft(): void {
    this.errors = {};
    this.draft = {
      titre: this.enquete?.titre ?? '',
      description: this.enquete?.description ?? '',
      urlFormulaire: this.enquete?.urlFormulaire ?? ''
    };
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return value;
    }
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private refreshPreview(): void {
    this.previewModel = resolveSatisfactionSurveyAdminPreview(this.enquete);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private trim(v?: string | null): string | null {
    const t = (v ?? '').trim();
    return t || null;
  }

  private validateUrl(v: string): string | null | false {
    const t = v.trim();
    if (!t) {
      return null;
    }
    try {
      const p = new URL(t);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') {
        return false;
      }
      return t;
    } catch {
      return false;
    }
  }

  private describeError(err: unknown, fallback: string): string {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (status === 403) {
      return 'Accès refusé à cette fonctionnalité.';
    }
    if (status === 404) {
      return 'Enquête introuvable.';
    }
    const message = (err as { error?: { message?: string } })?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }
}
