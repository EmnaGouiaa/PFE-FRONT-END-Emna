import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SatisfactionSurvey, SatisfactionSurveyService } from '../../services/satisfaction-survey.service';

@Component({
  selector: 'app-faculty-final-meeting-forms-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Enquête de satisfaction</h1>
          <p>Préparez l'enquête générale qui sera proposée aux acteurs concernés le jour de leur réunion finale.</p>
          <div class="hero-badges">
            <span class="hero-badge">Enquête générale</span>
            <span class="hero-badge">Formulaire externe</span>
          </div>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadSurvey()" [disabled]="isLoading || isSaving">
            Actualiser
          </button>
        </div>
      </header>

      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="isLoading" class="loading">Chargement de l'enquête de satisfaction...</div>

      <section class="content-grid single-form-grid" *ngIf="!isLoading">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Configuration de l'enquête</h2>
              <div class="panel-subtitle">Une seule enquête est enregistrée pour toute l'application.</div>
            </div>
            <span class="status-pill" [class.status-positive]="isConfigured" [class.status-neutral]="!isConfigured">
              {{ isConfigured ? 'Configurée' : 'Non configurée' }}
            </span>
          </div>

          <form class="stack" (ngSubmit)="saveSurvey()">
            <div class="form-grid">
              <div class="full-width">
                <label for="titre-satisfaction">Titre de l'enquête</label>
                <input
                  id="titre-satisfaction"
                  name="titre"
                  class="input"
                  type="text"
                  [(ngModel)]="draft.titre"
                  placeholder="Enquête de satisfaction"
                  [disabled]="isSaving"
                />
                <div *ngIf="validationErrors.titre" class="field-error">{{ validationErrors.titre }}</div>
              </div>

              <div class="full-width">
                <label for="description-satisfaction">Description</label>
                <textarea
                  id="description-satisfaction"
                  name="description"
                  class="textarea"
                  rows="5"
                  [(ngModel)]="draft.description"
                  placeholder="Expliquez brièvement l'objectif de l'enquête."
                  [disabled]="isSaving"
                ></textarea>
                <div *ngIf="validationErrors.description" class="field-error">{{ validationErrors.description }}</div>
              </div>

              <div class="full-width">
                <label for="url-satisfaction">URL externe du formulaire</label>
                <input
                  id="url-satisfaction"
                  name="urlFormulaire"
                  class="input"
                  type="url"
                  [(ngModel)]="draft.urlFormulaire"
                  placeholder="https://forms.gle/..."
                  [disabled]="isSaving"
                />
                <div *ngIf="validationErrors.urlFormulaire" class="field-error">{{ validationErrors.urlFormulaire }}</div>
              </div>
            </div>

            <div class="inline-actions">
              <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                {{ isSaving ? 'Enregistrement...' : (isConfigured ? "Modifier l'enquête" : "Enregistrer l'enquête") }}
              </button>
              <button type="button" class="btn btn-secondary" (click)="resetDraft()" [disabled]="isSaving">
                Réinitialiser
              </button>
              <a *ngIf="isConfigured" class="link-button" [href]="configuredSurvey?.urlFormulaire" target="_blank" rel="noopener noreferrer">
                Ouvrir le formulaire
              </a>
            </div>
          </form>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Règle d'affichage</h2>
              <div class="panel-subtitle">Cette enquête n'est pas liée à une réunion finale précise.</div>
            </div>
          </div>

          <div class="detail-card">
            <div class="info-title">Disponibilité automatique</div>
            <div class="info-meta">L'enquête apparaît uniquement dans le dashboard de l'utilisateur concerné le jour de sa réunion finale.</div>
            <div class="info-meta">La comparaison est faite côté backend sur la date système, sans tenir compte de l'heure.</div>
            <div class="info-meta">Aucun formulaire de réponse interne n'est créé dans l'application.</div>
          </div>
        </article>
      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css'],
  styles: [`
    .single-form-grid {
      grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
    }

    .field-error {
      margin-top: 6px;
      color: var(--primary-color);
      font-size: 0.84rem;
      font-weight: 700;
    }

    @media (max-width: 920px) {
      .single-form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FacultyFinalMeetingFormsPageComponent implements OnInit {
  configuredSurvey: SatisfactionSurvey | null = null;
  draft = {
    titre: '',
    description: '',
    urlFormulaire: ''
  };
  validationErrors: {
    titre?: string;
    description?: string;
    urlFormulaire?: string;
  } = {};
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private satisfactionSurveyService: SatisfactionSurveyService) {}

  ngOnInit(): void {
    this.loadSurvey();
  }

  get isConfigured(): boolean {
    return Boolean(
      this.normalizeText(this.configuredSurvey?.titre ?? '')
      && this.normalizeText(this.configuredSurvey?.description ?? '')
      && this.normalizeText(this.configuredSurvey?.urlFormulaire ?? '')
    );
  }

  loadSurvey(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.satisfactionSurveyService.getConfiguration().subscribe({
      next: (survey) => {
        this.configuredSurvey = survey;
        this.resetDraft();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de charger l'enquête de satisfaction.");
        this.isLoading = false;
      }
    });
  }

  resetDraft(): void {
    this.validationErrors = {};
    this.draft = {
      titre: this.configuredSurvey?.titre ?? '',
      description: this.configuredSurvey?.description ?? '',
      urlFormulaire: this.configuredSurvey?.urlFormulaire ?? ''
    };
  }

  saveSurvey(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.validationErrors = {};

    const titre = this.normalizeText(this.draft.titre);
    const description = this.normalizeText(this.draft.description);
    const urlFormulaire = this.normalizeRequiredUrl(this.draft.urlFormulaire);

    if (!titre) {
      this.validationErrors.titre = "Le titre de l'enquête est obligatoire.";
    }

    if (!description) {
      this.validationErrors.description = "La description de l'enquête est obligatoire.";
    }

    if (urlFormulaire === null) {
      this.validationErrors.urlFormulaire = "L'URL externe du formulaire est obligatoire.";
    } else if (urlFormulaire === undefined) {
      this.validationErrors.urlFormulaire = 'Veuillez saisir une URL http(s) valide.';
    }

    if (Object.keys(this.validationErrors).length > 0 || !titre || !description || !urlFormulaire) {
      return;
    }

    this.isSaving = true;
    this.satisfactionSurveyService.saveConfiguration({ titre, description, urlFormulaire }).subscribe({
      next: (survey) => {
        this.configuredSurvey = survey;
        this.resetDraft();
        this.successMessage = "L'enquête de satisfaction a été enregistrée avec succès.";
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible d'enregistrer l'enquête de satisfaction.");
        this.isSaving = false;
      }
    });
  }

  private normalizeRequiredUrl(value: string): string | null | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return undefined;
      }
      return trimmed;
    } catch {
      return undefined;
    }
  }

  private normalizeText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (error?.status === 401) return 'Session expirée ou non authentifiée.';
    if (error?.status === 403) return 'Accès refusé à cette fonctionnalité.';
    if (error?.status === 404) return "API de l'enquête de satisfaction introuvable.";
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}
