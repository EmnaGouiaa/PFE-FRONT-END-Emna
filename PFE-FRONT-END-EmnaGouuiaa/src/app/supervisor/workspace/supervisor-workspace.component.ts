import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';
import { SatisfactionSurveySectionComponent } from '../../components/satisfaction-survey-section.component';
import {
  SupervisorAgreement,
  SupervisorEvaluation,
  SupervisorInternship,
  SupervisorLogbook,
  SupervisorMeeting,
  SupervisorMeetingPayload,
  SupervisorRole,
  SupervisorStageDocumentStatus,
  SupervisorStageDocumentsOverview,
  SupervisorTrelloSummary
} from '../../services/supervisor/supervisor.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { SupervisorPortalService } from '../../services/supervisor/supervisor-portal.service';

type SupervisorSection =
  | 'dashboard'
  | 'stagiaires'
  | 'reunions'
  | 'documents'
  | 'cahier'
  | 'evaluations'
  | 'conventions'
  | 'notifications';

@Component({
  selector: 'app-supervisor-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SatisfactionSurveySectionComponent],
  templateUrl: './supervisor-workspace.component.html',
  styleUrls: ['../../admin/dashboard/admin-dashboard.css', '../supervisor-shared.css']
})
export class SupervisorWorkspaceComponent implements OnInit {
  section: SupervisorSection = 'dashboard';
  role: SupervisorRole = 'ENCADRANT_PROFESSIONNEL';
  userId = 0;

  internships: SupervisorInternship[] = [];
  meetings: SupervisorMeeting[] = [];
  notifications: UserNotification[] = [];
  agreementsByStage = new Map<number, SupervisorAgreement>();
  logbooksByStage = new Map<number, SupervisorLogbook>();
  evaluationsByStage = new Map<number, SupervisorEvaluation>();
  documentStatusesByStage = new Map<number, SupervisorStageDocumentsOverview>();

  searchTerm = '';
  statusFilter = 'ALL';
  isLoading = false;
  isSaving = false;
  openingTrelloStageId: number | null = null;
  errorMessage = '';
  successMessage = '';
  profileCompletionMissingFields: string[] = [];
  lastUpdatedAt: Date | null = null;

  stageModal: SupervisorInternship | null = null;
  followUpModal: SupervisorInternship | null = null;
  followUpTrello: SupervisorTrelloSummary | null = null;
  followUpInfoMessage = '';
  isLoadingFollowUp = false;
  trelloModal: SupervisorTrelloSummary | null = null;
  meetingModalOpen = false;
  meetingDetailsModal: SupervisorMeeting | null = null;
  reportModal: SupervisorMeeting | null = null;
  evaluationModal: SupervisorEvaluation | null = null;

  reportText = '';
  evaluationDraft = {
    pointFortEncadrantPro: '',
    axeAmeliorationEncadrantPro: ''
  };
  meetingDraft: SupervisorMeetingPayload = this.emptyMeetingDraft();

