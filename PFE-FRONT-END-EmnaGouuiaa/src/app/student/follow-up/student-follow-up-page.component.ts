import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  StudentInternship,
  StudentMeeting,
  StudentStageDocumentsOverview,
  StudentReport,
  StudentTrelloSummary
} from '../../services/student/student.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-follow-up-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-follow-up-page.component.html',
  styleUrls: ['../../admin/dashboard/admin-dashboard.css', '../student-shared.css']
})
export class StudentFollowUpPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingData = false;
  isGeneratingLogbook = false;
  isOpeningTrello = false;
  errorMessage = '';
  successMessage = '';
  trelloInfoMessage = '';
  meetingsInfoMessage = '';
  reportInfoMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  trelloSummary: StudentTrelloSummary | null = null;
  meetings: StudentMeeting[] = [];
  report: StudentReport | null = null;
  stageDocuments: StudentStageDocumentsOverview | null = null;

  constructor(
    private studentPortalService: StudentPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        // Sélection automatique : stage persisté, sinon stage courant, sinon le seul/premier.
        this.selectedInternship = this.studentPortalService.resolveSelectedInternship(internships);
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        if (this.selectedInternship) {
          this.loadDataForStage(this.selectedInternship.id);
        }
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.selectedInternship = this.internships.find((item) => item.id === this.selectedStageId) ?? null;
    // Mémorise le choix pour que les autres pages chargent le même stage.
    this.studentPortalService.setSelectedStageId(this.selectedStageId);
    if (this.selectedInternship) {
      this.loadDataForStage(this.selectedInternship.id);
    }
  }

  get isStageActive(): boolean {
    return ['EN_COURS', 'VALIDEE', 'VALIDE_PAR_ENTREPRISE', 'VALIDE_PAR_RESPONSABLE'].includes(
      (this.selectedInternship?.statut || '').toUpperCase()
    );
  }

  get progressPercent(): number {
    const total = this.trelloSummary?.nombreTotalTaches ?? 0;
    if (!total) return 0;
    return Math.round(((this.trelloSummary?.nombreTachesTerminees ?? 0) / total) * 100);
  }

  get hasTrelloBoard(): boolean {
    return !!this.selectedInternship?.trelloBoardUrl;
  }

  get trelloPrimaryActionLabel(): string {
    return this.hasTrelloBoard ? 'Ouvrir le board Trello' : 'Créer automatiquement le board';
  }

  get observations(): StudentMeeting[] {
    return this.meetings.filter((item) => !!item.observation || !!item.compteRendu);
  }

  get logbookStatus() {
    return this.stageDocuments?.cahierStage ?? null;
  }

  get canGenerateLogbook(): boolean {
    return Boolean(this.logbookStatus?.generationAutorisee);
  }

  get canOpenLogbookPdf(): boolean {
    return Boolean(this.logbookStatus?.disponible);
  }

  get logbookBlockingMessage(): string {
    return this.logbookStatus?.raisonAbsence || '';
  }

  generateLogbook(): void {
    if (!this.selectedInternship) return;
    if (!this.canGenerateLogbook) {
      this.errorMessage = this.logbookBlockingMessage || 'Le cahier de stage ne peut pas etre genere pour le moment.';
      return;
    }
    this.isGeneratingLogbook = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.generateLogbook(this.selectedInternship.id).subscribe({
      next: (result) => {
        this.successMessage = result.message || 'Cahier de stage généré.';
        this.isGeneratingLogbook = false;
        this.loadDataForStage(this.selectedInternship!.id);
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de générer le cahier de stage.');
        this.isGeneratingLogbook = false;
      }
    });
  }

  openLogbookPdf(): void {
    if (!this.selectedInternship) return;
    if (!this.canOpenLogbookPdf) {
      this.errorMessage = this.logbookBlockingMessage || "Impossible d'ouvrir le PDF du cahier de stage.";
      return;
    }
    const pdfWindow = this.pdfWindowService.openPlaceholder('Cahier de stage');
    this.studentPortalService.downloadStageDocumentPdf(this.selectedInternship.id, 'cahier-stage').subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: 'Cahier de stage' });
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = this.studentPortalService.describeError(error, "Impossible d'ouvrir le PDF du cahier de stage.");
      }
    });
  }

  openTrelloBoard(): void {
    if (!this.selectedInternship) return;

    this.isOpeningTrello = true;
    this.errorMessage = '';
    const trelloWindow = window.open('', '_blank');
    if (trelloWindow) {
      trelloWindow.opener = null;
    }

    this.studentPortalService.getOrCreateTrelloBoard(this.selectedInternship.id).subscribe({
      next: (board) => {
        this.isOpeningTrello = false;
        if (!board.trelloBoardUrl) {
          trelloWindow?.close();
          this.errorMessage = 'Erreur lors de la création du board Trello';
          return;
        }
        this.selectedInternship!.trelloBoardUrl = board.trelloBoardUrl;
        if (trelloWindow) {
          trelloWindow.location.href = board.trelloBoardUrl;
        } else {
          window.open(board.trelloBoardUrl, '_blank', 'noopener');
        }
        this.loadDataForStage(this.selectedInternship!.id);
      },
      error: (error) => {
        this.isOpeningTrello = false;
        if (error?.status === 409 && this.selectedInternship?.trelloBoardUrl) {
          if (trelloWindow) {
            trelloWindow.location.href = this.selectedInternship.trelloBoardUrl;
          } else {
            window.open(this.selectedInternship.trelloBoardUrl, '_blank', 'noopener');
          }
          return;
        }
        trelloWindow?.close();
        this.errorMessage = this.studentPortalService.describeError(error, 'Erreur lors de la création du board Trello');
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  private loadDataForStage(stageId: number): void {
    this.isLoadingData = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.trelloInfoMessage = '';
    this.meetingsInfoMessage = '';
    this.reportInfoMessage = '';
    this.trelloSummary = null;
    this.meetings = [];
    this.report = null;
    this.stageDocuments = null;

    const internship = this.selectedInternship;
    const trello$ = internship?.trelloBoardUrl
      ? this.studentPortalService.getStageProgressSummary(stageId).pipe(
          catchError((error) => {
            this.trelloInfoMessage = this.studentPortalService.describeError(error, 'Synchronisation Trello indisponible.');
            return of(null);
          })
        )
      : of(null);

    if (!internship?.trelloBoardUrl) {
      this.trelloInfoMessage = "Le tableau Trello sera créé automatiquement lors de l'ouverture.";
    }

    forkJoin({
      trello: trello$,
      weeklyMeetings: this.studentPortalService.listMeetingsByStage(stageId).pipe(
        catchError((error) => {
          this.meetingsInfoMessage = this.studentPortalService.describeError(error, 'Impossible de charger les réunions hebdomadaires.');
          return of([]);
        })
      ),
      finalMeetings: this.studentPortalService.listFinalMeetingsByStage(stageId).pipe(catchError(() => of([]))),
      documents: this.studentPortalService.getStageDocuments(stageId).pipe(
        catchError((error) => {
          this.reportInfoMessage ||= this.studentPortalService.describeError(error, 'Le statut des documents est indisponible pour ce stage.');
          return of(null);
        })
      ),
      report: this.studentPortalService.getReportByStage(stageId).pipe(
        catchError((error) => {
          this.reportInfoMessage = this.studentPortalService.describeError(error, 'Aucun cahier de stage disponible pour ce stage.');
          return of(null);
        })
      )
    }).subscribe({
      next: ({ trello, weeklyMeetings, finalMeetings, documents, report }) => {
        this.trelloSummary = trello;
        this.meetings = [...weeklyMeetings, ...finalMeetings].sort((a, b) =>
          `${b.date} ${b.heure}`.localeCompare(`${a.date} ${a.heure}`)
        );
        this.stageDocuments = documents;
        this.report = report;
        if (!this.meetings.length && !this.meetingsInfoMessage) {
          this.meetingsInfoMessage = 'Aucune réunion ni observation trouvée pour ce stage.';
        }
        this.isLoadingData = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger le suivi du stage.');
        this.isLoadingData = false;
      }
    });
  }
}
