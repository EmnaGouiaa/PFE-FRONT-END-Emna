import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyEvaluationsService } from '../../services/company/company-evaluations.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { CompanyContext, CompanyEvaluation, CompanyInternship, CompanyMeeting } from '../../services/company/company.models';
import {
  EVALUATION_UNAVAILABLE_MESSAGE,
  getStagePeriodOpenDate,
  isEvaluationAccessible
} from '../../services/stage-period.utils';
import {
  areAllCriteriaScoresValid,
  EVALUATION_SIGN_INCOMPLETE_MESSAGE,
  isResponsableEntreprisePartReadyForSign,
  buildNotesPayloadFromDrafts,
  buildRoleCriteriaDrafts,
  countScoredCriteriaForRole,
  finalScoreOnFiveFromNotes,
  formatFinalScoreOnFive,
  mergeRoleDraftsWithFicheNotes,
  RESPONSABLE_ENTREPRISE_CRITERIA,
  RoleCriterionDraft
} from '../../utils/evaluation-criteria.util';

@Component({
  selector: 'app-company-evaluations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './company-evaluations.component.html',
  styleUrls: ['../company-shared.css', '../../supervisor/supervisor-shared.css', './company-evaluations.component.css']
})
export class CompanyEvaluationsPageComponent implements OnInit {
  readonly EVALUATION_UNAVAILABLE_MESSAGE = EVALUATION_UNAVAILABLE_MESSAGE;
  readonly EVALUATION_SIGN_INCOMPLETE_MESSAGE = EVALUATION_SIGN_INCOMPLETE_MESSAGE;
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  meetings: CompanyMeeting[] = [];
  evaluations: CompanyEvaluation[] = [];
  selectedEvaluation: CompanyEvaluation | null = null;
  evaluationForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  showSubmitConfirm = false;
  showEvaluationModal = false;
  searchTerm = '';
  statusFilter = 'ALL';
  readonly fixedCriteriaLabels = [...RESPONSABLE_ENTREPRISE_CRITERIA];
  fixedCriteriaDrafts: RoleCriterionDraft[] = this.createEmptyFixedCriteria();
  fixedCriteriaFormArray = new FormArray<FormControl<number | null>>([]);
  private fixedCriteriaFormArraySub?: Subscription;

  get modalFinalScoreOnFive(): number {
    return finalScoreOnFiveFromNotes(
      mergeRoleDraftsWithFicheNotes(
        this.fixedCriteriaDrafts,
        this.selectedEvaluation?.notesAttribuees ?? [],
        this.fixedCriteriaLabels
      )
    );
  }

  formatEvaluationFinalScore(score: number | null | undefined): string {
    return formatFinalScoreOnFive(score);
  }

  formatEvaluationCardFinalScore(evaluation: CompanyEvaluation): string {
    return formatFinalScoreOnFive(evaluation.noteFinale);
  }

  countResponsableCriteriaScored(evaluation: CompanyEvaluation): number {
    return countScoredCriteriaForRole(this.fixedCriteriaLabels, evaluation.notesAttribuees ?? []);
  }

  /** Vrai si au moins un stage est rattaché à l'entreprise. */
  get hasInternships(): boolean {
    return this.internships.length > 0;
  }

  get filteredInternships(): CompanyInternship[] {
    const query = this.normalize(this.searchTerm);
    return this.internships.filter((internship) => {
      const evaluation = this.getEvaluationForStage(internship.id);
      const completion = evaluation ? this.getCompletionLabel(evaluation) : 'Non commencée';
      const statusMatches = this.statusFilter === 'ALL' || completion === this.statusFilter;
      const haystack = this.normalize([
        internship.stagiaireNom,
        internship.stagiaireEmail,
        internship.titre,
        internship.sujet,
        internship.statut,
        internship.encadrantProfessionnelNom,
        internship.tuteurEntrepriseNom
      ].join(' '));
      return statusMatches && (!query || haystack.includes(query));
    });
  }

  get uniqueStatuses(): string[] {
    return ['Non commencée', 'En cours', 'Complétée', 'Signée (partielle)', 'Signée'];
  }

  /** Identifiant du stage actuellement sélectionné dans le formulaire. */
  get currentStageId(): number | null {
    const value = this.evaluationForm?.get('stageId')?.value;
    return value != null && value !== '' ? Number(value) : null;
  }