  constructor(
    private route: ActivatedRoute,
    private authService: AuthentificationService,
    private supervisorService: SupervisorPortalService,
    private notificationService: NotificationService,
    private currentUserProfileService: CurrentUserProfileService,
    private pdfWindowService: PdfWindowService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  ngOnInit(): void {
    this.role =
      this.authService.getRoleUtilisateur() === RoleUtilisateur.ENCADRANT_ACADEMIQUE
        ? 'ENCADRANT_ACADEMIQUE'
        : 'ENCADRANT_PROFESSIONNEL';
    this.userId = this.authService.getUserId() ?? 0;
    this.loadProfileCompletion();
    this.route.data.subscribe((data) => {
      this.section = (data['section'] ?? 'dashboard') as SupervisorSection;
      this.searchTerm = '';
      this.statusFilter = 'ALL';
      this.loadAll();
    });
  }

  get basePath(): string {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? '/encadrant-academique' : '/encadrant-professionnel';
  }

  get roleLabel(): string {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? 'Encadrant académique' : 'Encadrant professionnel';
  }

  get pageTitle(): string {
    const labels: Record<SupervisorSection, string> = {
      dashboard: 'Tableau de bord',
      stagiaires: this.role === 'ENCADRANT_ACADEMIQUE' ? 'Stagiaires suivis' : 'Stagiaires encadrés',
      reunions: 'Réunions',
      documents: 'Documents de stage',
      cahier: 'Cahier de stage',
      evaluations: "Fiche d'évaluation",
      conventions: 'Conventions',
      notifications: 'Notifications'
    };
    return labels[this.section];
  }

  get pageSubtitle(): string {
    if (this.section === 'evaluations' && this.role === 'ENCADRANT_ACADEMIQUE') {
      return "L'encadrant académique ne renseigne et ne signe aucune fiche d'évaluation.";
    }
    return this.role === 'ENCADRANT_ACADEMIQUE'
      ? 'Validation du sujet, suivi pédagogique, réunions, cahier de stage et conventions.'
      : 'Suivi entreprise, réunions, cahier de stage, évaluations, conventions et notifications.';
  }

  get showProfileCompletionReminder(): boolean {
    return this.section === 'dashboard' && !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  get stats() {
    const now = new Date();
    return {
      students: new Set(this.internships.map((item) => item.student.id ?? item.student.email)).size,
      ongoing: this.internships.filter((item) => item.statut === 'EN_COURS').length,
      pendingSubjects: this.internships.filter((item) => item.statutSujet === 'EN_ATTENTE').length,
      upcomingMeetings: this.meetings.filter((item) => Date.parse(`${item.date}T${item.heure || '00:00'}`) >= now.getTime()).length,
      unreadNotifications: this.notifications.filter((item) => !item.read).length,
      signedAgreements: Array.from(this.agreementsByStage.values()).filter((item) =>
        this.role === 'ENCADRANT_ACADEMIQUE' ? item.signeeEncAca : item.signeeEncPro
      ).length,
      signedLogbooks: Array.from(this.logbooksByStage.values()).filter((item) =>
        this.role === 'ENCADRANT_ACADEMIQUE' ? item.signeeEncAcad : item.signeeEncPro
      ).length
    };
  }

  get filteredInternships(): SupervisorInternship[] {
    const query = this.normalize(this.searchTerm);
    return this.internships.filter((item) => {
      const statusMatches = this.statusFilter === 'ALL' || item.statut === this.statusFilter || item.statutSujet === this.statusFilter;
      const haystack = this.normalize([
        item.titre,
        item.sujet,
        item.statut,
        item.statutSujet,
        item.student.fullName,
        item.student.email,
        item.company.nom,
        item.professionalSupervisor.fullName,
        item.academicSupervisor.fullName
      ].join(' '));
      return statusMatches && (!query || haystack.includes(query));
    });
  }

  get filteredMeetings(): SupervisorMeeting[] {
    const query = this.normalize(this.searchTerm);
    return this.meetings.filter((item) => {
      const haystack = this.normalize([
        item.numReunion,
        item.stageTitre,
        item.studentName,
        item.companyName,
        item.source,
        item.observation,
        item.compteRendu
      ].join(' '));
      return !query || haystack.includes(query);
    });
  }

  get upcomingMeetingsList(): SupervisorMeeting[] {
    const now = Date.now();
    return this.filteredMeetings.filter((item) => this.toMeetingTimestamp(item) >= now);
  }

  get pastMeetingsList(): SupervisorMeeting[] {
    const now = Date.now();
    return this.filteredMeetings.filter((item) => this.toMeetingTimestamp(item) < now);
  }

  get filteredNotifications(): UserNotification[] {
    const query = this.normalize(this.searchTerm);
    return this.notifications.filter((item) => {
      const stateMatches =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'UNREAD' && !item.read) ||
        (this.statusFilter === 'READ' && item.read);
      const haystack = this.normalize([item.title, item.message, item.dateTime].join(' '));
      return stateMatches && (!query || haystack.includes(query));
    });
  }

  get uniqueStatuses(): string[] {
    return Array.from(new Set(this.internships.flatMap((item) => [item.statut, item.statutSujet]).filter(Boolean))).sort();
  }

  get followUpMeetings(): SupervisorMeeting[] {
    return this.followUpModal ? this.meetings.filter((item) => item.stageId === this.followUpModal?.id) : [];
  }

  get followUpObservations(): SupervisorMeeting[] {
    return this.followUpMeetings.filter((item) => !!item.observation || !!item.compteRendu);
  }

  canModifyMeeting(meeting: SupervisorMeeting): boolean {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    return this.toMeetingTimestamp(meeting) - Date.now() >= twentyFourHoursInMs;
  }

  canCancelMeeting(meeting: SupervisorMeeting): boolean {
    return this.canModifyMeeting(meeting);
  }

  getMeetingTypeLabel(meeting: SupervisorMeeting): string {
    return meeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion hebdomadaire';
  }

  getMeetingTypeBadgeClass(meeting: SupervisorMeeting): string {
    return meeting.source === 'FINALE' ? 'status-final-meeting' : 'status-weekly-meeting';
  }

  getMeetingSupervisorLabel(meeting: SupervisorMeeting): string {
    const explicitType = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
    const explicitName = String(meeting.nomEncadrantCreateur ?? '').trim();
    if (explicitType === 'ACADEMIQUE') {
      return `Encadrant académique${explicitName ? ' : ' + explicitName : ''}`;
    }
    if (explicitType === 'PROFESSIONNEL') {
      return `Encadrant professionnel${explicitName ? ' : ' + explicitName : ''}`;
    }
    return explicitName ? `Encadrant : ${explicitName}` : 'Encadrant non renseigné';
  }

  get followUpProgressPercent(): number {
    const total = this.followUpTrello?.nombreTotalTaches ?? 0;
    if (!total) return 0;
    return Math.round(((this.followUpTrello?.nombreTachesTerminees ?? 0) / total) * 100);
  }

  get followUpHasTrelloBoard(): boolean {
    return !!this.followUpModal?.trelloBoardUrl;
  }

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.supervisorService
      .listMyInternships(this.role)
      .pipe(timeout(15000))
      .subscribe({
        next: (internships) => {
          this.internships = internships;
          this.loadRelatedData(internships);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger votre espace encadrant.';
          this.isLoading = false;
        }
      });
  }

