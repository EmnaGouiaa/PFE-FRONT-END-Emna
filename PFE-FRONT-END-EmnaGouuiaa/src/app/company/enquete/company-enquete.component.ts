import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';

import { EnqueteStageDto, EnqueteService } from '../../services/enquete.service';
import { StagePeriodService } from '../../services/stage-period.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { CompanyMeeting } from '../../services/company/company.models';
import { SatisfactionSurveyPageShellComponent } from '../../components/satisfaction-survey/satisfaction-survey-page-shell.component';
import { SatisfactionSurveyStateViewComponent } from '../../components/satisfaction-survey/satisfaction-survey-state-view.component';
import {
  resolveSatisfactionSurveyView,
  SatisfactionSurveyViewModel
} from '../../components/satisfaction-survey/satisfaction-survey-state.model';

interface FinaleMeetingRow {
  id: number;
  numReunion: string;
  date: string;
  stageTitre: string;
  stagiaireNom: string;
  stageId: number;
  note: number | null;
  urlFormSatisfaction: string;
  opened: boolean;
}

interface StageGroup {
  stageId: number;
  stageTitre: string;
  stagiaireNom: string;
  meetings: FinaleMeetingRow[];
}

@Component({
  selector: 'app-company-enquete',
  standalone: true,
  imports: [
    CommonModule,
    SatisfactionSurveyPageShellComponent,
    SatisfactionSurveyStateViewComponent
  ],
  template: `
      <app-satisfaction-survey-page-shell
        [wide]="true"
        [isLoading]="isLoading"
        [errorMessage]="errorMessage"
        [subtitle]="companySubtitle"
        (refresh)="loadAll()"
      >
        <app-satisfaction-survey-state-view
          *ngIf="viewModel"
          [viewModel]="viewModel"
          [formOpened]="globalFormOpened"
          [showInfoBlock]="true"
          (respond)="ouvrirEnqueteGlobale()"
        />

        <div class="enq-empty" *ngIf="!viewModel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" aria-hidden="true">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <path d="M9 5a3 3 0 0 1 6 0"/>
          </svg>
          <p>Aucune enquête générale n'est disponible pour le moment.</p>
        </div>

        <div class="enq-section-divider" *ngIf="stageGroups.length > 0">
          <h2>Enquêtes par réunion finale</h2>
          <p>Formulaires de satisfaction liés aux réunions finales de vos stages.</p>
        </div>

        <div class="doc-internship-group" *ngFor="let group of stageGroups">
          <div class="doc-internship-header">
            <div class="doc-student-avatar">
              {{ (group.stagiaireNom || 'ST').slice(0, 2).toUpperCase() }}
            </div>
            <div>
              <div class="doc-internship-name">{{ group.stagiaireNom || 'Stagiaire' }}</div>
              <div class="doc-internship-sub">{{ group.stageTitre || 'Stage sans titre' }}</div>
            </div>
          </div>

          <div class="doc-cards-row">
            <div class="doc-mini-card" *ngFor="let meeting of group.meetings">
              <div class="doc-card-eyebrow">Réunion finale</div>
              <div class="doc-card-top">
                <div class="doc-card-title">Réunion {{ meeting.numReunion || '#' + meeting.id }}</div>
                <span class="status-pill active">Disponible</span>
              </div>
              <div class="doc-card-short-status">Formulaire de satisfaction disponible</div>
              <div class="doc-card-meta">
                <div class="doc-card-meta-item">
                  <span class="label">Date</span>
                  <strong>{{ formatDate(meeting.date) }}</strong>
                </div>
                <div class="doc-card-meta-item">
                  <span class="label">Note</span>
                  <strong>{{ meeting.note !== null ? meeting.note + '/20' : '—' }}</strong>
                </div>
              </div>
              <div class="doc-card-actions">
                <button type="button" class="btn btn-primary btn-sm" (click)="ouvrirFormulaireMeeting(meeting)">
                  {{ meeting.opened ? 'Remplir à nouveau' : 'Répondre' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </app-satisfaction-survey-page-shell>
  `,
  styleUrls: ['../company-shared.css']
})
export class CompanyEnquetePageComponent implements OnInit {

