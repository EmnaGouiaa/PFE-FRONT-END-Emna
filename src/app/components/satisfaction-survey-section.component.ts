import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';
import {
  FillSatisfactionSurveyPayload,
  SatisfactionSurvey,
  SatisfactionSurveyReportMetadata,
  SatisfactionSurveyService,
  StageSurveySectionStatus,
} from '../services/satisfaction-survey.service';

@Component({
  selector: 'app-satisfaction-survey-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="satisfaction-survey" *ngIf="visibleSurveys.length > 0">
      <div class="satisfaction-header">
        <div>
          <h3>Enquetes de satisfaction</h3>
          <div class="satisfaction-reminder">
            Chaque role concerne remplit sa propre enquete pour le stage associe.
          </div>
        </div>
        <span class="status-pill status-neutral">{{ visibleSurveys.length }} enquete(s)</span>
      </div>

      <article class="survey-card" *ngFor="let survey of visibleSurveys">
        <div class="survey-card__head">
          <div>
            <div class="survey-card__title">{{ survey.stageTitre || ('Stage #' + survey.stageId) }}</div>
            <div class="survey-card__meta">
              Repondant : {{ formatRole(survey.roleRepondant) }}<span *ngIf="survey.utilisateurNomComplet"> - {{ survey.utilisateurNomComplet }}</span>
            </div>
          </div>
          <span class="status-pill" [ngClass]="survey.statutEnquete === 'REMPLIE' ? 'status-positive' : 'status-warning'">
            {{ survey.statutEnquete === 'REMPLIE' ? 'Enquete remplie' : 'En attente' }}
          </span>
        </div>

        <div class="survey-card__body">
          <div *ngIf="!getSectionStatus(survey)?.sectionEnqueteOuverte" class="satisfaction-message">
            La section enquête de satisfaction sera accessible le jour de la réunion finale ou à la date de fin du stage.
          </div>

          <p *ngIf="survey.dateSoumission" class="survey-card__hint">
            Soumise le {{ formatDateTime(survey.dateSoumission) }}
          </p>
          <p *ngIf="survey.statutEnquete === 'EN_ATTENTE' && getSectionStatus(survey)?.sectionEnqueteOuverte" class="survey-card__hint">
            Cette enquete est en attente de votre reponse dans l'application.
          </p>

          <button
            *ngIf="survey.statutEnquete === 'EN_ATTENTE' && getSectionStatus(survey)?.sectionEnqueteOuverte"
            type="button"
            class="btn btn-primary satisfaction-action"
            (click)="toggleSurveyForm(survey)"
          >
            {{ activeSurveyId === survey.id ? 'Fermer le formulaire' : 'Remplir enquête de satisfaction' }}
          </button>

          <button
            *ngIf="survey.statutEnquete === 'REMPLIE'"
            type="button"
            class="btn btn-secondary satisfaction-action"
            disabled
          >
            Enquête remplie
          </button>

          <div class="report-block">
            <div class="survey-card__meta" *ngIf="getSectionStatus(survey)?.dateReunionFinale || getSectionStatus(survey)?.dateFinStage">
              Ouverture : réunion finale {{ getSectionStatus(survey)?.dateReunionFinale || 'non planifiée' }} / fin de stage {{ getSectionStatus(survey)?.dateFinStage || 'non renseignée' }}
            </div>

            <div class="survey-card__meta" *ngIf="getReportMetadata(survey)">
              Rapport disponible : {{ getReportMetadata(survey)?.nomFichier }}<span *ngIf="getReportMetadata(survey)?.dateUpload"> - uploadé le {{ formatDateTime(getReportMetadata(survey)?.dateUpload || null) }}</span>
            </div>

            <div class="survey-form__actions report-actions">
              <label
                *ngIf="canUploadReport(survey)"
                class="btn btn-secondary upload-button"
                [class.disabled]="isUploadingReport"
              >
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" (change)="onReportSelected(survey, $event)" [disabled]="isUploadingReport" hidden />
                {{ isUploadingReport ? 'Upload...' : 'Uploader le rapport d’enquête' }}
              </label>

              <button
                *ngIf="getSectionStatus(survey)?.rapportDisponible"
                type="button"
                class="btn btn-secondary"
                (click)="downloadReport(survey)"
              >
                Consulter le rapport
              </button>
            </div>
          </div>
        </div>

        <form
          class="survey-form"
          *ngIf="survey.statutEnquete === 'EN_ATTENTE' && activeSurveyId === survey.id && getSectionStatus(survey)?.sectionEnqueteOuverte"
          (ngSubmit)="submitSurvey(survey)"
        >
          <label class="field">
            <span>Réponses</span>
            <textarea
              class="textarea"
              [(ngModel)]="draft.reponses"
              name="reponses"
              rows="6"
              placeholder="Saisissez ici vos réponses, en texte libre ou au format JSON si nécessaire."
              required
            ></textarea>
          </label>

          <label class="field">
            <span>Commentaire global</span>
            <textarea
              class="textarea"
              [(ngModel)]="draft.commentaireGlobal"
              name="commentaireGlobal"
              rows="4"
              placeholder="Ajoutez un commentaire global si besoin."
            ></textarea>
          </label>

          <div class="satisfaction-error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="satisfaction-success" *ngIf="successMessage">{{ successMessage }}</div>

          <div class="survey-form__actions">
            <button type="button" class="btn btn-secondary" (click)="resetForm()">Annuler</button>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving">
              {{ isSaving ? 'Envoi...' : 'Soumettre l’enquête' }}
            </button>
          </div>
        </form>
      </article>
    </section>

    <div *ngIf="!isLoading && visibleSurveys.length === 0 && emptyMessage" class="satisfaction-message">
      {{ emptyMessage }}
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .satisfaction-survey {
      display: grid;
      gap: 14px;
      width: 100%;
      margin-top: 14px;
      padding: 16px 18px;
      border: 1px solid rgba(16, 71, 120, 0.1);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.9);
    }

    .satisfaction-header,
    .survey-card__head,
    .survey-form__actions {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .satisfaction-header h3,
    .survey-card__title {
      margin: 0;
      color: var(--text-main, #104778);
      font-weight: 900;
    }

    .satisfaction-reminder,
    .survey-card__meta,
    .survey-card__hint {
      margin-top: 4px;
      color: var(--text-muted, #617086);
      line-height: 1.5;
    }

    .survey-card {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 1px solid rgba(16, 71, 120, 0.08);
      border-radius: 12px;
      background: rgba(16, 71, 120, 0.03);
    }

    .survey-card__body {
      display: grid;
      gap: 10px;
    }

    .survey-form {
      display: grid;
      gap: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(16, 71, 120, 0.1);
    }

    .field {
      display: grid;
      gap: 6px;
      color: var(--text-main, #104778);
      font-weight: 700;
    }

    .textarea {
      width: 100%;
      min-height: 110px;
      padding: 12px;
      border: 1px solid rgba(16, 71, 120, 0.18);
      border-radius: 10px;
      resize: vertical;
      font: inherit;
      color: var(--text-main, #104778);
      background: #fff;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .status-positive {
      color: var(--secondary-color, #2596be);
      background: rgba(37, 150, 190, 0.1);
      border-color: rgba(37, 150, 190, 0.18);
    }

    .status-warning {
      color: var(--primary-color, #104778);
      background: rgba(203, 216, 18, 0.18);
      border-color: rgba(203, 216, 18, 0.26);
    }

    .status-neutral {
      color: var(--primary-color, #104778);
      background: rgba(16, 71, 120, 0.08);
      border-color: rgba(16, 71, 120, 0.16);
    }

    .satisfaction-message,
    .satisfaction-error,
    .satisfaction-success {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      font-weight: 700;
    }

    .satisfaction-message {
      color: var(--text-muted, #617086);
      background: rgba(16, 71, 120, 0.06);
      border: 1px solid rgba(16, 71, 120, 0.1);
    }

    .satisfaction-error {
      color: #8a1f1f;
      background: rgba(190, 37, 37, 0.08);
      border: 1px solid rgba(190, 37, 37, 0.18);
    }

    .satisfaction-success {
      color: #145a32;
      background: rgba(20, 90, 50, 0.08);
      border: 1px solid rgba(20, 90, 50, 0.18);
    }

    .survey-form__actions {
      justify-content: flex-end;
    }

    @media (max-width: 640px) {
      .satisfaction-header,
      .survey-card__head,
      .survey-form__actions {
        flex-direction: column;
        align-items: stretch;
      }

      .satisfaction-action,
      .survey-form__actions .btn {
        width: 100%;
      }
    }
  `]
})
export class SatisfactionSurveySectionComponent implements OnChanges, OnInit {
  @Input() stageId: number | null = null;

  surveys: SatisfactionSurvey[] = [];
  visibleSurveys: SatisfactionSurvey[] = [];
  sectionStatuses = new Map<number, StageSurveySectionStatus>();
  reportMetadataByStage = new Map<number, SatisfactionSurveyReportMetadata>();
  isLoading = false;
  isSaving = false;
  isUploadingReport = false;
  activeSurveyId: number | null = null;
  errorMessage = '';
  successMessage = '';
  emptyMessage = 'Aucune enquête de satisfaction disponible pour le moment.';
  currentUserRole: RoleUtilisateur | null = null;
  draft: FillSatisfactionSurveyPayload = {
    reponses: '',
    commentaireGlobal: '',
  };

  constructor(
    private satisfactionSurveyService: SatisfactionSurveyService,
    private authService: AuthentificationService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRoleUtilisateur();
    this.loadSurveys();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stageId'] && !changes['stageId'].firstChange) {
      this.applyStageFilter();
    }
  }

  toggleSurveyForm(survey: SatisfactionSurvey): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.activeSurveyId === survey.id) {
      this.resetForm();
      return;
    }

    this.activeSurveyId = survey.id;
    this.draft = {
      reponses: survey.reponses || '',
      commentaireGlobal: survey.commentaireGlobal || '',
    };
  }

  submitSurvey(survey: SatisfactionSurvey): void {
    if (!this.draft.reponses.trim()) {
      this.errorMessage = 'Les réponses sont obligatoires.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.satisfactionSurveyService.fillSurvey(survey.id, this.draft).subscribe({
      next: (updatedSurvey) => {
        this.surveys = this.surveys.map((item) => item.id === updatedSurvey.id ? updatedSurvey : item);
        this.applyStageFilter();
        this.successMessage = 'L’enquête a été enregistrée avec succès.';
        this.activeSurveyId = null;
        this.isSaving = false;
        this.draft = { reponses: '', commentaireGlobal: '' };
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? error?.message ?? 'Impossible d’enregistrer l’enquête.';
        this.isSaving = false;
      }
    });
  }

  formatRole(role: string): string {
    return String(role || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('fr-FR');
  }

  resetForm(): void {
    this.activeSurveyId = null;
    this.draft = { reponses: '', commentaireGlobal: '' };
    this.errorMessage = '';
    this.successMessage = '';
  }

  getSectionStatus(survey: SatisfactionSurvey): StageSurveySectionStatus | null {
    return survey.stageId ? this.sectionStatuses.get(survey.stageId) ?? null : null;
  }

  getReportMetadata(survey: SatisfactionSurvey): SatisfactionSurveyReportMetadata | null {
    return survey.stageId ? this.reportMetadataByStage.get(survey.stageId) ?? null : null;
  }

  canUploadReport(survey: SatisfactionSurvey): boolean {
    return this.currentUserRole === RoleUtilisateur.RESPONSABLE_ENTREPRISE
      && Boolean(this.getSectionStatus(survey)?.sectionEnqueteOuverte)
      && Boolean(survey.stageId);
  }

  onReportSelected(survey: SatisfactionSurvey, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file || !survey.stageId) {
      return;
    }

    this.isUploadingReport = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.satisfactionSurveyService.uploadReport(survey.stageId, file).subscribe({
      next: (metadata) => {
        this.reportMetadataByStage.set(survey.stageId!, metadata);
        const status = this.sectionStatuses.get(survey.stageId!);
        if (status) {
          this.sectionStatuses.set(survey.stageId!, {
            ...status,
            rapportDisponible: true,
            rapportNomFichier: metadata.nomFichier,
          });
        }
        this.successMessage = 'Le rapport d’enquête a été uploadé avec succès.';
        this.isUploadingReport = false;
        if (input) {
          input.value = '';
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? error?.message ?? 'Impossible d’uploader le rapport.';
        this.isUploadingReport = false;
      }
    });
  }

  downloadReport(survey: SatisfactionSurvey): void {
    if (!survey.stageId) {
      return;
    }

    this.satisfactionSurveyService.downloadReport(survey.stageId).subscribe({
      next: (blob) => {
        const metadata = this.reportMetadataByStage.get(survey.stageId!);
        const filename = metadata?.nomFichier || `rapport-enquete-stage-${survey.stageId}.bin`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? error?.message ?? 'Impossible de télécharger le rapport.';
      }
    });
  }

  private loadSurveys(): void {
    this.isLoading = true;
    this.satisfactionSurveyService.getForCurrentUser().subscribe({
      next: (surveys) => {
        this.surveys = surveys;
        this.applyStageFilter();
        this.loadStageStatuses();
        this.isLoading = false;
      },
      error: () => {
        this.surveys = [];
        this.visibleSurveys = [];
        this.isLoading = false;
      }
    });
  }

  private applyStageFilter(): void {
    const filtered = this.stageId
      ? this.surveys.filter((survey) => survey.stageId === this.stageId)
      : this.surveys;

    this.visibleSurveys = [...filtered].sort((left, right) => {
      if (left.statutEnquete !== right.statutEnquete) {
        return left.statutEnquete === 'EN_ATTENTE' ? -1 : 1;
      }
      return (left.stageTitre || '').localeCompare(right.stageTitre || '');
    });

    if (this.visibleSurveys.length === 0 && this.stageId) {
      this.emptyMessage = 'Aucune enquête de satisfaction n’est liée à ce stage pour votre compte.';
    } else {
      this.emptyMessage = 'Aucune enquête de satisfaction disponible pour le moment.';
    }
  }

  private loadStageStatuses(): void {
    this.sectionStatuses.clear();
    this.reportMetadataByStage.clear();

    const stageIds = [...new Set(this.surveys.map((survey) => survey.stageId).filter((stageId): stageId is number => !!stageId))];
    for (const currentStageId of stageIds) {
      this.satisfactionSurveyService.getSectionStatus(currentStageId).subscribe({
        next: (status) => {
          this.sectionStatuses.set(currentStageId, status);
          if (status.rapportDisponible) {
            this.satisfactionSurveyService.getReportMetadata(currentStageId).subscribe({
              next: (metadata) => {
                this.reportMetadataByStage.set(currentStageId, metadata);
              },
              error: () => {
                // Ignore metadata errors to keep section usable.
              }
            });
          }
        },
        error: () => {
          // Ignore status errors per stage to avoid blocking the whole section.
        }
      });
    }
  }
}
