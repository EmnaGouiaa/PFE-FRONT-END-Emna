import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnqueteStageDto, EnqueteService } from '../../services/enquete.service';
import { StagePeriodService } from '../../services/stage-period.service';
import { SatisfactionSurveyPageShellComponent } from '../satisfaction-survey/satisfaction-survey-page-shell.component';
import { SatisfactionSurveyStateViewComponent } from '../satisfaction-survey/satisfaction-survey-state-view.component';
import {
  buildPendingSurveyDto,
  resolveSatisfactionSurveyView,
  SatisfactionSurveyViewModel
} from '../satisfaction-survey/satisfaction-survey-state.model';

/**
 * Page enquête de satisfaction — stagiaire, encadrants, etc.
 * Présentation unifiée via les composants partagés satisfaction-survey.
 */
@Component({
  selector: 'app-enquete-user-page',
  standalone: true,
  imports: [
    CommonModule,
    SatisfactionSurveyPageShellComponent,
    SatisfactionSurveyStateViewComponent
  ],
  template: `
    <app-satisfaction-survey-page-shell
      [isLoading]="isLoading"
      [errorMessage]="errorMessage"
      (refresh)="load()"
    >
      <app-satisfaction-survey-state-view
        *ngIf="viewModel"
        [viewModel]="viewModel"
        [formOpened]="formOpened"
        [showInfoBlock]="true"
        (respond)="ouvrirFormulaire()"
      />

      <div class="enq-empty" *ngIf="!viewModel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" aria-hidden="true">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <path d="M9 5a3 3 0 0 1 6 0"/>
        </svg>
        <p>Aucune enquête de satisfaction n'est disponible pour le moment.</p>
      </div>
    </app-satisfaction-survey-page-shell>
  `,
  styleUrls: ['../satisfaction-survey/satisfaction-survey.shared.css']
})
export class EnqueteUserPageComponent implements OnInit {

  enquete: EnqueteStageDto | null = null;
  viewModel: SatisfactionSurveyViewModel | null = null;
  isLoading = false;
  errorMessage = '';
  formOpened = false;

  constructor(
    private enqueteService: EnqueteService,
    private stagePeriodService: StagePeriodService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.formOpened = false;
    this.enquete = null;
    this.viewModel = null;

    this.stagePeriodService.getRelevantStageIdForEnquete().subscribe({
      next: (stageId) => {
        if (!stageId) {
          this.enquete = buildPendingSurveyDto();
          this.viewModel = resolveSatisfactionSurveyView(this.enquete, { showInfoBlock: false });
          this.isLoading = false;
          return;
        }

        this.enqueteService.getEnqueteParStage(stageId).subscribe({
          next: (data) => {
            this.enquete = data;
            this.viewModel = resolveSatisfactionSurveyView(data, { showInfoBlock: true });
            this.isLoading = false;
          },
          error: (err) => {
            this.errorMessage = this.describeError(err);
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Impossible de déterminer votre stage actuel. Vérifiez votre connexion.';
        this.isLoading = false;
      }
    });
  }

  ouvrirFormulaire(): void {
    if (!this.viewModel?.canRespond || !this.enquete?.urlFormulaire) {
      return;
    }
    window.open(this.enquete.urlFormulaire, '_blank', 'noopener,noreferrer');
    this.formOpened = true;
  }

  private describeError(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    }
    if (status === 403) {
      return "Vous n'êtes pas autorisé à consulter cette enquête.";
    }
    if (status === 404) {
      return 'Stage introuvable ou enquête non configurée.';
    }
    if (status === 0 || (status ?? 0) >= 500) {
      return "Impossible d'accéder au serveur. Vérifiez votre connexion Internet.";
    }
    return 'Problème de connexion. Veuillez réessayer.';
  }
}
