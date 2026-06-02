import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { isStageFinishedByCalendarEndDate } from '../../utils/stage-fin.util';
import {
  canSignLogbook,
  getLogbookSignBlockedReason,
} from '../../shared/stage-documents/stage-document-signature-eligibility.util';

@Component({
  selector: 'app-student-follow-up-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-follow-up-page.component.html',
  styleUrls: ['../../admin/dashboard/admin-dashboard.css', '../student-shared.css']
})
export class StudentFollowUpPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingData = false;
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

  /** Stage terminé : date de fin calendaire strictement avant aujourd'hui (aligné backend). */
  get isStageFinished(): boolean {
    return isStageFinishedByCalendarEndDate(this.selectedInternship?.dateFin);
  }

  get progressPercent(): number {
    const total = this.trelloSummary?.nombreTotalTaches ?? 0;
    if (!total) return 0;
    return Math.round(((this.trelloSummary?.nombreTachesTerminees ?? 0) / total) * 100);
  }

  get hasTrelloBoard(): boolean {
    return !!this.resolveTrelloBoardUrl(this.selectedInternship);
  }

  get trelloBoardHref(): string {
    return this.resolveTrelloBoardUrl(this.selectedInternship);
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

  get canOpenLogbookPdf(): boolean {
    return this.canAccessDocument(this.logbookStatus);
  }

  get logbookBlockingMessage(): string {
    return this.logbookStatus?.raisonAbsence || '';
  }

  private canAccessDocument(status: { disponible?: boolean } | null | undefined): boolean {
    return Boolean(status?.disponible);
  }

  getLogbookPillLabel(): string {
    const statut = String(this.logbookStatus?.statut ?? '').trim();
    if (statut === 'En préparation' || statut === 'En preparation') return 'En preparation';
    if (this.canOpenLogbookPdf) return 'Disponible';
    return statut || 'En preparation';
  }

  canSignStudentLogbook(): boolean {
    const internship = this.selectedInternship;
    return canSignLogbook({
      dateFin: internship?.dateFin,
      dateDebut: internship?.dateDebut,
      dureeMonths: internship?.duree ?? null,
      alreadySigned: Boolean(this.report?.signeeStagiaire),
      hasDocument: Boolean(this.report?.id),
    });
  }

  getStudentLogbookSignTooltip(): string {
    if (this.report?.signeeStagiaire) {
      return 'Vous avez déjà signé ce cahier';
    }
    const internship = this.selectedInternship;
    if (this.canSignStudentLogbook()) {
      return 'Signer le cahier de stage';
    }
    return (
      getLogbookSignBlockedReason(internship?.dateFin, internship?.dateDebut, internship?.duree) ||
      'La signature du cahier de stage n\'est pas encore autorisee.'
    );
  }

  signLogbook(): void {
    if (!this.report?.id || this.report.signeeStagiaire || !this.canSignStudentLogbook()) return;
    if (!window.confirm('Confirmer la signature du cahier de stage ?')) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.studentPortalService.signReportAsStudent(this.report.id).subscribe({
      next: () => {
        this.successMessage = 'Cahier de stage signe.';
        if (this.selectedInternship) {
          this.loadDataForStage(this.selectedInternship.id);
        }
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer le cahier de stage.');
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
    if (this.isStageFinished) {
      this.errorMessage = 'Trello indisponible : stage terminé.';
      return;
    }

    const existingUrl = this.resolveTrelloBoardUrl(this.selectedInternship);
    if (existingUrl) {
      window.open(existingUrl, '_blank', 'noopener');
      return;
    }

    this.isOpeningTrello = true;
    this.errorMessage = '';
    const trelloWindow = window.open('', '_blank');
    if (trelloWindow) {
      trelloWindow.opener = null;
    }

    const stageId = this.selectedInternship.id;
    this.studentPortalService.getOrCreateTrelloBoard(stageId).subscribe({
      next: (board) => {
        this.isOpeningTrello = false;
        const boardUrl = board.trelloBoardUrl || (board.trelloBoardId ? `https://trello.com/b/${board.trelloBoardId}` : '');
        if (!boardUrl) {
          trelloWindow?.close();
          this.errorMessage = 'Erreur lors de la création du board Trello';
          return;
        }
        this.applyTrelloBoardToInternship(boardUrl, board.trelloBoardId);
        this.openTrelloUrl(boardUrl, trelloWindow);
        this.loadDataForStage(stageId);
      },
      error: (error) => {
        if (error?.status === 409) {
          this.studentPortalService.getInternshipById(stageId).subscribe({
            next: (internship) => {
              this.isOpeningTrello = false;
              this.selectedInternship = internship;
              const boardUrl = this.resolveTrelloBoardUrl(internship);
              if (boardUrl) {
                this.openTrelloUrl(boardUrl, trelloWindow);
                this.loadDataForStage(stageId);
                return;
              }
              trelloWindow?.close();
              this.errorMessage = this.studentPortalService.describeError(
                error,
                'Erreur lors de la création du board Trello'
              );
            },
            error: () => {
              this.isOpeningTrello = false;
              trelloWindow?.close();
              this.errorMessage = this.studentPortalService.describeError(
                error,
                'Erreur lors de la création du board Trello'
              );
            }
          });
          return;
        }
        this.isOpeningTrello = false;
        trelloWindow?.close();
        this.errorMessage = this.studentPortalService.describeError(error, 'Erreur lors de la création du board Trello');
      }
    });
  }

  private resolveTrelloBoardUrl(internship: StudentInternship | null | undefined): string {
    if (!internship) return '';
    if (internship.trelloBoardUrl) return internship.trelloBoardUrl;
    if (internship.trelloBoardId) return `https://trello.com/b/${internship.trelloBoardId}`;
    return '';
  }

  private applyTrelloBoardToInternship(boardUrl: string, boardId?: string): void {
    if (!this.selectedInternship) return;
    this.selectedInternship.trelloBoardUrl = boardUrl;
    if (boardId) {
      this.selectedInternship.trelloBoardId = boardId;
    }
  }

  private openTrelloUrl(boardUrl: string, trelloWindow: Window | null): void {
    if (trelloWindow) {
      trelloWindow.location.href = boardUrl;
    } else {
      window.open(boardUrl, '_blank', 'noopener');
    }
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
    const stageFinished = internship ? isStageFinishedByCalendarEndDate(internship.dateFin) : false;

    const trello$ =
      !stageFinished && this.resolveTrelloBoardUrl(internship)
        ? this.studentPortalService.getStageProgressSummary(stageId).pipe(
            catchError((error) => {
              this.trelloInfoMessage = this.studentPortalService.describeError(error, 'Synchronisation Trello indisponible.');
              return of(null);
            })
          )
        : of(null);

    if (stageFinished) {
      this.trelloInfoMessage = 'Trello indisponible : stage terminé.';
    } else if (!this.resolveTrelloBoardUrl(internship)) {
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