  readonly companySubtitle =
    "Consultez le statut de l'enquête générale et répondez lorsque la période est ouverte. Les formulaires par réunion finale sont listés ci-dessous.";

  enquete: EnqueteStageDto | null = null;
  viewModel: SatisfactionSurveyViewModel | null = null;
  stageGroups: StageGroup[] = [];

  isLoading = false;
  errorMessage = '';
  globalFormOpened = false;

  constructor(
    private enqueteService: EnqueteService,
    private stagePeriodService: StagePeriodService,
    private companyMeetingsService: CompanyMeetingsService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.globalFormOpened = false;
    this.enquete = null;
    this.viewModel = null;

    this.stagePeriodService.getRelevantStageIdForEnquete().pipe(
      switchMap((stageId) => {
        const enquete$ = stageId
          ? this.enqueteService.getEnqueteParStage(stageId).pipe(
              catchError(() => of(null as EnqueteStageDto | null))
            )
          : of(null as EnqueteStageDto | null);

        return forkJoin({
          enquete: enquete$,
          allMeetings: this.companyMeetingsService.listForCurrentCompany().pipe(
            timeout(15000),
            catchError(() => of([] as CompanyMeeting[]))
          )
        });
      }),
      catchError(() =>
        forkJoin({
          enquete: of(null as EnqueteStageDto | null),
          allMeetings: this.companyMeetingsService.listForCurrentCompany().pipe(
            timeout(15000),
            catchError(() => of([] as CompanyMeeting[]))
          )
        })
      )
    ).subscribe({
      next: ({ enquete, allMeetings }) => {
        this.enquete = enquete;
        this.viewModel = enquete
          ? resolveSatisfactionSurveyView(enquete, { showInfoBlock: true })
          : null;
        this.buildStageGroups(allMeetings);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, 'Impossible de charger les enquêtes.');
        this.isLoading = false;
      }
    });
  }

  ouvrirEnqueteGlobale(): void {
    if (!this.viewModel?.canRespond || !this.enquete?.urlFormulaire) {
      return;
    }
    window.open(this.enquete.urlFormulaire, '_blank', 'noopener,noreferrer');
    this.globalFormOpened = true;
  }

  ouvrirFormulaireMeeting(meeting: FinaleMeetingRow): void {
    if (!meeting.urlFormSatisfaction) {
      return;
    }
    window.open(meeting.urlFormSatisfaction, '_blank', 'noopener,noreferrer');
    meeting.opened = true;
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return value;
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private buildStageGroups(allMeetings: CompanyMeeting[]): void {
    const finaleMeetings = allMeetings.filter(
      (m) => m.source === 'FINALE' && m.urlFormSatisfaction?.trim()
    );

    const map = new Map<number, StageGroup>();
    for (const m of finaleMeetings) {
      if (!map.has(m.stageId)) {
        map.set(m.stageId, {
          stageId: m.stageId,
          stageTitre: m.stageTitre || 'Stage sans titre',
          stagiaireNom: m.stagiaireNom || 'Stagiaire',
          meetings: []
        });
      }
      map.get(m.stageId)!.meetings.push({
        id: m.id,
        numReunion: m.numReunion,
        date: m.date,
        stageTitre: m.stageTitre,
        stagiaireNom: m.stagiaireNom,
        stageId: m.stageId,
        note: m.note,
        urlFormSatisfaction: m.urlFormSatisfaction,
        opened: false
      });
    }

    this.stageGroups = Array.from(map.values()).sort((a, b) =>
      a.stagiaireNom.localeCompare(b.stagiaireNom, 'fr')
    );

    for (const group of this.stageGroups) {
      group.meetings.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  }

  private describeError(err: unknown, fallback: string): string {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return 'Session expirée ou accès non autorisé. Veuillez vous reconnecter.';
    }
    const message = (err as { error?: { message?: string } })?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }
}
