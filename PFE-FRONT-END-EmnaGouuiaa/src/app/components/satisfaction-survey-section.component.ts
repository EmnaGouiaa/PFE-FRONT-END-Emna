import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { SatisfactionSurvey, SatisfactionSurveyService } from '../services/satisfaction-survey.service';

@Component({
  selector: 'app-satisfaction-survey-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section *ngIf="showSurveySection" class="satisfaction-survey">
      <div class="satisfaction-header">
        <div>
          <h3>Enquete de satisfaction</h3>
          <div class="satisfaction-reminder">Une enquete de satisfaction est disponible pendant une periode limitee apres votre reunion finale.</div>
          <p>{{ survey?.titre }}</p>
        </div>
        <span class="status-pill" [ngClass]="statusClass">{{ survey?.statut }}</span>
      </div>

      <p class="satisfaction-description">
        {{ survey?.description || 'Veuillez saisir votre reponse dans le formulaire externe prepare par le responsable.' }}
      </p>

      <div *ngIf="linkErrorMessage" class="satisfaction-error">{{ linkErrorMessage }}</div>

      <button type="button" class="btn btn-primary satisfaction-action" (click)="openSurvey()">
        Repondre a l'enquete
      </button>
    </section>

    <div *ngIf="showUnavailableMessage" class="satisfaction-message">
      {{ survey?.message }}
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .satisfaction-survey {
      display: grid;
      gap: 12px;
      width: 100%;
      margin-top: 14px;
      padding: 16px 18px;
      border: 1px solid rgba(16, 71, 120, 0.1);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.9);
    }

    .satisfaction-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .satisfaction-header h3 {
      margin: 0;
      color: var(--text-main, #104778);
      font-size: 1rem;
      font-weight: 900;
    }

    .satisfaction-header p,
    .satisfaction-reminder,
    .satisfaction-description {
      margin: 4px 0 0;
      color: var(--text-muted, #617086);
      line-height: 1.5;
    }

    .satisfaction-reminder {
      color: var(--text-main, #104778);
      font-weight: 800;
    }

    .satisfaction-description {
      margin-top: 0;
    }

    .satisfaction-action {
      justify-self: start;
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
    .satisfaction-error {
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

    @media (max-width: 640px) {
      .satisfaction-header {
        align-items: stretch;
        flex-direction: column;
      }

      .satisfaction-action {
        width: 100%;
      }
    }
  `]
})
export class SatisfactionSurveySectionComponent implements OnChanges, OnInit {
  @Input() reunionFinaleId: number | null = null;

  survey: SatisfactionSurvey | null = null;
  isLoading = false;
  linkErrorMessage = '';

  constructor(private satisfactionSurveyService: SatisfactionSurveyService) {}

  ngOnInit(): void {
    if (!this.reunionFinaleId) {
      this.loadSurvey();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reunionFinaleId']) {
      this.loadSurvey();
    }
  }

  get showSurveySection(): boolean {
    return Boolean(this.survey?.disponible);
  }

  get showUnavailableMessage(): boolean {
    return Boolean(
      !this.isLoading
      && this.survey
      && !this.showSurveySection
      && this.survey.dateAtteinte
      && this.survey.message
    );
  }

  get statusClass(): string {
    return this.survey?.disponible ? 'status-warning' : 'status-neutral';
  }

  openSurvey(): void {
    this.linkErrorMessage = '';

    if (!this.survey?.urlFormulaire || !this.isValidExternalUrl(this.survey.urlFormulaire)) {
      this.linkErrorMessage = 'Le lien de l\'enquete est indisponible.';
      return;
    }

    window.open(this.survey.urlFormulaire, '_blank', 'noopener,noreferrer');
  }

  private loadSurvey(): void {
    this.survey = null;
    this.linkErrorMessage = '';
    this.isLoading = true;

    const request = this.reunionFinaleId
      ? this.satisfactionSurveyService.getForFinalMeeting(this.reunionFinaleId)
      : this.satisfactionSurveyService.getAvailableForCurrentUser();

    request.subscribe({
      next: (survey) => {
        this.survey = survey;
        this.isLoading = false;
      },
      error: () => {
        this.survey = null;
        this.isLoading = false;
      }
    });
  }

  private isValidExternalUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
