import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SatisfactionSurvey, SatisfactionSurveyService } from '../services/satisfaction-survey.service';
import { SatisfactionSurveySectionComponent } from './satisfaction-survey-section.component';

@Component({
  selector: 'app-satisfaction-survey-page',
  standalone: true,
  imports: [CommonModule, SatisfactionSurveySectionComponent],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Enquête de satisfaction</h1>
          <p>Consultez l’enquête de satisfaction disponible le jour de votre réunion finale.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadSurvey()" [disabled]="isLoading">
            Actualiser
          </button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="isLoading" class="loading">Chargement de l’enquête de satisfaction...</div>

      <section class="panel" *ngIf="!isLoading">
        <div class="panel-header">
          <div>
            <h2>Enquête de satisfaction</h2>
            <div class="panel-subtitle">Formulaire externe disponible uniquement aujourd’hui si vous êtes concerné par une réunion finale.</div>
          </div>
          <span class="status-pill" [class.status-warning]="survey?.disponible" [class.status-neutral]="!survey?.disponible">
            {{ survey?.disponible ? 'Disponible' : 'Non disponible' }}
          </span>
        </div>

        <article class="detail-card" *ngIf="survey?.disponible; else unavailableSurvey">
          <div class="info-title">{{ survey?.stageTitre || 'Stage concerné' }}</div>
          <app-satisfaction-survey-section></app-satisfaction-survey-section>
        </article>

        <ng-template #unavailableSurvey>
          <div class="empty-card">{{ unavailableMessage }}</div>
        </ng-template>
      </section>
    </div>
  `,
  styleUrls: ['../company/company-shared.css']
})
export class SatisfactionSurveyPageComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  unavailableMessage = 'Aucune enquête de satisfaction disponible pour le moment.';
  survey: SatisfactionSurvey | null = null;

  constructor(private satisfactionSurveyService: SatisfactionSurveyService) {}

  ngOnInit(): void {
    this.loadSurvey();
  }

  loadSurvey(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.survey = null;
    this.unavailableMessage = 'Aucune enquête de satisfaction disponible pour le moment.';

    this.satisfactionSurveyService.getAvailableForCurrentUser().pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (survey) => {
        this.survey = survey;
        if (survey?.message) {
          this.unavailableMessage = survey.message;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? error?.message ?? 'Impossible de charger l’enquête de satisfaction.';
        this.isLoading = false;
      }
    });
  }
}