  private loadProfileCompletion(): void {
    this.currentUserProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.profileCompletionMissingFields =
          this.profileCompletionService.getMissingFieldsForCurrentProfile(profile);
      },
      error: () => {
        this.profileCompletionMissingFields = [];
      }
    });
  }

  openStageModal(internship: SupervisorInternship): void {
    this.stageModal = internship;
  }

  openFollowUpModal(internship: SupervisorInternship): void {
    this.followUpModal = internship;
    this.followUpTrello = null;
    this.followUpInfoMessage = '';

    if (!internship.trelloBoardUrl) {
      this.followUpInfoMessage = "Le tableau Trello sera créé automatiquement lors de l'ouverture.";
      return;
    }

    this.isLoadingFollowUp = true;
    this.supervisorService.getTrelloSummary(internship.id).pipe(timeout(15000)).subscribe({
      next: (summary) => {
        this.followUpTrello = summary;
        this.isLoadingFollowUp = false;
      },
      error: (error) => {
        this.followUpInfoMessage = error?.error?.message ?? 'Synchronisation Trello indisponible.';
        this.isLoadingFollowUp = false;
      }
    });
  }

  loadTrello(internship: SupervisorInternship): void {
    this.errorMessage = '';
    this.supervisorService.getTrelloSummary(internship.id).pipe(timeout(15000)).subscribe({
      next: (summary) => {
        this.trelloModal = summary;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de charger le résumé Trello.';
      }
    });
  }

  openTrelloBoard(internship: SupervisorInternship): void {
    this.openingTrelloStageId = internship.id;
    this.errorMessage = '';
    this.followUpInfoMessage = '';
    const trelloWindow = window.open('', '_blank');
    if (trelloWindow) {
      trelloWindow.opener = null;
    }

    this.supervisorService.getOrCreateTrelloBoard(internship.id).pipe(timeout(15000)).subscribe({
      next: (board) => {
        this.openingTrelloStageId = null;
        if (!board.trelloBoardUrl) {
          trelloWindow?.close();
          this.errorMessage = 'Erreur lors de la création du board Trello';
          return;
        }
        internship.trelloBoardUrl = board.trelloBoardUrl;
        if (this.followUpModal?.id === internship.id) {
          this.followUpModal.trelloBoardUrl = board.trelloBoardUrl;
          this.openFollowUpModal(internship);
        }
        if (trelloWindow) {
          trelloWindow.location.href = board.trelloBoardUrl;
        } else {
          window.open(board.trelloBoardUrl, '_blank', 'noopener');
        }
      },
      error: (error) => {
        this.openingTrelloStageId = null;
        trelloWindow?.close();
        const message = error?.error?.message ?? 'Erreur lors de la création du board Trello';
        if (this.followUpModal?.id === internship.id) {
          this.followUpInfoMessage = message;
        } else {
          this.errorMessage = message;
        }
      }
    });
  }

  validateSubject(internship: SupervisorInternship): void {
    this.supervisorService.validateSubject(internship.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Sujet validé : le stage est en cours et la convention est générée.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de valider le sujet.';
      }
    });
  }

  rejectSubject(internship: SupervisorInternship): void {
    this.supervisorService.rejectSubject(internship.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Sujet refusé.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de refuser le sujet.';
      }
    });
  }

  openMeetingModal(meeting?: SupervisorMeeting): void {
    if (meeting && !this.canModifyMeeting(meeting)) {
      this.errorMessage = 'La modification est refusée car la réunion commence dans moins de 6 heures.';
      return;
    }

    this.meetingDraft = meeting
      ? {
          id: meeting.id,
          numReunion: meeting.numReunion,
          date: meeting.date,
          heure: meeting.heure,
          observation: meeting.observation,
          compteRendu: meeting.compteRendu,
          stageId: meeting.stageId,
          participantIds: meeting.participantIds
        }
      : this.emptyMeetingDraft();
    this.meetingModalOpen = true;
  }

  openMeetingDetails(meeting: SupervisorMeeting): void {
    this.meetingDetailsModal = meeting;
  }

  saveMeeting(): void {
    if (!this.meetingDraft.stageId || !this.meetingDraft.date || !this.meetingDraft.heure || !this.meetingDraft.observation) {
      this.errorMessage = 'Veuillez remplir tous les champs de la réunion.';
      return;
    }

    this.isSaving = true;
    this.supervisorService.saveMeeting(this.meetingDraft).pipe(timeout(15000)).subscribe({
      next: (createdMeeting) => {
        this.isSaving = false;
        this.successMessage = `Réunion enregistrée${createdMeeting?.numReunion ? ' (Numéro: ' + createdMeeting.numReunion + ')' : ''} et participants notifiés.`;
        this.closeModals();
        this.loadAll();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = this.extractErrorMessage(error, "Impossible d'enregistrer la réunion.");
      }
    });
  }

  openReportModal(meeting: SupervisorMeeting): void {
    this.reportModal = meeting;
    this.reportText = meeting.compteRendu || '';
  }

  saveReport(): void {
    if (!this.reportModal) return;
    this.isSaving = true;
    this.supervisorService.saveReport(this.reportModal.id, this.reportText).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Compte rendu enregistré.';
        this.closeModals();
        this.loadAll();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer le compte rendu.";
      }
    });
  }

  signAgreement(agreement: SupervisorAgreement): void {
    this.supervisorService.signAgreement(this.role, agreement.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Convention signée avec votre image de signature.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer la convention.';
      }
    });
  }

  signLogbook(logbook: SupervisorLogbook): void {
    this.supervisorService.signLogbook(this.role, logbook.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Cahier validé et signé.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer le cahier.';
      }
    });
  }

  generateLogbook(internship: SupervisorInternship): void {
    const status = this.getLogbookStatus(internship.id);
    if (status && !status.generationAutorisee) {
      this.errorMessage = status.raisonAbsence || "Le cahier de stage ne peut pas etre genere pour le moment.";
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.supervisorService.generateLogbook(internship.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Cahier de stage généré et ajouté aux documents du stage.';
        this.loadAll();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.message ?? 'Impossible de générer le cahier de stage.';
      }
    });
  }

  openEvaluationModal(evaluation: SupervisorEvaluation): void {
    this.evaluationModal = evaluation;
    this.evaluationDraft = {
      pointFortEncadrantPro: evaluation.pointFortEncadrantPro,
      axeAmeliorationEncadrantPro: evaluation.axeAmeliorationEncadrantPro
    };
  }

  saveEvaluation(): void {
    if (!this.evaluationModal) return;
    this.isSaving = true;
    this.supervisorService.fillProfessionalEvaluation(this.evaluationModal.id, this.userId, this.evaluationDraft).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Partie entreprise enregistrée.';
        this.closeModals();
        this.loadAll();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'évaluation.";
      }
    });
  }

  signEvaluation(evaluation: SupervisorEvaluation): void {
    this.supervisorService.signEvaluation(evaluation.id, this.userId).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Fiche signée avec votre image de signature.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer la fiche.';
      }
    });
  }

  deleteMeeting(meeting: SupervisorMeeting): void {
    if (!this.canCancelMeeting(meeting)) {
      this.errorMessage = 'Vous ne pouvez pas annuler une réunion moins de 24 heures avant son horaire.';
      return;
    }

    if (!window.confirm('Confirmer l’annulation de cette réunion ?')) {
      return;
    }

    this.supervisorService.deleteMeeting(meeting.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Réunion annulée avec succès.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible d'annuler la réunion.");
      }
    });
  }

  markNotificationRead(notification: UserNotification): void {
    this.notificationService.markAsRead(notification.id, this.userId).pipe(timeout(15000)).subscribe({
      next: () => {
        notification.read = true;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de marquer la notification comme lue.';
      }
    });
  }

  download(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): void {
    const status =
      type === 'convention'
        ? this.getConventionStatus(stageId)
        : type === 'fiche-evaluation'
          ? this.getEvaluationStatus(stageId)
          : this.getLogbookStatus(stageId);
    if (status && !status.disponible) {
      this.errorMessage = status.raisonAbsence || "Impossible d'ouvrir le PDF.";
      return;
    }

    const title =
      type === 'convention'
        ? 'Convention de stage'
        : type === 'fiche-evaluation'
          ? "Fiche d'évaluation"
          : 'Cahier de stage';
    const pdfWindow = this.pdfWindowService.openPlaceholder(title);

    this.supervisorService.downloadDocument(stageId, type).pipe(timeout(15000)).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title });
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = error?.error?.message ?? "Impossible d'ouvrir le PDF.";
      }
    });
  }

  closeModals(): void {
    this.stageModal = null;
    this.followUpModal = null;
    this.followUpTrello = null;
    this.followUpInfoMessage = '';
    this.isLoadingFollowUp = false;
    this.trelloModal = null;
    this.meetingModalOpen = false;
    this.meetingDetailsModal = null;
    this.reportModal = null;
    this.evaluationModal = null;
  }

  private loadRelatedData(internships: SupervisorInternship[]): void {
    const related$ = forkJoin({
      meetings: this.supervisorService.listMeetingsForInternships(internships).pipe(catchError(() => of([]))),
      notifications: this.userId ? this.notificationService.listByUser(this.userId).pipe(catchError(() => of([]))) : of([]),
      agreements: this.loadAgreements(internships),
      logbooks: this.loadLogbooks(internships),
      evaluations: this.role === 'ENCADRANT_PROFESSIONNEL' ? this.loadEvaluations(internships) : of([]),
      documentStatuses: this.loadDocumentStatuses(internships)
    });

    related$.pipe(timeout(15000)).subscribe({
      next: ({ meetings, notifications, agreements, logbooks, evaluations, documentStatuses }) => {
        this.meetings = meetings;
        this.notifications = notifications;
        this.agreementsByStage = new Map(agreements.map((item) => [item.stageId, item]));
        this.logbooksByStage = new Map(logbooks.map((item) => [item.stageId, item]));
        this.evaluationsByStage = new Map(evaluations.map((item) => [item.stageId, item]));
        this.documentStatusesByStage = new Map(documentStatuses.map((item) => [item.stageId, item]));
        this.lastUpdatedAt = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Certaines données associées ne sont pas disponibles pour le moment.';
        this.isLoading = false;
      }
    });
  }

  private loadAgreements(internships: SupervisorInternship[]) {
    if (!internships.length) return of([] as SupervisorAgreement[]);
    return forkJoin(
      internships.map((item) =>
        this.supervisorService.getAgreementByStage(item.id).pipe(catchError(() => of(null)))
      )
    ).pipe(mapNullableArray<SupervisorAgreement>());
  }

  private loadLogbooks(internships: SupervisorInternship[]) {
    if (!internships.length) return of([] as SupervisorLogbook[]);
    return forkJoin(
      internships.map((item) =>
        this.supervisorService.getLogbookByStage(item.id).pipe(catchError(() => of(null)))
      )
    ).pipe(mapNullableArray<SupervisorLogbook>());
  }

  private loadEvaluations(internships: SupervisorInternship[]) {
    if (!internships.length) return of([] as SupervisorEvaluation[]);
    return forkJoin(
      internships.map((item) =>
        this.supervisorService.getEvaluationByStage(item.id).pipe(catchError(() => of(null)))
      )
    ).pipe(mapNullableArray<SupervisorEvaluation>());
  }

  private loadDocumentStatuses(internships: SupervisorInternship[]) {
    if (!internships.length) return of([] as SupervisorStageDocumentsOverview[]);
    return forkJoin(
      internships.map((item) =>
        this.supervisorService.getStageDocuments(item.id).pipe(catchError(() => of(null)))
      )
    ).pipe(mapNullableArray<SupervisorStageDocumentsOverview>());
  }

  getConventionStatus(stageId: number): SupervisorStageDocumentStatus | null {
    return this.documentStatusesByStage.get(stageId)?.convention ?? null;
  }

  getLogbookStatus(stageId: number): SupervisorStageDocumentStatus | null {
    return this.documentStatusesByStage.get(stageId)?.cahierStage ?? null;
  }

  getEvaluationStatus(stageId: number): SupervisorStageDocumentStatus | null {
    return this.documentStatusesByStage.get(stageId)?.ficheEvaluation ?? null;
  }

  private emptyMeetingDraft(): SupervisorMeetingPayload {
    return {
      date: '',
      heure: '',
      observation: '',
      compteRendu: '',
      stageId: this.internships[0]?.id ?? 0,
      participantIds: []
    };
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private toMeetingTimestamp(meeting: SupervisorMeeting): number {
    const isoValue = `${meeting.date || '1970-01-01'}T${meeting.heure || '00:00:00'}`;
    const timestamp = Date.parse(isoValue);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (error?.error && typeof error.error === 'object' && !Array.isArray(error.error)) {
      const fieldMessages = Object.values(error.error).filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      if (fieldMessages.length) {
        return fieldMessages.join(' ');
      }
    }
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}

function mapNullableArray<T>() {
  return (source: Observable<Array<T | null>>) =>
    source.pipe(
      map((items) => items.filter((item): item is T => item !== null))
    );
}
