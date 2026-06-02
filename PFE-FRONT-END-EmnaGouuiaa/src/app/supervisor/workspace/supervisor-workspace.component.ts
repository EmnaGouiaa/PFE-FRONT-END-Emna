import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';
import {
  SupervisorAgreement,
  SupervisorEvaluation,
  EvaluationNoteDto,
  SupervisorInternship,
  SupervisorLogbook,
  MeetingEligibleParticipant,
  MeetingParticipantGroup,
  SupervisorMeeting,
  SupervisorMeetingPayload,
  SupervisorRole,
  SupervisorStageDocumentStatus,
  SupervisorStageDocumentsOverview,
  SupervisorTrelloSummary
} from '../../services/supervisor/supervisor.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { readApiErrorMessage } from '../../services/http-error.util';
import { SupervisorPortalService } from '../../services/supervisor/supervisor-portal.service';
import { StageSignatureSyncService } from '../../services/stage-signature-sync.service';
import { filterInternshipsForStageDocuments } from '../../shared/stage-documents/stage-documents-eligibility.util';
import {
  canSignLogbook as canSignLogbookByRules,
  getLogbookSignBlockedReason,
} from '../../shared/stage-documents/stage-document-signature-eligibility.util';
import {
  StageDocumentSignButtonContext,
  StageDocumentSignType,
  isStageDocumentSignButtonDisabled,
  shouldShowStageDocumentSignButton,
} from '../../shared/stage-documents/stage-document-sign-button.util';
import { StageDocumentSignaturesBlockComponent } from '../../shared/stage-documents/stage-document-signatures-block.component';
import { StageDocumentSignActionComponent } from '../../shared/stage-documents/stage-document-sign-action.component';
import {
  StageSignatureActorView,
  signatoriesFromDocumentStatus,
  stageSignatureCardSummary,
} from '../../shared/stage-documents/stage-document-signatures.util';
import { SignatureCaptureModalComponent } from '../../components/signature-capture-modal/signature-capture-modal.component';
import { isStageFinishedByCalendarEndDate } from '../../utils/stage-fin.util';
import { isSupervisionPeriodOpen } from '../../services/stage-period.utils';
import {
  earliestSchedulableMeetingDateIso,
  getMeetingTimestamp,
  isMeetingAtLeast24HoursAhead,
  isMeetingDateWithinStagePeriod,
  isMeetingUpcoming,
  isSchedulableMeetingDate,
  maxIsoDate,
  MEETING_MIN_SCHEDULE_DELAY_ERROR,
  MEETING_OUTSIDE_STAGE_PERIOD_ERROR,
  meetingShowsObservation,
  splitMeetingsBySchedule,
} from '../../utils/meeting-schedule.util';
import {
  areAllCriteriaScoresValid,
  EVALUATION_SIGN_INCOMPLETE_MESSAGE,
  isEncadrantProfessionnelPartReadyForSign,
  buildNotesPayloadFromDrafts,
  buildRoleCriteriaDrafts,
  countScoredCriteriaForRole,
  ENCADRANT_PROFESSIONNEL_CRITERIA,
  finalScoreOnFiveFromNotes,
  formatFinalScoreOnFive,
  mergeRoleDraftsWithFicheNotes,
  RoleCriterionDraft
} from '../../utils/evaluation-criteria.util';
import {
  EVALUATION_UNAVAILABLE_MESSAGE,
  isEvaluationAccessible
} from '../../services/stage-period.utils';
import { strictFutureDateErrorMessage } from '../../shared/validators/strict-future-date.validators';