  /** Stage (internship) correspondant à la sélection courante, pour l'affichage des informations. */
  get selectedInternship(): CompanyInternship | null {
    const id = this.currentStageId;
    return id != null ? (this.internships.find((item) => item.id === id) ?? null) : null;
  }

  /** Vrai si la période d'évaluation est ouverte pour le stage sélectionné. */
  get currentPeriodOpen(): boolean {
    const id = this.currentStageId;
    return id != null ? this.isEvaluationPeriodOpen(id) : false;
  }

  /** Vrai si la saisie est verrouillée (période fermée OU fiche déjà signée/verrouillée). */
  get isCurrentLocked(): boolean {
    if (!this.currentPeriodOpen) return true;
    // Tant que la fiche n'est pas initialisée (selectedEvaluation = null),
    // on bloque la saisie pour éviter un enregistrement impossible côté backend.
    if (!this.selectedEvaluation) return true;
    return this.isReadOnly(this.selectedEvaluation);
  }

  /** Affichage de la note finale (sur 5) ou message si non calculée. */
  get noteFinaleDisplay(): string {
    return formatFinalScoreOnFive(this.selectedEvaluation?.noteFinale ?? null);
  }

  /** Libellé de signature réutilisable. */
  signatureLabel(signed: unknown): string {
    return signed ? 'Signée' : 'En attente';
  }

  /** Note finale d'une fiche pour la liste (évite un ternaire inline). */
  noteFinaleListLabel(evaluation: CompanyEvaluation): string {
    return formatFinalScoreOnFive(evaluation.noteFinale);
  }

  /** Titre lisible d'un stage (évite un ternaire inline dans le template). */
  internshipLabel(internship: CompanyInternship): string {
    return internship.titre || internship.sujet || `Stage #${internship.id}`;
  }

  /** Titre d'une fiche pour la liste. */
  evaluationTitle(evaluation: CompanyEvaluation): string {
    return evaluation.stageTitre || `Stage #${evaluation.stageId}`;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyEvaluationsService: CompanyEvaluationsService,
    private companyMeetingsService: CompanyMeetingsService
  ) {}

  ngOnInit(): void {
    this.evaluationForm = this.fb.group({
      stageId: [null, Validators.required],
      pointFortResponsableEntreprise: ['', [Validators.required, Validators.minLength(4)]],
      axeAmeliorationResponsableEntreprise: ['']
    });

    this.evaluationForm.get('stageId')?.valueChanges.subscribe((stageId) => {
      const stageIdNumber = Number(stageId ?? 0);
      const existing = this.evaluations.find((item) => item.stageId === stageIdNumber) ?? null;
      this.selectedEvaluation = existing;

      if (existing) {
        this.fillForm(existing);
      } else {
        this.fixedCriteriaDrafts = this.createEmptyFixedCriteria();
        this.syncFixedCriteriaFormArrayFromDrafts();
        this.setReadOnlyMode(!this.isEvaluationPeriodOpen(stageIdNumber));
        this.evaluationForm.patchValue(
          {
            pointFortResponsableEntreprise: '',
            axeAmeliorationResponsableEntreprise: ''
          },
          { emitEvent: false }
        );
      }
    });

    this.syncFixedCriteriaFormArrayFromDrafts();
    this.loadEvaluations();
  }

  loadEvaluations(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachée à ce compte.";
          this.isLoading = false;
          return;
        }

