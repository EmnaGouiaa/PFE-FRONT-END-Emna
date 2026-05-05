import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyMeeting } from '../../services/faculty/faculty.models';

@Component({
  selector: 'app-faculty-meetings-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Réunions</h1>
          <p>Consultation des réunions planifiées et des réunions finales.</p>
          <div class="hero-badges">
            <span class="hero-badge">Lecture seule pour ce rôle</span>
          </div>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadMeetings()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="warningMessage" class="support-banner warning-banner">{{ warningMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Réunions hebdomadaires</div>
          <span class="stat-value">{{ weeklyMeetings.length }}</span>
          <div class="stat-subtitle">Source : /api/reunions</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Réunions finales</div>
          <span class="stat-value">{{ finalMeetings.length }}</span>
          <div class="stat-subtitle">Source : /api/reunions-finales</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des réunions...</div>

      <section class="stack" *ngIf="!isLoading">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Réunions hebdomadaires</h2>
              <div class="panel-subtitle">Les réunions finales sont exclues de cette liste.</div>
            </div>
          </div>

          <div *ngIf="weeklyMeetings.length === 0" class="empty-card">Aucune réunion hebdomadaire disponible.</div>

          <div class="table-wrap" *ngIf="weeklyMeetings.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Stage</th>
                  <th>Observation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let meeting of weeklyMeetings">
                  <td>{{ meeting.numReunion || '-' }}</td>
                  <td>{{ meeting.date || '-' }}</td>
                  <td>{{ meeting.heure || '-' }}</td>
                  <td>{{ meeting.stageTitre || ('Stage #' + meeting.stageId) }}</td>
                  <td>{{ meeting.observation || '-' }}</td>
                  <td>
                    <button type="button" class="btn btn-secondary" (click)="openMeetingDetails(meeting)">Détails</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Réunions finales</h2>
              <div class="panel-subtitle">Les réunions finales existantes apparaissent ici avec leur type réel.</div>
            </div>
          </div>

          <div *ngIf="finalMeetings.length === 0" class="empty-card">
            Aucune réunion finale visible pour ce rôle ou accès backend non autorisé.
          </div>

          <div class="table-wrap" *ngIf="finalMeetings.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Stage</th>
                  <th>Stagiaire</th>
                  <th>Entreprise</th>
                  <th>Note</th>
                  <th>Enquête</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let meeting of finalMeetings">
                  <td>{{ meeting.id }}</td>
                  <td>{{ meeting.numReunion || '-' }}</td>
                  <td>{{ meeting.date || '-' }}</td>
                  <td>{{ meeting.heure || '-' }}</td>
                  <td>{{ meeting.stageTitre || ('Stage #' + meeting.stageId) }}</td>
                  <td>{{ meeting.studentName || 'Non renseigné' }}</td>
                  <td>{{ meeting.companyName || 'Non renseignée' }}</td>
                  <td>{{ meeting.note ?? 'N/D' }}</td>
                  <td>
                    <span class="status-pill" [class.status-positive]="hasSatisfactionSurvey(meeting)" [class.status-neutral]="!hasSatisfactionSurvey(meeting)">
                      {{ hasSatisfactionSurvey(meeting) ? 'Préparée' : 'Non préparée' }}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-secondary" (click)="openMeetingDetails(meeting)">Détails</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <div class="modal-overlay" *ngIf="selectedMeeting" (click)="closeMeetingDetails()">
        <article class="modal" role="dialog" aria-modal="true" aria-labelledby="meeting-details-title" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <h2 id="meeting-details-title">Détails de la réunion</h2>
              <div class="panel-subtitle">{{ getMeetingTypeLabel(selectedMeeting) }}</div>
            </div>
            <button type="button" class="btn-close" aria-label="Fermer" (click)="closeMeetingDetails()">×</button>
          </header>

          <div class="form stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Type</span>
                <span class="value">{{ getMeetingTypeLabel(selectedMeeting) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">ID</span>
                <span class="value">{{ selectedMeeting.id }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Numéro</span>
                <span class="value">{{ selectedMeeting.numReunion || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stage</span>
                <span class="value">{{ selectedMeeting.stageTitre || ('Stage #' + selectedMeeting.stageId) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stagiaire</span>
                <span class="value">{{ selectedMeeting.studentName || 'Non renseigné' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedMeeting.companyName || 'Non renseignée' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Date</span>
                <span class="value">{{ selectedMeeting.date || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Heure</span>
                <span class="value">{{ selectedMeeting.heure || '-' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">Observation</span>
                <span class="value">{{ selectedMeeting.observation || 'Aucune observation.' }}</span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Compte rendu</div>
              <div class="info-meta">{{ selectedMeeting.compteRendu || 'Aucun compte rendu saisi.' }}</div>
            </div>

            <div class="detail-card" *ngIf="selectedMeeting.source === 'FINALE'">
              <div class="info-title">Informations de la réunion finale</div>
              <div class="info-meta">Note : {{ selectedMeeting.note ?? 'N/D' }}</div>
              <div class="info-meta">Formulaire d’évaluation : {{ selectedMeeting.urlFormEvaluation || 'Aucun lien défini' }}</div>
              <div class="info-meta">Enquête de satisfaction : {{ selectedMeeting.urlFormSatisfaction || 'Aucun lien défini' }}</div>
              <div class="info-meta">Titre de l’enquête : {{ selectedMeeting.titreEnqueteSatisfaction || 'Enquête de satisfaction' }}</div>
              <div class="info-meta">Description : {{ selectedMeeting.descriptionEnqueteSatisfaction || 'Aucune description définie' }}</div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeMeetingDetails()">Fermer</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyMeetingsPageComponent implements OnInit {
  weeklyMeetings: FacultyMeeting[] = [];
  finalMeetings: FacultyMeeting[] = [];
  selectedMeeting: FacultyMeeting | null = null;
  isLoading = false;
  errorMessage = '';
  warningMessage = '';

  constructor(private facultyPortalService: FacultyPortalService) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.warningMessage = '';
    this.selectedMeeting = null;

    forkJoin({
      weekly: this.facultyPortalService.listMeetings().pipe(catchError((error) => {
        console.error('[FacultyMeetingsPageComponent] failed to load weekly meetings', error);
        return of([] as FacultyMeeting[]);
      })),
      final: this.facultyPortalService.listFinalMeetings().pipe(catchError((error) => {
        console.error('[FacultyMeetingsPageComponent] failed to load final meetings', error);
        if (error?.status === 403) {
          this.warningMessage = 'Accès non autorisé aux réunions finales pour ce rôle. Veuillez vérifier les autorisations côté backend.';
        }
        return of([] as FacultyMeeting[]);
      }))
    }).subscribe({
      next: ({ weekly, final }) => {
        this.weeklyMeetings = weekly;
        this.finalMeetings = final;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les réunions.');
        this.isLoading = false;
      }
    });
  }

  openMeetingDetails(meeting: FacultyMeeting): void {
    this.selectedMeeting = meeting;
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
  }

  hasSatisfactionSurvey(meeting: FacultyMeeting): boolean {
    return Boolean(meeting.urlFormSatisfaction);
  }

  getMeetingTypeLabel(meeting: FacultyMeeting): string {
    return meeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion hebdomadaire';
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