type ProfessionalCriterionDraft = RoleCriterionDraft;

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
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SignatureCaptureModalComponent,
    StageDocumentSignaturesBlockComponent,
    StageDocumentSignActionComponent,
  ],
  templateUrl: './supervisor-workspace.component.html',
  styleUrls: [
    '../../admin/dashboard/admin-dashboard.css',
    '../supervisor-shared.css',
    '../../company/evaluations/company-evaluations.component.css'
  ]
})
export class SupervisorWorkspaceComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);
  private liveSignatureSyncStarted = false;
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
  /** Stage associé au modal Trello liste (pour désactiver le lien après date de fin). */
  trelloModalInternship: SupervisorInternship | null = null;
  meetingModalOpen = false;
  editingMeetingSource: SupervisorMeeting['source'] | null = null;
  originalMeetingForEdit: SupervisorMeeting | null = null;
  meetingParticipantGroups: MeetingParticipantGroup[] = [];
  loadingMeetingParticipants = false;
  meetingParticipantsError = '';
  meetingDetailsModal: SupervisorMeeting | null = null;
  reportModal: SupervisorMeeting | null = null;
  evaluationModal: SupervisorEvaluation | null = null;
  docDetailsModal: {
    titre: string;
    status: SupervisorStageDocumentStatus;
    stageId: number;
    docType: 'convention' | 'fiche-evaluation' | 'cahier-stage';
  } | null = null;

  reportText = '';

  // ── Capture de signature du cahier de stage ────────────────────────────────
  /** Cahier en attente d'apposition d'une signature (null = modale fermee). */
  pendingSignLogbook: SupervisorLogbook | null = null;
  /** Vrai pendant l'appel reseau pour griser les actions de la modale. */
  signingLogbookInProgress = false;
  readonly professionalCriteriaLabels = [...ENCADRANT_PROFESSIONNEL_CRITERIA];
  professionalCriteriaDraft: ProfessionalCriterionDraft[] = this.createEmptyProfessionalCriteria();
  professionalCriteriaFormArray = new FormArray<FormControl<number | null>>([]);
  private professionalCriteriaFormArraySub?: Subscription;
  professionalEvaluationForm: FormGroup;
  selectedProfessionalEvaluationStageId: number | null = null;
  showSubmitEvaluationConfirm = false;
  showProfessionalEvaluationModal = false;
  evaluationDraft = {
    pointFortEncadrantPro: '',
    axeAmeliorationEncadrantPro: '',
    notesAttribuees: [] as EvaluationNoteDto[]
  };
  meetingDraft: SupervisorMeetingPayload = this.emptyMeetingDraft();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthentificationService,
    private supervisorService: SupervisorPortalService,
    private notificationService: NotificationService,
    private currentUserProfileService: CurrentUserProfileService,
    private pdfWindowService: PdfWindowService,
    public profileCompletionService: ProfileCompletionService
  ) {
    this.professionalEvaluationForm = this.fb.group({
      stageId: [null, Validators.required],
      commentairePrincipal: ['', [Validators.required, Validators.minLength(4)]],
      remarquesSupplementaires: ['']
    });
  }

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

    this.professionalEvaluationForm.get('stageId')?.valueChanges.subscribe((value) => {
      const stageId = value != null && value !== '' ? Number(value) : null;
      this.onProfessionalEvaluationStageChange(stageId);
    });

    this.syncProfessionalCriteriaFormArrayFromDrafts();
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
      upcomingMeetings: this.visibleMeetings.filter((item) => isMeetingUpcoming(item, now.getTime())).length,
      unreadNotifications: this.notifications.filter((item) => !item.read).length,
      signedAgreements: Array.from(this.agreementsByStage.values()).filter((item) =>
        this.role === 'ENCADRANT_ACADEMIQUE' ? item.signeeEncAca : item.signeeEncPro
      ).length,
      signedLogbooks: Array.from(this.logbooksByStage.values()).filter((item) =>
        this.role === 'ENCADRANT_ACADEMIQUE' ? item.signeeEncAcad : item.signeeEncPro
      ).length
    };
  }

  private get internshipsForDocumentViews(): SupervisorInternship[] {
    if (this.section === 'documents' || this.section === 'cahier' || this.section === 'conventions') {
      return filterInternshipsForStageDocuments(this.internships);
    }
    return this.internships;
  }

  get filteredInternships(): SupervisorInternship[] {
    const query = this.normalize(this.searchTerm);
    return this.internshipsForDocumentViews.filter((item) => {
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

  /** Réunions visibles : hebdomadaires créées par l'utilisateur ; finales du stage. */
  get visibleMeetings(): SupervisorMeeting[] {
    return this.meetings.filter((item) => this.canViewMeeting(item));
  }

  get participantMeetings(): SupervisorMeeting[] {
    return this.visibleMeetings;
  }

  get filteredMeetings(): SupervisorMeeting[] {
    const query = this.normalize(this.searchTerm);
    return this.visibleMeetings.filter((item) => {
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
    return splitMeetingsBySchedule(this.filteredMeetings).upcoming;
  }

  get pastMeetingsList(): SupervisorMeeting[] {
    return splitMeetingsBySchedule(this.filteredMeetings).past;
  }

  /** Exposé au template : réunions finales sans observation. */
  readonly showsMeetingObservation = meetingShowsObservation;

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

  get professionalEvaluationInternships(): SupervisorInternship[] {
    return this.filteredInternships;
  }

  get hasProfessionalEvaluationInternships(): boolean {
    return this.professionalEvaluationInternships.length > 0;
  }

  get hasMultipleProfessionalEvaluationInternships(): boolean {
    return this.professionalEvaluationInternships.length > 1;
  }

  get selectedProfessionalEvaluationInternship(): SupervisorInternship | null {
    if (this.selectedProfessionalEvaluationStageId == null) {
      return null;
    }
    return this.professionalEvaluationInternships.find((item) => item.id === this.selectedProfessionalEvaluationStageId) ?? null;
  }

  get selectedProfessionalEvaluation(): SupervisorEvaluation | null {
    if (this.selectedProfessionalEvaluationStageId == null) {
      return null;
    }
    return this.evaluationsByStage.get(this.selectedProfessionalEvaluationStageId) ?? null;
  }

  get professionalEvaluationLocked(): boolean {
    const internship = this.selectedProfessionalEvaluationInternship;
    if (!this.isEvaluationPeriodOpenForInternship(internship)) {
      return true;
    }
    const evaluation = this.selectedProfessionalEvaluation;
    if (!evaluation) {
      return true;
    }
    return Boolean(evaluation.verrouillee || this.isEvaluationSignedByMe(evaluation));
  }

  get evaluationModalFinalScoreOnFive(): number {
    if (!this.evaluationModal) {
      return 0;
    }
    return finalScoreOnFiveFromNotes(
      mergeRoleDraftsWithFicheNotes(
        this.professionalCriteriaDraft,
        this.evaluationModal.notesAttribuees ?? [],
        this.professionalCriteriaLabels
      )
    );
  }

  formatEvaluationFinalScore(score: number | null | undefined): string {
    return formatFinalScoreOnFive(score);
  }

  formatEvaluationCardFinalScore(evaluation: SupervisorEvaluation): string {
    if (!this.isEvaluationContentVisible(evaluation)) {
      return '—';
    }
    return formatFinalScoreOnFive(evaluation.noteFinale);
  }

  isEvaluationPeriodOpenForInternship(internship: SupervisorInternship | null | undefined): boolean {
    if (!internship) {
      return false;
    }
    return isEvaluationAccessible(internship.statut, internship.dateFin);
  }

  isEvaluationContentVisible(evaluation: SupervisorEvaluation | null | undefined): boolean {
    if (!evaluation || evaluation.evaluationAccessible === false) {
      return false;
    }
    const internship = this.internships.find((item) => item.id === evaluation.stageId);
    return this.isEvaluationPeriodOpenForInternship(internship);
  }

  readonly evaluationUnavailableMessage = EVALUATION_UNAVAILABLE_MESSAGE;
  readonly evaluationSignIncompleteMessage = EVALUATION_SIGN_INCOMPLETE_MESSAGE;

  get evaluationModalCriteriaLocked(): boolean {
    return this.isEvaluationReadOnlyForCurrentUser(this.evaluationModal);
  }

  get professionalEvaluationCanSave(): boolean {
    return !this.isSaving
      && !this.professionalEvaluationLocked
      && !!this.selectedProfessionalEvaluation
      && this.professionalEvaluationForm.valid
      && this.areProfessionalCriteriaFilled();
  }

  get professionalEvaluationCanSubmit(): boolean {
    const evaluation = this.selectedProfessionalEvaluation;
    if (!evaluation || this.isEvaluationSignedByMe(evaluation)) {
      return false;
    }
    return isEncadrantProfessionnelPartReadyForSign(
      {
        pretSignatureEncadrantProfessionnel: evaluation.pretSignatureEncadrantProfessionnel,
        pointFortEncadrantPro: String(this.professionalEvaluationForm.get('commentairePrincipal')?.value ?? evaluation.pointFortEncadrantPro),
        axeAmeliorationEncadrantPro: String(this.professionalEvaluationForm.get('remarquesSupplementaires')?.value ?? evaluation.axeAmeliorationEncadrantPro),
      },
      this.professionalCriteriaDraft
    );
  }

  get professionalEvaluationSaveButtonLabel(): string {
    return this.isSaving ? 'Enregistrement...' : 'Enregistrer';
  }

  get professionalEvaluationStateLabel(): string {
    return this.professionalEvaluationLocked ? 'Soumise / verrouillée' : 'Brouillon en cours';
  }

  isEvaluationPeriodLocked(evaluation: SupervisorEvaluation | null | undefined): boolean {
    if (!evaluation) {
      return true;
    }
    const internship = this.internships.find((item) => item.id === evaluation.stageId);
    return !this.isEvaluationPeriodOpenForInternship(internship);
  }

  canSignEvaluation(evaluation: SupervisorEvaluation | null | undefined): boolean {
    if (!evaluation || this.isEvaluationSignedByMe(evaluation) || this.isEvaluationPeriodLocked(evaluation)) {
      return false;
    }
    const drafts =
      this.evaluationModal?.id === evaluation.id ? this.professionalCriteriaDraft : undefined;
    return isEncadrantProfessionnelPartReadyForSign(evaluation, drafts);
  }

  getEvaluationSignTooltip(evaluation: SupervisorEvaluation | null | undefined): string {
    if (!evaluation) {
      return this.evaluationSignIncompleteMessage;
    }
    if (this.isEvaluationSignedByMe(evaluation)) {
      return 'Vous avez déjà signé cette fiche';
    }
    if (this.canSignEvaluation(evaluation)) {
      return "Signer la fiche d'évaluation";
    }
    return this.evaluationSignIncompleteMessage;
  }

  isEvaluationSubmittedReadOnly(evaluation: SupervisorEvaluation | null | undefined): boolean {
    if (!evaluation) {
      return false;
    }
    return Boolean(evaluation.verrouillee || this.isEvaluationSignedByMe(evaluation));
  }

  isEvaluationReadOnlyForCurrentUser(evaluation: SupervisorEvaluation | null | undefined): boolean {
    if (!evaluation) {
      return true;
    }
    if (this.isEvaluationPeriodLocked(evaluation)) {
      return true;
    }
    return this.isEvaluationSubmittedReadOnly(evaluation);
  }

  professionalEvaluationStageLabel(internship: SupervisorInternship): string {
    return internship.titre || internship.sujet || `Stage #${internship.id}`;
  }

  professionalEvaluationStudentLabel(internship: SupervisorInternship): string {
    return internship.student.fullName || 'Stagiaire non renseigné';
  }

  professionalEvaluationStagePeriodLabel(internship: SupervisorInternship): string {
    const from = internship.dateDebut || '-';
    const to = internship.dateFin || '-';
    return `${from} — ${to}`;
  }

  professionalEvaluationStatusLabel(internship: SupervisorInternship): string {
    return internship.statut || '-';
  }

  countProfessionalCriteriaScored(evaluation: SupervisorEvaluation): number {
    return countScoredCriteriaForRole(this.professionalCriteriaLabels, evaluation.notesAttribuees ?? []);
  }

  saveProfessionalEvaluationDraft(): void {
    if (!this.showProfessionalEvaluationModal) {
      return;
    }
    const evaluation = this.selectedProfessionalEvaluation;
    if (!evaluation) {
      this.errorMessage = "Aucune fiche d'évaluation n'est disponible pour ce stage.";
      return;
    }
    if (this.professionalEvaluationLocked) {
      this.errorMessage = 'La fiche est verrouillée : modification impossible.';
      return;
    }
    if (!this.professionalEvaluationForm.valid) {
      this.professionalEvaluationForm.markAllAsTouched();
      this.errorMessage = 'Minimum 4 caractères requis';
      return;
    }
    if (!this.areProfessionalCriteriaFilled()) {
      this.errorMessage = `Veuillez renseigner les ${this.professionalCriteriaLabels.length} notes (0 à 5).`;
      return;
    }
    this.persistProfessionalEvaluation(false);
  }

  requestSubmitProfessionalEvaluation(): void {
    if (!this.showProfessionalEvaluationModal) {
      return;
    }
    if (!this.professionalEvaluationCanSubmit) {
      this.saveProfessionalEvaluationDraft();
      return;
    }
    this.showSubmitEvaluationConfirm = true;
  }

  cancelSubmitProfessionalEvaluation(): void {
    this.showSubmitEvaluationConfirm = false;
  }

  confirmSubmitProfessionalEvaluation(): void {
    this.showSubmitEvaluationConfirm = false;
    this.persistProfessionalEvaluation(true);
  }

  openProfessionalEvaluationModal(stageId: number): void {
    this.professionalEvaluationForm.patchValue({ stageId });
    this.showProfessionalEvaluationModal = true;
  }

  closeProfessionalEvaluationModal(): void {
    this.showProfessionalEvaluationModal = false;
    this.showSubmitEvaluationConfirm = false;
  }

  get followUpMeetings(): SupervisorMeeting[] {
    return this.followUpModal ? this.participantMeetings.filter((item) => item.stageId === this.followUpModal?.id) : [];
  }

  get followUpObservations(): SupervisorMeeting[] {
    return this.followUpMeetings.filter(
      (item) => meetingShowsObservation(item) && (!!item.observation || !!item.compteRendu)
    );
  }

  canViewMeeting(meeting: SupervisorMeeting | null | undefined): boolean {
    if (!meeting || !this.userId) {
      return false;
    }
    if (meeting.source === 'FINALE') {
      const internship = this.internships.find((item) => item.id === meeting.stageId);
      if (!internship) {
        return false;
      }
      return (
        internship.academicSupervisor?.id === this.userId ||
        internship.professionalSupervisor?.id === this.userId
      );
    }
    return this.isCurrentUserMeetingCreator(meeting);
  }

  isCurrentUserMeetingCreator(meeting: SupervisorMeeting | null | undefined): boolean {
    if (!meeting || !this.userId) {
      return false;
    }
    if (meeting.encadrantCreateurId) {
      return meeting.encadrantCreateurId === this.userId;
    }
    const internship = this.internships.find((item) => item.id === meeting.stageId);
    if (!internship) {
      return false;
    }
    const creatorType = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
    if (creatorType === 'ACADEMIQUE') {
      return internship.academicSupervisor?.id === this.userId;
    }
    if (creatorType === 'PROFESSIONNEL') {
      return internship.professionalSupervisor?.id === this.userId;
    }
    return false;
  }

  isCurrentUserMeetingParticipant(meeting: SupervisorMeeting | null | undefined): boolean {
    return this.canViewMeeting(meeting);
  }

  get canCreateWeeklyMeeting(): boolean {
    return this.role === 'ENCADRANT_ACADEMIQUE' || this.role === 'ENCADRANT_PROFESSIONNEL';
  }

  canModifyMeeting(meeting: SupervisorMeeting): boolean {
    if (meeting.source === 'FINALE') {
      const internship = this.internships.find((item) => item.id === meeting.stageId);
      if (!internship || !this.userId) {
        return false;
      }
      return (
        internship.academicSupervisor?.id === this.userId ||
        internship.professionalSupervisor?.id === this.userId
      );
    }
    if (!this.isCurrentUserMeetingCreator(meeting)) {
      return false;
    }
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    return getMeetingTimestamp(meeting) - Date.now() >= twentyFourHoursInMs;
  }

  get isEditingFinalMeeting(): boolean {
    return this.editingMeetingSource === 'FINALE';
  }

  canCancelMeeting(meeting: SupervisorMeeting): boolean {
    return false;
  }

  getMeetingTypeLabel(meeting: SupervisorMeeting): string {
    return meeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion hebdomadaire';
  }

  getMeetingTypeBadgeClass(meeting: SupervisorMeeting): string {
    return meeting.source === 'FINALE' ? 'status-final-meeting' : 'status-weekly-meeting';
  }

  getMeetingSupervisorLabel(meeting: SupervisorMeeting): string {
    const explicitType = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
    const explicitName = this.getMeetingCreatorName(meeting);
    if (explicitType === 'ACADEMIQUE') {
      return `Encadrant académique : ${explicitName}`;
    }
    if (explicitType === 'PROFESSIONNEL') {
      return `Encadrant professionnel : ${explicitName}`;
    }
    return explicitName !== 'Non renseigné' ? `Encadrant : ${explicitName}` : 'Encadrant non renseigné';
  }

  getMeetingCreatorName(meeting: SupervisorMeeting | null | undefined): string {
    if (!meeting) {
      return 'Non renseigné';
    }
    const internship = this.internships.find((item) => item.id === meeting.stageId);
    const explicit = String(meeting.nomEncadrantCreateur ?? '').trim();
    if (explicit) {
      return explicit;
    }
    if (!internship) {
      return 'Non renseigné';
    }
    const type = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
    if (type === 'ACADEMIQUE') {
      return internship.academicSupervisor?.fullName?.trim() || 'Non renseigné';
    }
    if (type === 'PROFESSIONNEL') {
      return internship.professionalSupervisor?.fullName?.trim() || 'Non renseigné';
    }
    if (meeting.encadrantCreateurId === internship.academicSupervisor?.id) {
      return internship.academicSupervisor?.fullName?.trim() || 'Non renseigné';
    }
    if (meeting.encadrantCreateurId === internship.professionalSupervisor?.id) {
      return internship.professionalSupervisor?.fullName?.trim() || 'Non renseigné';
    }
    return 'Non renseigné';
  }

  getMeetingCompanySupervisorName(meeting: SupervisorMeeting | null | undefined): string {
    if (!meeting) {
      return 'Non renseigné';
    }
    const fromApi = String(meeting.companySupervisorName ?? '').trim();
    if (fromApi) {
      return fromApi;
    }
    const internship = this.internships.find((item) => item.id === meeting.stageId);
    return internship?.companySupervisor?.fullName?.trim() || 'Non renseigné';
  }

  getMeetingParticipantsLabel(meeting: SupervisorMeeting | null | undefined): string {
    const names = meeting?.participantNames?.filter((name) => !!String(name ?? '').trim()) ?? [];
    return names.length ? names.join(', ') : 'Aucun participant renseigné';
  }

  get followUpProgressPercent(): number {
    const total = this.followUpTrello?.nombreTotalTaches ?? 0;
    if (!total) return 0;
    return Math.round(((this.followUpTrello?.nombreTachesTerminees ?? 0) / total) * 100);
  }

  get followUpHasTrelloBoard(): boolean {
    return !!this.followUpModal?.trelloBoardUrl;
  }

  /** Suivi modal : stage terminé calendairement — pas d'actions Trello API. */
  get followUpStageFinished(): boolean {
    return isStageFinishedByCalendarEndDate(this.followUpModal?.dateFin);
  }

  isInternshipStageFinished(internship: SupervisorInternship): boolean {
    return isStageFinishedByCalendarEndDate(internship.dateFin);
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

    if (this.isInternshipStageFinished(internship)) {
      this.followUpInfoMessage = 'Trello indisponible : stage terminé.';
      return;
    }

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
    if (this.isInternshipStageFinished(internship)) {
      this.errorMessage = 'Trello indisponible : stage terminé.';
      return;
    }
    this.trelloModalInternship = internship;
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
    if (this.isInternshipStageFinished(internship)) {
      const msg = 'Trello indisponible : stage terminé.';
      if (this.followUpModal?.id === internship.id) {
        this.followUpInfoMessage = msg;
      } else {
        this.errorMessage = msg;
      }
      return;
    }

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

  /** Tooltip explicite pour le bouton de validation du sujet (modale detail). */
  validateSubjectTooltip(internship: SupervisorInternship | null): string {
    if (!internship) return '';
    if (internship.statutSujet === 'VALIDEE') {
      return 'Le sujet de stage est déjà validé.';
    }
    if (!internship.sujet) {
      return "Aucun sujet de stage n'est renseigné.";
    }
    return 'Valider le sujet pour démarrer officiellement le stage';
  }

  /**
   * Validation officielle du sujet de stage par l'encadrant academique.
   * Reservee a ce role. Aucun refus n'est possible — seule la validation existe.
   */
  validateSubject(internship: SupervisorInternship): void {
    // Garde-fou : si déjà validé, ne pas appeler le backend inutilement.
    if (internship.statutSujet === 'VALIDEE') {
      this.errorMessage = 'Le sujet de stage est déjà validé.';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';

    this.supervisorService.validateSubject(internship.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Sujet de stage validé avec succès.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de valider le sujet.';
      }
    });
  }

  openMeetingModal(meeting?: SupervisorMeeting): void {
    if (!meeting && !this.canCreateWeeklyMeeting) {
      this.errorMessage = 'Seul un encadrant peut planifier une réunion hebdomadaire.';
      return;
    }
    if (meeting?.source === 'FINALE' && !this.canModifyMeeting(meeting)) {
      this.errorMessage = 'Vous ne pouvez pas modifier cette réunion finale.';
      return;
    }
    if (meeting && meeting.source !== 'FINALE' && !this.canModifyMeeting(meeting)) {
      this.errorMessage = 'La modification est refusée car la réunion commence dans moins de 24 heures.';
      return;
    }

    this.editingMeetingSource = meeting?.source ?? 'HEBDOMADAIRE';
    this.originalMeetingForEdit = meeting ?? null;

    this.meetingDraft = meeting
      ? {
          id: meeting.id,
          numReunion: meeting.numReunion,
          date: meeting.date,
          heure: meeting.heure,
          typeReunion: meeting.source === 'FINALE' ? 'FINALE' : 'HEBDOMADAIRE',
          observation: meeting.observation,
          compteRendu: meeting.compteRendu ?? '',
          stageId: meeting.stageId,
          participantIds: this.sanitizeMeetingParticipantIds(meeting.stageId, meeting.participantIds)
        }
      : this.emptyMeetingDraft();
    this.meetingModalOpen = true;
    if (this.isEditingFinalMeeting) {
      this.meetingParticipantGroups = this.buildMeetingParticipantGroupsFromMeeting(meeting!);
    } else {
      this.meetingParticipantGroups = [];
      this.meetingParticipantsError = '';
    }
  }

  onMeetingStageChange(): void {
    this.meetingParticipantGroups = [];
  }

  loadMeetingParticipantsForStage(stageId: number): void {
    if (!stageId) {
      this.meetingParticipantGroups = [];
      this.meetingParticipantsError = '';
      return;
    }

    this.loadingMeetingParticipants = true;
    this.meetingParticipantsError = '';
    this.supervisorService.getEligibleMeetingParticipants(stageId).pipe(timeout(15000)).subscribe({
      next: (items) => {
        this.loadingMeetingParticipants = false;
        this.meetingParticipantGroups = this.buildMeetingParticipantGroups(items);
        const allowedIds = new Set(items.map((item) => item.id));
        this.meetingDraft.participantIds = (this.meetingDraft.participantIds ?? []).filter((id) => allowedIds.has(id));
      },
      error: () => {
        this.loadingMeetingParticipants = false;
        this.meetingParticipantGroups = [];
        this.meetingParticipantsError = 'Impossible de charger les participants éligibles pour ce stage.';
      }
    });
  }

  get selectedMeetingParticipantsCount(): number {
    return this.meetingDraft.participantIds?.length ?? 0;
  }

  get meetingTypeLabel(): string {
    return this.isEditingFinalMeeting ? 'Réunion finale' : 'Réunion de suivi hebdomadaire';
  }

  get meetingModalTitle(): string {
    if (this.isEditingFinalMeeting) {
      return "Modifier l'horaire de la réunion finale";
    }
    return this.meetingDraft.id ? 'Modifier la réunion' : 'Planifier une réunion';
  }

  get selectedMeetingInternship(): SupervisorInternship | undefined {
    const stageId = Number(this.meetingDraft.stageId);
    if (!Number.isFinite(stageId) || stageId <= 0) {
      return undefined;
    }
    return this.internships.find((item) => item.id === stageId);
  }

  /** Borne min : (now + 24 h) ou début du stage si plus tardif — aligné backend. */
  get meetingDateMinIso(): string {
    const earliest = earliestSchedulableMeetingDateIso();
    const stageStart = this.selectedMeetingInternship?.dateDebut?.trim();
    if (stageStart && /^\d{4}-\d{2}-\d{2}$/.test(stageStart)) {
      return maxIsoDate(earliest, stageStart);
    }
    return earliest;
  }

  /** Borne max : fin du stage sélectionné. */
  get meetingDateMaxIso(): string {
    const fin = this.selectedMeetingInternship?.dateFin?.trim();
    return fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) ? fin : '';
  }

  meetingDateFieldError(
    errors: ValidationErrors | null | undefined,
    date?: string | null
  ): string {
    if (errors?.['required']) {
      return 'Ce champ est obligatoire.';
    }
    const value = date?.trim();
    if (!value) {
      return strictFutureDateErrorMessage(errors);
    }
    if (!isSchedulableMeetingDate(value)) {
      return MEETING_MIN_SCHEDULE_DELAY_ERROR;
    }
    const stage = this.selectedMeetingInternship;
    if (stage && !isMeetingDateWithinStagePeriod(value, stage.dateDebut, stage.dateFin)) {
      return MEETING_OUTSIDE_STAGE_PERIOD_ERROR;
    }
    return strictFutureDateErrorMessage(errors);
  }

  openMeetingDetails(meeting: SupervisorMeeting): void {
    if (!this.isCurrentUserMeetingParticipant(meeting)) {
      return;
    }
    this.meetingDetailsModal = meeting;
  }

  saveMeeting(meetingForm?: NgForm): void {
    if (this.isEditingFinalMeeting) {
      if (!this.meetingDraft.heure) {
        this.errorMessage = "L'heure est obligatoire.";
        return;
      }
      if (!this.meetingDraft.id || !this.originalMeetingForEdit) {
        this.errorMessage = 'Réunion finale introuvable.';
        return;
      }
      this.isSaving = true;
      this.supervisorService
        .saveFinalMeetingSchedule(this.meetingDraft)
        .pipe(timeout(15000))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.successMessage = 'Horaire de la réunion finale mis à jour.';
            this.closeModals();
            this.loadAll();
          },
          error: (error) => {
            this.isSaving = false;
            this.errorMessage = this.extractErrorMessage(error, 'Impossible de modifier la réunion finale.');
          }
        });
      return;
    }

    meetingForm?.form.markAllAsTouched();

    if (!this.meetingDraft.date || !this.meetingDraft.heure) {
      this.errorMessage = 'La date et l\'heure sont obligatoires.';
      return;
    }

    if (!isSchedulableMeetingDate(this.meetingDraft.date)) {
      this.errorMessage = MEETING_MIN_SCHEDULE_DELAY_ERROR;
      return;
    }

    const stage = this.selectedMeetingInternship;
    if (
      stage &&
      !isMeetingDateWithinStagePeriod(this.meetingDraft.date, stage.dateDebut, stage.dateFin)
    ) {
      this.errorMessage = MEETING_OUTSIDE_STAGE_PERIOD_ERROR;
      return;
    }

    if (!isMeetingAtLeast24HoursAhead(this.meetingDraft)) {
      this.errorMessage = MEETING_MIN_SCHEDULE_DELAY_ERROR;
      return;
    }

    if (meetingForm && meetingForm.invalid) {
      this.errorMessage = 'Veuillez corriger les champs du formulaire.';
      return;
    }

    const stageId = Number(this.meetingDraft.stageId);
    if (!Number.isFinite(stageId) || stageId <= 0) {
      this.errorMessage = 'Veuillez sélectionner un stage.';
      return;
    }
    this.meetingDraft.stageId = stageId;

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
    if (!this.canAddOrEditObservationForMeeting(meeting)) {
      return;
    }
    this.reportModal = meeting;
    this.reportText = meeting.observation || '';
  }

  saveReport(): void {
    const meeting = this.reportModal;
    if (!meeting) return;

    const text = String(this.reportText ?? '').trim();
    if (!text) {
      this.errorMessage = "L'observation est obligatoire.";
      return;
    }

    const stage = this.internships.find((item) => item.id === meeting.stageId) ?? null;
    if (!this.isStagePeriodActiveForSupervision(stage)) {
      this.errorMessage =
        'Les observations ne sont possibles que pendant la période du stage (entre la date de début et la date de fin).';
      return;
    }

    this.isSaving = true;
    this.supervisorService.saveObservation(meeting.id, text).pipe(timeout(15000)).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Observation enregistrée.';
        this.closeModals();
        this.loadAll();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'observation.";
      }
    });
  }

  signAgreement(agreement: SupervisorAgreement): void {
    this.supervisorService.signAgreement(this.role, agreement.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.signatureSync.notifyStageUpdated(agreement.stageId);
        this.successMessage = 'Convention signée avec votre image de signature.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer la convention.';
      }
    });
  }

  /**
   * Signe le cahier de stage.
   * – Si une signature est déjà enregistrée dans le profil, elle est utilisée
   *   directement (aucune modale n'est ouverte).
   * – Sinon, la modale de capture de signature est affichée pour que
   *   l'utilisateur puisse dessiner ou uploader sa signature.
   */
  signLogbook(logbook: SupervisorLogbook): void {
    if (this.isLogbookSignedByMe(logbook)) {
      this.errorMessage = 'Vous avez déjà signé ce cahier.';
      return;
    }
    if (!this.canSignLogbook(logbook)) {
      const internship = this.internships.find((item) => item.id === logbook.stageId);
      this.errorMessage =
        getLogbookSignBlockedReason(internship?.dateFin, internship?.dateDebut, internship?.duree) ||
        'La signature du cahier de stage n\'est pas encore autorisee.';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';

    // Vérifier si une signature de profil est déjà disponible en cache.
    const savedSignature = this.currentUserProfileService.getCachedSignature();
    if (savedSignature?.trim()) {
      // Signature trouvée → signer directement sans ouvrir la modale.
      this.signingLogbookInProgress = true;
      this.supervisorService.signLogbook(this.role, logbook.id, savedSignature).pipe(timeout(15000)).subscribe({
        next: () => {
          this.signingLogbookInProgress = false;
          this.signatureSync.notifyStageUpdated(logbook.stageId);
          this.successMessage = 'Cahier signé avec succès. La signature de votre profil a été utilisée.';
          this.loadAll();
        },
        error: (error) => {
          this.signingLogbookInProgress = false;
          this.errorMessage = error?.error?.message ?? 'Impossible de signer le cahier.';
        }
      });
      return;
    }

    // Aucune signature enregistrée dans le profil → ouvrir la modale de capture.
    this.pendingSignLogbook = logbook;
  }

  /** Callback de la modale : envoie la signature au backend avec l'image obligatoire. */
  onSignatureCaptured(signatureImage: string): void {
    if (!this.pendingSignLogbook || !signatureImage) {
      return;
    }
    const logbook = this.pendingSignLogbook;
    this.signingLogbookInProgress = true;
    this.supervisorService.signLogbook(this.role, logbook.id, signatureImage).pipe(timeout(15000)).subscribe({
      next: () => {
        this.signingLogbookInProgress = false;
        this.pendingSignLogbook = null;
        this.signatureSync.notifyStageUpdated(logbook.stageId);
        this.successMessage = 'Cahier signé avec succès. La preuve visuelle a été enregistrée.';
        this.loadAll();
      },
      error: (error) => {
        this.signingLogbookInProgress = false;
        this.errorMessage = error?.error?.message ?? 'Impossible de signer le cahier.';
      }
    });
  }

  /** Callback de la modale : annulation utilisateur. */
  onSignatureCancelled(): void {
    if (this.signingLogbookInProgress) return;
    this.pendingSignLogbook = null;
  }

  openEvaluationModal(evaluation: SupervisorEvaluation): void {
    this.evaluationModal = evaluation;
    this.evaluationDraft = {
      pointFortEncadrantPro: evaluation.pointFortEncadrantPro ?? '',
      axeAmeliorationEncadrantPro: evaluation.axeAmeliorationEncadrantPro ?? '',
      notesAttribuees: []
    };
    this.professionalCriteriaDraft = buildRoleCriteriaDrafts(
      this.professionalCriteriaLabels,
      evaluation.notesAttribuees ?? []
    );

    this.syncProfessionalCriteriaFormArrayFromDrafts();
  }

  saveEvaluation(): void {
    if (!this.evaluationModal) return;
    if (this.isEvaluationPeriodLocked(this.evaluationModal)) {
      this.errorMessage = this.evaluationUnavailableMessage;
      return;
    }
    if (this.isEvaluationSubmittedReadOnly(this.evaluationModal)) {
      this.errorMessage = "L'évaluation est déjà soumise : modification impossible.";
      return;
    }
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

  saveEvaluationSheet(): void {
    if (!this.evaluationModal) return;
    if (this.isEvaluationPeriodLocked(this.evaluationModal)) {
      this.errorMessage = this.evaluationUnavailableMessage;
      return;
    }
    if (this.isEvaluationSubmittedReadOnly(this.evaluationModal)) {
      this.errorMessage = "L'évaluation est déjà soumise : consultation en lecture seule.";
      return;
    }
    if (!this.evaluationDraft.pointFortEncadrantPro.trim() || !this.evaluationDraft.axeAmeliorationEncadrantPro.trim()) {
      this.errorMessage = "Veuillez renseigner les points forts et les axes d'amélioration.";
      return;
    }
    if (!areAllCriteriaScoresValid(this.professionalCriteriaDraft)) {
      this.errorMessage = `Veuillez renseigner les ${this.professionalCriteriaLabels.length} notes (0 à 5).`;
      return;
    }

    const notesPayload = buildNotesPayloadFromDrafts(this.professionalCriteriaDraft);
    this.isSaving = true;
    this.supervisorService.fillProfessionalEvaluation(this.evaluationModal.id, this.userId, this.evaluationDraft).pipe(timeout(15000)).subscribe({
      next: () => {
        this.supervisorService.saveEvaluationNotes(this.evaluationModal!.id, this.userId, notesPayload).pipe(timeout(15000)).subscribe({
          next: () => {
            this.isSaving = false;
            this.successMessage = "Évaluation enregistrée avec succès.";
            this.closeModals();
            this.loadAll();
          },
          error: (error) => {
            this.isSaving = false;
            this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer les notes d'évaluation.";
          }
        });
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'évaluation.";
      }
    });
  }

  signEvaluation(evaluation: SupervisorEvaluation): void {
    if (this.isEvaluationPeriodLocked(evaluation)) {
      this.errorMessage = this.evaluationUnavailableMessage;
      return;
    }
    if (!this.canSignEvaluation(evaluation)) {
      this.errorMessage = this.evaluationSignIncompleteMessage;
      return;
    }
    if (this.isEvaluationSubmittedReadOnly(evaluation)) {
      this.errorMessage = "L'évaluation est déjà soumise : action non autorisée.";
      return;
    }
    this.supervisorService.signEvaluation(evaluation.id, this.userId).pipe(timeout(15000)).subscribe({
      next: () => {
        this.signatureSync.notifyStageUpdated(evaluation.stageId);
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
    this.notificationService.markAsRead(notification.id).pipe(timeout(15000)).subscribe({
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
      error: async (error) => {
        pdfWindow?.close();
        this.errorMessage = await readApiErrorMessage(error, "Impossible d'ouvrir le PDF.");
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
    this.trelloModalInternship = null;
    this.meetingModalOpen = false;
    this.editingMeetingSource = null;
    this.originalMeetingForEdit = null;
    this.meetingParticipantGroups = [];
    this.loadingMeetingParticipants = false;
    this.meetingParticipantsError = '';
    this.meetingDetailsModal = null;
    this.reportModal = null;
    this.evaluationModal = null;
    this.showProfessionalEvaluationModal = false;
    this.showSubmitEvaluationConfirm = false;
    this.docDetailsModal = null;
  }

  get evaluationModalInternship(): SupervisorInternship | null {
    return this.evaluationModal
      ? (this.internships.find((i) => i.id === this.evaluationModal!.stageId) ?? null)
      : null;
  }

  getDocStatusLabel(status: SupervisorStageDocumentStatus | null): string {
    if (!status) return 'Non disponible';
    const apiStatut = String(status.statut ?? '').trim();
    if (apiStatut === 'En préparation' || apiStatut === 'En preparation') return 'En préparation';
    if (status.disponible && status.genere) return 'Généré';
    if (status.disponible) return 'Disponible';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'À remplir';
  }

  getDocStatusBadgeClass(status: SupervisorStageDocumentStatus | null): string {
    if (!status) return 'status-neutral';
    const label = this.getDocStatusLabel(status);
    if (label === 'Disponible' || label === 'Généré') return 'status-positive';
    if (label === 'En préparation') return 'status-neutral';
    if (label === 'À remplir' || label === 'Non disponible') return 'status-neutral';
    return 'status-warning';
  }

  getEvalStatusLabel(evaluation: SupervisorEvaluation): string {
    if (evaluation.signaturesCompletes) return 'Signé';
    if (evaluation.verrouillee) return 'Verrouillée';
    if (evaluation.pretSignatureEncadrantProfessionnel) return 'Votre partie complète';
    if (evaluation.donneesCompletes) return 'Complète';
    return 'À remplir';
  }

  getEvalStatusBadgeClass(evaluation: SupervisorEvaluation): string {
    if (evaluation.signaturesCompletes) return 'status-positive';
    if (evaluation.pretSignatureEncadrantProfessionnel || evaluation.donneesCompletes) return 'status-info';
    if (evaluation.verrouillee) return 'status-warning';
    return 'status-neutral';
  }

  private createEmptyProfessionalCriteria(): ProfessionalCriterionDraft[] {
    return buildRoleCriteriaDrafts(this.professionalCriteriaLabels);
  }

  private syncProfessionalCriteriaFormArrayFromDrafts(): void {
    this.professionalCriteriaFormArraySub?.unsubscribe();
    this.professionalCriteriaFormArraySub = undefined;

    this.professionalCriteriaFormArray.clear();

    for (const item of this.professionalCriteriaDraft) {
      this.professionalCriteriaFormArray.push(new FormControl<number | null>(item.note ?? null));
    }

    this.professionalCriteriaFormArraySub = this.professionalCriteriaFormArray.valueChanges.subscribe((values) => {
      values.forEach((rawValue, index) => {
        if (!this.professionalCriteriaDraft[index]) return;
        const parsed = rawValue == null ? NaN : Number(rawValue);
        this.professionalCriteriaDraft[index].note = Number.isFinite(parsed)
          ? Math.min(5, Math.max(0, parsed))
          : null;
      });
    });
  }

  private onProfessionalEvaluationStageChange(stageId: number | null): void {
    this.selectedProfessionalEvaluationStageId = stageId;
    this.showSubmitEvaluationConfirm = false;
    this.populateProfessionalEvaluationFormFromSelection();
  }

  private syncProfessionalEvaluationSelection(): void {
    if (this.role !== 'ENCADRANT_PROFESSIONNEL') {
      return;
    }

    const internships = this.professionalEvaluationInternships;
    if (!internships.length) {
      this.selectedProfessionalEvaluationStageId = null;
      this.professionalEvaluationForm.patchValue(
        { stageId: null, commentairePrincipal: '', remarquesSupplementaires: '' },
        { emitEvent: false }
      );
      this.professionalCriteriaDraft = this.createEmptyProfessionalCriteria();
      this.syncProfessionalCriteriaFormArrayFromDrafts();
      return;
    }

    const current = this.selectedProfessionalEvaluationStageId;
    if (current != null && internships.some((item) => item.id === current)) {
      this.professionalEvaluationForm.patchValue({ stageId: current }, { emitEvent: true });
      return;
    }

    const firstSigned = internships.find((item) => {
      const evaluation = this.evaluationsByStage.get(item.id);
      return !!evaluation && !this.isEvaluationSignedByMe(evaluation);
    });
    const targetStageId = internships.length === 1
      ? internships[0].id
      : (firstSigned?.id ?? internships[0].id);
    this.professionalEvaluationForm.patchValue({ stageId: targetStageId }, { emitEvent: true });
  }

  private populateProfessionalEvaluationFormFromSelection(): void {
    const evaluation = this.selectedProfessionalEvaluation;
    if (!evaluation) {
      this.professionalEvaluationForm.patchValue(
        { commentairePrincipal: '', remarquesSupplementaires: '' },
        { emitEvent: false }
      );
      this.professionalCriteriaDraft = this.createEmptyProfessionalCriteria();
      this.syncProfessionalCriteriaFormArrayFromDrafts();
      return;
    }

    this.professionalEvaluationForm.patchValue(
      {
        commentairePrincipal: evaluation.pointFortEncadrantPro || '',
        remarquesSupplementaires: evaluation.axeAmeliorationEncadrantPro || ''
      },
      { emitEvent: false }
    );

    this.professionalCriteriaDraft = buildRoleCriteriaDrafts(
      this.professionalCriteriaLabels,
      evaluation.notesAttribuees ?? []
    );

    this.syncProfessionalCriteriaFormArrayFromDrafts();
  }

  private areProfessionalCriteriaFilled(): boolean {
    return areAllCriteriaScoresValid(this.professionalCriteriaDraft);
  }

  private toProfessionalNotesPayload(): EvaluationNoteDto[] {
    return buildNotesPayloadFromDrafts(this.professionalCriteriaDraft);
  }

  private persistProfessionalEvaluation(withSubmit: boolean): void {
    const evaluation = this.selectedProfessionalEvaluation;
    if (!evaluation) {
      this.errorMessage = "Aucune fiche d'évaluation n'est disponible pour ce stage.";
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const commentairePrincipal = String(this.professionalEvaluationForm.get('commentairePrincipal')?.value ?? '').trim();
    const remarques = String(this.professionalEvaluationForm.get('remarquesSupplementaires')?.value ?? '').trim();
    const axes = remarques || commentairePrincipal;
    const notesPayload = this.toProfessionalNotesPayload();

    this.supervisorService
      .fillProfessionalEvaluation(evaluation.id, this.userId, {
        pointFortEncadrantPro: commentairePrincipal,
        axeAmeliorationEncadrantPro: axes
      })
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.supervisorService
            .saveEvaluationNotes(evaluation.id, this.userId, notesPayload)
            .pipe(timeout(15000))
            .subscribe({
              next: () => {
                if (!withSubmit) {
                  this.isSaving = false;
                  this.successMessage = 'Brouillon enregistré avec succès.';
                  this.loadAll();
                  return;
                }
                this.supervisorService.signEvaluation(evaluation.id, this.userId).pipe(timeout(15000)).subscribe({
                  next: () => {
                    this.isSaving = false;
                    this.successMessage = 'Évaluation soumise et signée avec succès.';
                    this.loadAll();
                  },
                  error: (error) => {
                    this.isSaving = false;
                    this.errorMessage = error?.error?.message ?? 'Brouillon enregistré, mais signature impossible.';
                    this.loadAll();
                  }
                });
              },
              error: (error) => {
                this.isSaving = false;
                this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer les notes d'évaluation.";
              }
            });
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'évaluation.";
        }
      });
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
        this.syncProfessionalEvaluationSelection();
        this.lastUpdatedAt = new Date();
        this.isLoading = false;
        this.startLiveSignatureSync();
      },
      error: () => {
        this.errorMessage = 'Certaines données associées ne sont pas disponibles pour le moment.';
        this.isLoading = false;
      }
    });
  }

  private startLiveSignatureSync(): void {
    if (this.liveSignatureSyncStarted || !this.internships.length) {
      return;
    }
    this.liveSignatureSyncStarted = true;
    const stageIds = this.internships.map((item) => item.id);

    this.signatureSync
      .watchMultipleSignatureBundles(stageIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshSignatureDataSilent();
      });
  }

  private refreshSignatureDataSilent(): void {
    if (!this.internships.length) {
      return;
    }

    forkJoin({
      agreements: this.loadAgreements(this.internships),
      logbooks: this.loadLogbooks(this.internships),
      evaluations:
        this.role === 'ENCADRANT_PROFESSIONNEL' ? this.loadEvaluations(this.internships) : of([]),
      documentStatuses: this.loadDocumentStatuses(this.internships),
    })
      .pipe(timeout(15000))
      .subscribe({
        next: ({ agreements, logbooks, evaluations, documentStatuses }) => {
          this.agreementsByStage = new Map(agreements.map((item) => [item.stageId, item]));
          this.logbooksByStage = new Map(logbooks.map((item) => [item.stageId, item]));
          this.evaluationsByStage = new Map(evaluations.map((item) => [item.stageId, item]));
          this.documentStatusesByStage = new Map(documentStatuses.map((item) => [item.stageId, item]));
          this.syncProfessionalEvaluationSelection();
          this.lastUpdatedAt = new Date();
        },
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
    const eligible = filterInternshipsForStageDocuments(internships);
    if (!eligible.length) return of([] as SupervisorStageDocumentsOverview[]);
    return forkJoin(
      eligible.map((item) =>
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

  getSignatureActors(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): StageSignatureActorView[] {
    const status =
      type === 'convention'
        ? this.getConventionStatus(stageId)
        : type === 'fiche-evaluation'
          ? this.getEvaluationStatus(stageId)
          : this.getLogbookStatus(stageId);
    return signatoriesFromDocumentStatus(status);
  }

  getSignatureCardSummary(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): string {
    return stageSignatureCardSummary(this.getSignatureActors(stageId, type));
  }

  /** Ouvre la fenêtre de détails d'un document de stage. */
  openDocDetails(
    titre: string,
    status: SupervisorStageDocumentStatus | null,
    stageId: number,
    docType: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): void {
    if (!status) {
      return;
    }
    this.docDetailsModal = { titre, status, stageId, docType };
  }

  private buildSignContext(
    internship: SupervisorInternship,
    docType: StageDocumentSignType,
    options: {
      documentId?: number | null;
      alreadySignedByMe?: boolean;
      status?: SupervisorStageDocumentStatus | null;
      evaluationReadyForSign?: boolean;
    } = {}
  ): StageDocumentSignButtonContext {
    const status =
      options.status ??
      (docType === 'convention'
        ? this.getConventionStatus(internship.id)
        : docType === 'fiche-evaluation'
          ? this.getEvaluationStatus(internship.id)
          : this.getLogbookStatus(internship.id));
    const conventionId =
      docType === 'convention' ? options.documentId ?? status?.documentId ?? null : null;
    return {
      documentType: docType,
      userRole: this.role,
      status: status ?? undefined,
      documentId: docType === 'convention' ? conventionId : options.documentId ?? status?.documentId ?? null,
      conventionId,
      alreadySignedByMe: options.alreadySignedByMe,
      dateFin: internship.dateFin,
      dateDebut: internship.dateDebut,
      dureeMonths: internship.duree ?? null,
      stageStatut: internship.statut ?? null,
      generationAutorisee: status?.generationAutorisee,
      evaluationReadyForSign: options.evaluationReadyForSign,
      isActing: this.isSaving,
    };
  }

  initializeConvention(internship: SupervisorInternship): void {
    this.isSaving = true;
    this.supervisorService.generateStageDocument(internship.id, 'convention').subscribe({
      next: () => {
        this.signatureSync.notifyStageUpdated(internship.id);
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
      },
    });
  }

  private isEvaluationReadyForSignByRole(evaluation: SupervisorEvaluation): boolean {
    if (this.role !== 'ENCADRANT_PROFESSIONNEL') {
      return false;
    }
    const drafts =
      this.evaluationModal?.id === evaluation.id ? this.professionalCriteriaDraft : undefined;
    return isEncadrantProfessionnelPartReadyForSign(evaluation, drafts);
  }

  buildConventionSignContextPublic(
    internship: SupervisorInternship,
    agreement: SupervisorAgreement | null | undefined
  ): StageDocumentSignButtonContext {
    const status = this.getConventionStatus(internship.id);
    return this.buildSignContext(internship, 'convention', {
      documentId: agreement?.id ?? status?.documentId ?? null,
      status,
      alreadySignedByMe: agreement ? this.isAgreementSignedByMe(agreement) : false,
    });
  }

  buildLogbookSignContextPublic(
    internship: SupervisorInternship,
    logbook: SupervisorLogbook | null | undefined
  ): StageDocumentSignButtonContext {
    return this.buildSignContext(internship, 'cahier-stage', {
      documentId: logbook?.id ?? null,
      alreadySignedByMe: logbook ? this.isLogbookSignedByMe(logbook) : false,
    });
  }

  buildEvaluationSignContextPublic(
    internship: SupervisorInternship,
    evaluation: SupervisorEvaluation | null | undefined
  ): StageDocumentSignButtonContext {
    return this.buildSignContext(internship, 'fiche-evaluation', {
      documentId: evaluation?.id ?? null,
      alreadySignedByMe: evaluation ? this.isEvaluationSignedByMe(evaluation) : false,
      evaluationReadyForSign: evaluation ? this.isEvaluationReadyForSignByRole(evaluation) : false,
    });
  }

  showEvaluationSignBlockedHint(
    internship: SupervisorInternship,
    evaluation: SupervisorEvaluation | null | undefined
  ): boolean {
    if (!evaluation) {
      return false;
    }
    const ctx = this.buildEvaluationSignContextPublic(internship, evaluation);
    return shouldShowStageDocumentSignButton(ctx) && isStageDocumentSignButtonDisabled(ctx);
  }

  /** Vrai si la convention est déjà signée par l'encadrant connecté (selon son rôle). */
  isAgreementSignedByMe(agreement: SupervisorAgreement): boolean {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? agreement.signeeEncAca : agreement.signeeEncPro;
  }

  /** Vrai si le cahier de stage est déjà signé par l'encadrant connecté (selon son rôle). */
  isLogbookSignedByMe(logbook: SupervisorLogbook): boolean {
    return this.role === 'ENCADRANT_ACADEMIQUE' ? logbook.signeeEncAcad : logbook.signeeEncPro;
  }

  canSignLogbook(logbook: SupervisorLogbook | null | undefined): boolean {
    if (!logbook?.id) {
      return false;
    }
    const internship = this.internships.find((item) => item.id === logbook.stageId);
    return canSignLogbookByRules({
      dateFin: internship?.dateFin,
      dateDebut: internship?.dateDebut,
      dureeMonths: internship?.duree ?? null,
      alreadySigned: this.isLogbookSignedByMe(logbook),
      hasDocument: true,
    });
  }

  getLogbookSignTooltip(logbook: SupervisorLogbook): string {
    if (this.isLogbookSignedByMe(logbook)) {
      return 'Vous avez déjà signé ce cahier';
    }
    if (this.canSignLogbook(logbook)) {
      return 'Signer le cahier de stage';
    }
    const internship = this.internships.find((item) => item.id === logbook.stageId);
    return (
      getLogbookSignBlockedReason(internship?.dateFin, internship?.dateDebut, internship?.duree) ||
      'La signature du cahier de stage n\'est pas encore autorisee.'
    );
  }

  /** Vrai si la fiche d'évaluation est déjà signée par l'encadrant professionnel (seul signataire encadrant). */
  isEvaluationSignedByMe(evaluation: SupervisorEvaluation): boolean {
    return !!evaluation.signatureEncadrantProfessionnel;
  }

  /** Titre lisible d'une section de documents (remplace la logique ternaire du template). */
  getDocumentTableTitle(type: string): string {
    switch (type) {
      case 'cahier':
        return 'Cahier de stage';
      case 'conventions':
        return 'Conventions';
      case 'evaluations':
        return 'Fiches d’évaluation';
      default:
        return 'Documents';
    }
  }

  private emptyMeetingDraft(): SupervisorMeetingPayload {
    return {
      date: '',
      heure: '',
      typeReunion: 'HEBDOMADAIRE',
      observation: '',
      compteRendu: '',
      stageId: this.internships[0]?.id ?? 0,
      participantIds: []
    };
  }

  private buildMeetingParticipantGroupsFromMeeting(meeting: SupervisorMeeting): MeetingParticipantGroup[] {
    const internship = this.internships.find((item) => item.id === meeting.stageId);
    if (!internship) {
      return [];
    }
    const items: MeetingEligibleParticipant[] = [];
    if (meeting.participantIds?.includes(internship.student.id ?? -1) && internship.student.id) {
      items.push({
        id: internship.student.id,
        fullName: internship.student.fullName || 'Stagiaire',
        email: internship.student.email,
        role: 'STAGIAIRE',
        roleLabel: 'Stagiaire'
      });
    }
    if (meeting.participantIds?.includes(internship.academicSupervisor.id ?? -1) && internship.academicSupervisor.id) {
      items.push({
        id: internship.academicSupervisor.id,
        fullName: internship.academicSupervisor.fullName || 'Encadrant académique',
        email: internship.academicSupervisor.email,
        role: 'ENCADRANT_ACADEMIQUE',
        roleLabel: 'Encadrant académique'
      });
    }
    if (meeting.participantIds?.includes(internship.professionalSupervisor.id ?? -1) && internship.professionalSupervisor.id) {
      items.push({
        id: internship.professionalSupervisor.id,
        fullName: internship.professionalSupervisor.fullName || 'Encadrant professionnel',
        email: internship.professionalSupervisor.email,
        role: 'ENCADRANT_PROFESSIONNEL',
        roleLabel: 'Encadrant professionnel'
      });
    }
    return this.buildMeetingParticipantGroups(items);
  }

  private buildMeetingParticipantGroups(items: MeetingEligibleParticipant[]): MeetingParticipantGroup[] {
    const groups: Array<{ key: string; label: string }> = [
      { key: 'STAGIAIRE', label: 'Stagiaire' },
      { key: 'ENCADRANT_ACADEMIQUE', label: 'Encadrant académique' },
      { key: 'ENCADRANT_PROFESSIONNEL', label: 'Encadrant professionnel' }
    ];

    return groups
      .map((group) => ({
        key: group.key,
        label: group.label,
        participants: items.filter((item) => item.role === group.key)
      }))
      .filter((group) => group.participants.length > 0);
  }

  private sanitizeMeetingParticipantIds(stageId: number, participantIds: number[] | undefined): number[] {
    const blockedId = this.internships.find((item) => item.id === stageId)?.companySupervisor?.id ?? null;
    return (participantIds ?? []).filter((id) => id && id !== blockedId);
  }

  toggleMeetingParticipant(participantId: number, checked: boolean): void {
    const blockedId = this.internships.find((item) => item.id === this.meetingDraft.stageId)?.companySupervisor?.id ?? null;
    if (participantId === blockedId) {
      return;
    }

    const currentIds = Array.isArray(this.meetingDraft.participantIds) ? [...this.meetingDraft.participantIds] : [];
    const uniqueIds = new Set(currentIds);
    if (checked) {
      uniqueIds.add(participantId);
    } else {
      uniqueIds.delete(participantId);
    }
    this.meetingDraft.participantIds = Array.from(uniqueIds);
  }

  isMeetingParticipantSelected(participantId: number): boolean {
    return Array.isArray(this.meetingDraft.participantIds) && this.meetingDraft.participantIds.includes(participantId);
  }

  getSelectedMeetingStage(): SupervisorInternship | null {
    return this.internships.find((item) => item.id === this.meetingDraft.stageId) ?? null;
  }

  private isMeetingDateWithinSelectedStage(): boolean {
    const stage = this.getSelectedMeetingStage();
    if (!stage?.dateDebut || !stage?.dateFin || !this.meetingDraft.date) {
      return false;
    }

    return this.meetingDraft.date >= stage.dateDebut && this.meetingDraft.date <= stage.dateFin;
  }

  /** Vrai si la date du jour est dans [dateDebut, dateFin] du stage (observations / suivi). */
  isStagePeriodActiveForSupervision(internship: SupervisorInternship | null | undefined): boolean {
    if (!internship) {
      return false;
    }
    return isSupervisionPeriodOpen(internship.dateDebut, internship.dateFin, internship.duree);
  }

  /** Encadrant académique ou professionnel : observation sur ses propres réunions hebdomadaires créées. */
  canAddOrEditObservationForMeeting(meeting: SupervisorMeeting | null | undefined): boolean {
    if (!meeting || !meetingShowsObservation(meeting) || !this.userId) {
      return false;
    }
    if (!this.isCurrentUserMeetingCreator(meeting)) {
      return false;
    }
    const stage = this.internships.find((item) => item.id === meeting.stageId) ?? null;
    return this.isStagePeriodActiveForSupervision(stage);
  }

  private isMeetingDelayRespected(date: string, heure: string): boolean {
    const timestamp = Date.parse(`${date}T${heure}`);
    if (Number.isNaN(timestamp)) {
      return false;
    }

    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    return timestamp - Date.now() >= twentyFourHoursInMs;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
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