        forkJoin({
          internships: this.companyInternshipsService
            .listByEntreprise(context.responsable.entrepriseId)
            .pipe(timeout(15000)),
          meetings: this.companyMeetingsService
            .listForCurrentCompany()
            .pipe(timeout(15000), catchError(() => of([] as CompanyMeeting[])))
        }).subscribe({
          next: ({ internships, meetings }) => {
            this.internships = internships;
            this.meetings = meetings;

            if (internships.length === 0) {
              this.evaluations = [];
              this.selectedEvaluation = null;
              this.isLoading = false;
              return;
            }

            forkJoin(
              internships.map((internship) =>
                this.companyEvaluationsService.getByStageId(internship.id).pipe(
                  catchError(() => of(null))
                )
              )
            )
              .pipe(
                map((items) => items.filter((item): item is CompanyEvaluation => item !== null)),
                timeout(15000)
              )
              .subscribe({
                next: (evaluations) => {
                  this.evaluations = evaluations;
                  const fromQuery = Number(this.route.snapshot.queryParamMap.get('stageId'));
                  const queryStage =
                    Number.isFinite(fromQuery) && fromQuery > 0 && internships.some((i) => i.id === fromQuery)
                      ? fromQuery
                      : null;
                  const stageToSelect =
                    queryStage ?? evaluations[0]?.stageId ?? this.internships[0]?.id ?? null;
                  if (stageToSelect != null) {
                    // patchValue déclenche valueChanges qui remplit/réinitialise le formulaire.
                    this.evaluationForm.patchValue({ stageId: stageToSelect });
                  } else {
                    this.selectedEvaluation = null;
                  }
                  this.isLoading = false;
                },
                error: (error) => {
                  this.errorMessage = error?.error?.message ?? 'Impossible de charger les évaluations.';
                  this.isLoading = false;
                }
              });
          },
          error: (error) => {
            this.errorMessage = error?.error?.message ?? 'Impossible de charger les données.';
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  /** True si la date du jour est >= date de fin du stage. */
  isEvaluationPeriodOpen(stageId: number): boolean {
    const internship = this.internships.find((i) => i.id === stageId);
    return isEvaluationAccessible(internship?.statut ?? null, internship?.dateFin ?? null);
  }

  isEvaluationContentVisible(evaluation: CompanyEvaluation | null | undefined): boolean {
    if (!evaluation || evaluation.evaluationAccessible === false) {
      return false;
    }
    return this.isEvaluationPeriodOpen(evaluation.stageId);
  }

  /**
   * Retourne la date d'ouverture de la période (pour afficher "Disponible à partir du …").
   */
  getEvaluationOpenDate(stageId: number): Date | null {
    const internship = this.internships.find((i) => i.id === stageId);
    const finaleMeeting = this.meetings.find((m) => m.stageId === stageId && m.source === 'FINALE');
    return getStagePeriodOpenDate(internship?.dateFin ?? null, finaleMeeting?.date ?? null);
  }

  selectEvaluation(evaluation: CompanyEvaluation): void {
    this.selectedEvaluation = evaluation;
    this.fillForm(evaluation);
  }

  selectStageForEvaluation(stageId: number): void {
    const existing = this.evaluations.find((item) => item.stageId === stageId) ?? null;
    this.selectedEvaluation = existing;
    if (existing) {
      this.fillForm(existing);
    } else {
      this.fixedCriteriaDrafts = this.createEmptyFixedCriteria();
      this.setReadOnlyMode(!this.isEvaluationPeriodOpen(stageId));
      this.evaluationForm.patchValue(
        {
          stageId,
          pointFortResponsableEntreprise: '',
          axeAmeliorationResponsableEntreprise: ''
        },
        { emitEvent: false }
      );
    }
    this.showEvaluationModal = true;
  }

  closeEvaluationModal(): void {
    this.showEvaluationModal = false;
    this.showSubmitConfirm = false;
  }

  isReadOnly(evaluation: CompanyEvaluation | null = this.selectedEvaluation): boolean {
    if (!evaluation) return false;
    // Une fois soumise/signée par le RE, la partie devient définitivement en lecture seule.
    return Boolean(evaluation.verrouillee) || Boolean(evaluation.dateSignatureRepresentantEntreprise);
  }

  /** True si le RE peut signer (fiche complète, enregistrée, pas encore signée). */
  canSign(evaluation: CompanyEvaluation | null | undefined): boolean {
    if (!evaluation || evaluation.verrouillee || evaluation.dateSignatureRepresentantEntreprise) {
      return false;
    }
    const drafts =
      this.selectedEvaluation?.id === evaluation.id ? this.fixedCriteriaDrafts : undefined;
    return isResponsableEntreprisePartReadyForSign(evaluation, drafts);
  }

  canShowSignAction(evaluation: CompanyEvaluation | null | undefined): boolean {
    return !!evaluation && !evaluation.verrouillee && !evaluation.dateSignatureRepresentantEntreprise;
  }

  saveEvaluation(): void {
    if (!this.context) return;
    const stageId = Number(this.evaluationForm.get('stageId')?.value);
    if (!this.isEvaluationPeriodOpen(stageId)) {
      this.errorMessage = this.EVALUATION_UNAVAILABLE_MESSAGE;
      return;
    }
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      this.errorMessage = 'Minimum 4 caractères requis';
      return;
    }
    if (!this.areAllCriteriaValid()) {
      this.errorMessage = 'Toutes les notes doivent être renseignées entre 0 et 5.';
      return;
    }

    const payload = this.evaluationForm.getRawValue();
    payload.axeAmeliorationResponsableEntreprise =
      String(payload.axeAmeliorationResponsableEntreprise ?? '').trim()
      || String(payload.pointFortResponsableEntreprise ?? '').trim();
    const existing = this.evaluations.find((item) => item.stageId === payload.stageId);

    if (existing && this.isReadOnly(existing)) {
      this.errorMessage = 'Cette évaluation est verrouillée et ne peut plus être modifiée.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!existing) {
      this.companyEvaluationsService.getByStageId(payload.stageId).pipe(timeout(15000)).subscribe({
        next: (created) => {
          if (!created) {
            this.errorMessage =
              "La fiche d'évaluation n'est pas encore disponible pour ce stage (période non ouverte ou stage introuvable).";
            this.isSaving = false;
            return;
          }
          this.persistResponsableEvaluation(created, payload);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? "Impossible d'initialiser la fiche d'évaluation.";
          this.isSaving = false;
        }
      });
      return;
    }

    this.persistResponsableEvaluation(existing, payload);
  }

  private persistResponsableEvaluation(
    existing: CompanyEvaluation,
    payload: ReturnType<typeof this.evaluationForm.getRawValue>
  ): void {
    if (!this.context) {
      this.isSaving = false;
      return;
    }

    const request$ = this.companyEvaluationsService.fillResponsableSection(existing.id, this.context.userId, payload);

    request$.pipe(timeout(15000)).subscribe({
      next: (evaluation) => {
        const notePayload = buildNotesPayloadFromDrafts(this.fixedCriteriaDrafts);

        this.companyEvaluationsService
          .enregistrerNotePonctualite(evaluation.id, this.context!.userId, notePayload)
          .pipe(timeout(15000))
          .subscribe({
            next: (updated) => {
              this.successMessage = 'Brouillon enregistré avec succès.';
              this.isSaving = false;
              this.selectedEvaluation = updated;
              this.loadEvaluations();
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer les notes d'évaluation.";
              this.isSaving = false;
              this.selectedEvaluation = evaluation;
              this.loadEvaluations();
            }
          });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'évaluation.";
        this.isSaving = false;
      }
    });
  }

  requestSubmitEvaluation(): void {
    if (!this.showEvaluationModal) {
      return;
    }
    if (this.selectedEvaluation && this.isReadOnly(this.selectedEvaluation)) {
      this.errorMessage = "L'évaluation est déjà soumise : consultation en lecture seule.";
      return;
    }
    this.showSubmitConfirm = true;
  }

  cancelSubmitEvaluation(): void {
    this.showSubmitConfirm = false;
  }

  getEvaluationForStage(stageId: number): CompanyEvaluation | null {
    return this.evaluations.find((item) => item.stageId === stageId) ?? null;
  }

  getEvaluationActionLabel(internship: CompanyInternship): string {
    const evaluation = this.getEvaluationForStage(internship.id);
    if (!evaluation) return 'Évaluer';
    return this.isReadOnly(evaluation) ? 'Consulter' : 'Évaluer';
  }

  confirmSubmitEvaluation(): void {
    this.showSubmitConfirm = false;
    if (!this.selectedEvaluation || !this.context) return;
    if (!this.isEvaluationPeriodOpen(this.selectedEvaluation.stageId)) {
      this.errorMessage = this.EVALUATION_UNAVAILABLE_MESSAGE;
      return;
    }
    if (!this.canSign(this.selectedEvaluation)) {
      this.errorMessage = this.EVALUATION_SIGN_INCOMPLETE_MESSAGE;
      return;
    }
    if (this.isReadOnly(this.selectedEvaluation)) {
      this.errorMessage = "L'évaluation est déjà soumise : modification impossible.";
      return;
    }
    if (this.evaluationForm.invalid || !this.areAllCriteriaValid()) {
      this.evaluationForm.markAllAsTouched();
      this.errorMessage = 'Veuillez compléter la fiche avant soumission.';
      return;
    }

    const payload = this.evaluationForm.getRawValue();
    payload.axeAmeliorationResponsableEntreprise =
      String(payload.axeAmeliorationResponsableEntreprise ?? '').trim()
      || String(payload.pointFortResponsableEntreprise ?? '').trim();
    const notePayload = buildNotesPayloadFromDrafts(this.fixedCriteriaDrafts);

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyEvaluationsService.fillResponsableSection(this.selectedEvaluation.id, this.context.userId, payload)
      .pipe(timeout(15000))
      .subscribe({
        next: (evaluation) => {
          this.companyEvaluationsService.enregistrerNotePonctualite(evaluation.id, this.context!.userId, notePayload)
            .pipe(timeout(15000))
            .subscribe({
              next: () => {
                this.companyEvaluationsService.sign(evaluation.id, this.context!.userId)
                  .pipe(timeout(15000))
                  .subscribe({
                    next: () => {
                      this.isSaving = false;
                      this.successMessage = 'Évaluation soumise et signée avec succès.';
                      this.loadEvaluations();
                    },
                    error: (error) => {
                      this.isSaving = false;
                      this.errorMessage = error?.error?.message ?? 'Brouillon enregistré mais soumission impossible.';
                      this.loadEvaluations();
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

  signEvaluation(evaluation: CompanyEvaluation): void {
    if (!this.context) return;
    if (this.isReadOnly(evaluation)) {
      this.errorMessage = 'Cette évaluation est déjà signée ou verrouillée.';
      return;
    }

    this.companyEvaluationsService.sign(evaluation.id, this.context.userId).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Évaluation signée avec succès.';
        this.loadEvaluations();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer cette évaluation.';
      }
    });
  }

  getCompletionLabel(evaluation: CompanyEvaluation): string {
    if (!this.isEvaluationContentVisible(evaluation)) {
      return 'Indisponible';
    }
    if (evaluation.signaturesCompletes) return 'Signée';
    if (evaluation.dateSignatureRepresentantEntreprise) return 'Signée (partielle)';
    if (evaluation.donneesCompletes || evaluation.complete) return 'Complétée';
    if (
      evaluation.pointFortResponsableEntreprise ||
      evaluation.axeAmeliorationResponsableEntreprise ||
      evaluation.pointFortEncadrantPro ||
      evaluation.axeAmeliorationEncadrantPro
    ) {
      return 'En cours';
    }
    return 'Non commencée';
  }

  getCompletionBadgeClass(evaluation: CompanyEvaluation): string {
    const label = this.getCompletionLabel(evaluation);
    if (label === 'Signée') return 'status-positive';
    if (label === 'Signée (partielle)') return 'status-info';
    if (label === 'Complétée') return 'status-info';
    if (label === 'En cours') return 'status-warning';
    return 'status-neutral';
  }

  private fillForm(evaluation: CompanyEvaluation): void {
    this.setReadOnlyMode(this.isReadOnly(evaluation) || !this.isEvaluationPeriodOpen(evaluation.stageId));
    this.evaluationForm.patchValue(
      {
        stageId: evaluation.stageId,
        pointFortResponsableEntreprise: evaluation.pointFortResponsableEntreprise,
        axeAmeliorationResponsableEntreprise: evaluation.axeAmeliorationResponsableEntreprise
      },
      { emitEvent: false }
    );

    // Charger uniquement le critère Ponctualité (RE)
    this.fixedCriteriaDrafts = buildRoleCriteriaDrafts(this.fixedCriteriaLabels, evaluation.notesAttribuees ?? []);
    this.syncFixedCriteriaFormArrayFromDrafts();
  }

  private areAllCriteriaValid(): boolean {
    return areAllCriteriaScoresValid(this.fixedCriteriaDrafts);
  }

  private createEmptyFixedCriteria(): RoleCriterionDraft[] {
    return buildRoleCriteriaDrafts(this.fixedCriteriaLabels);
  }

  private syncFixedCriteriaFormArrayFromDrafts(): void {
    this.fixedCriteriaFormArraySub?.unsubscribe();
    this.fixedCriteriaFormArraySub = undefined;

    this.fixedCriteriaFormArray.clear();

    for (const item of this.fixedCriteriaDrafts) {
      this.fixedCriteriaFormArray.push(new FormControl<number | null>(item.note ?? null));
    }

    this.fixedCriteriaFormArraySub = this.fixedCriteriaFormArray.valueChanges.subscribe((values) => {
      values.forEach((rawValue, index) => {
        if (!this.fixedCriteriaDrafts[index]) return;
        const parsed = rawValue == null ? NaN : Number(rawValue);
        this.fixedCriteriaDrafts[index].note = Number.isFinite(parsed)
          ? Math.min(5, Math.max(0, parsed))
          : null;
      });
    });
  }

  private setReadOnlyMode(readOnly: boolean): void {
    const fields = ['pointFortResponsableEntreprise', 'axeAmeliorationResponsableEntreprise'];
    for (const field of fields) {
      const control = this.evaluationForm.get(field);
      if (!control) continue;
      if (readOnly) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }
}
