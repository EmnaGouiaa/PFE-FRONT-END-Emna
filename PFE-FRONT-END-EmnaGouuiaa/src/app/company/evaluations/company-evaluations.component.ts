import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyEvaluationsService } from '../../services/company/company-evaluations.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { CompanyContext, CompanyEvaluation, CompanyInternship, CompanyMeeting, EvaluationNoteDto } from '../../services/company/company.models';
import { isStagePeriodOpen, getStagePeriodOpenDate } from '../../services/stage-period.utils';

interface RpNoteDraft {
  critereLibelle: string;
  critereEvaluationId: number | null;
  note: number;
  poids: number;
  bareme: number;
  commentaire: string;
}

@Component({
  selector: 'app-company-evaluations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './company-evaluations.component.html',
  styleUrls: ['../company-shared.css', './company-evaluations.component.css']
})
export class CompanyEvaluationsPageComponent implements OnInit {
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

  // Critère Ponctualité (géré uniquement par le RE)
  noteDraftRE: RpNoteDraft = this.defaultNotePonctualite();

  get scorePondereRE(): number {
    const n = this.noteDraftRE;
    return n.bareme > 0 ? Math.round((n.note / n.bareme) * n.poids * 100) / 100 : 0;
  }

  /** Vrai si au moins un stage est rattaché à l'entreprise. */
  get hasInternships(): boolean {
    return this.internships.length > 0;
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
    return this.selectedEvaluation ? this.isReadOnly(this.selectedEvaluation) : false;
  }

  /** Affichage de la note finale (sur 20) ou message si non calculée. */
  get noteFinaleDisplay(): string {
    const note = this.selectedEvaluation?.noteFinale;
    return note != null ? `${note}/20` : 'Non calculée';
  }

  /** Libellé de signature réutilisable. */
  signatureLabel(signed: unknown): string {
    return signed ? 'Signée' : 'En attente';
  }

  /** Note finale d'une fiche pour la liste (évite un ternaire inline). */
  noteFinaleListLabel(evaluation: CompanyEvaluation): string {
    return evaluation.noteFinale != null ? String(evaluation.noteFinale) : '—';
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
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyEvaluationsService: CompanyEvaluationsService,
    private companyMeetingsService: CompanyMeetingsService
  ) {}

  ngOnInit(): void {
    this.evaluationForm = this.fb.group({
      stageId: [null, Validators.required],
      pointFortResponsableEntreprise: ['', [Validators.required, Validators.minLength(3)]],
      axeAmeliorationResponsableEntreprise: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.evaluationForm.get('stageId')?.valueChanges.subscribe((stageId) => {
      const stageIdNumber = Number(stageId ?? 0);
      const existing = this.evaluations.find((item) => item.stageId === stageIdNumber) ?? null;
      this.selectedEvaluation = existing;

      if (existing) {
        this.fillForm(existing);
      } else {
        this.noteDraftRE = this.defaultNotePonctualite();
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
                  // Auto-sélection : on cible la fiche existante si elle existe,
                  // sinon le premier (ou unique) stage rattaché à l'entreprise.
                  const stageToSelect = evaluations[0]?.stageId ?? this.internships[0]?.id ?? null;
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

  /**
   * True si la période d'évaluation est ouverte pour le stage donné :
   *   sysdate >= dateRéunionFinale  OU  sysdate >= dateFinStage
   */
  isEvaluationPeriodOpen(stageId: number): boolean {
    const internship = this.internships.find((i) => i.id === stageId);
    const finaleMeeting = this.meetings.find((m) => m.stageId === stageId && m.source === 'FINALE');
    return isStagePeriodOpen(internship?.dateFin ?? null, finaleMeeting?.date ?? null);
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

  isReadOnly(evaluation: CompanyEvaluation | null = this.selectedEvaluation): boolean {
    if (!evaluation) return false;
    // Fiche verrouillée ou déjà signée par le RE
    if (Boolean(evaluation.verrouillee) || Boolean(evaluation.dateSignatureRepresentantEntreprise)) {
      return true;
    }
    // Données déjà enregistrées une première fois → lecture seule, signature possible
    return (
      Boolean(evaluation.pointFortResponsableEntreprise?.trim()) &&
      Boolean(evaluation.axeAmeliorationResponsableEntreprise?.trim())
    );
  }

  /** True si le RE peut signer (données enregistrées, pas encore signé, non verrouillé). */
  canSign(evaluation: CompanyEvaluation): boolean {
    if (evaluation.verrouillee) return false;
    if (evaluation.dateSignatureRepresentantEntreprise) return false;
    return (
      Boolean(evaluation.pointFortResponsableEntreprise?.trim()) &&
      Boolean(evaluation.axeAmeliorationResponsableEntreprise?.trim())
    );
  }

  saveEvaluation(): void {
    if (!this.context) return;
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }

    const payload = this.evaluationForm.getRawValue();
    const existing = this.evaluations.find((item) => item.stageId === payload.stageId);

    if (existing && this.isReadOnly(existing)) {
      this.errorMessage = 'Cette évaluation est verrouillée et ne peut plus être modifiée.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!existing) {
      this.errorMessage = "Aucune fiche d'évaluation n'a encore été créée pour ce stage. L'encadrant professionnel doit d'abord initialiser la fiche.";
      this.isSaving = false;
      return;
    }

    const request$ = this.companyEvaluationsService.fillResponsableSection(existing.id, this.context.userId, payload);

    request$.pipe(timeout(15000)).subscribe({
      next: (evaluation) => {
        const isNew = !existing;
        const label = isNew ? 'Évaluation créée avec succès.' : 'Évaluation mise à jour avec succès.';

        // Étape 2 : enregistrer la note Ponctualité si elle a été saisie
        const shouldSaveNote =
          this.noteDraftRE.note > 0 || this.noteDraftRE.critereEvaluationId !== null;

        if (!shouldSaveNote) {
          this.successMessage = label;
          this.isSaving = false;
          this.selectedEvaluation = evaluation;
          this.loadEvaluations();
          return;
        }

        const notePayload: EvaluationNoteDto[] = [{
          critereEvaluationId: this.noteDraftRE.critereEvaluationId,
          critereLibelle: this.noteDraftRE.critereLibelle,
          note: this.noteDraftRE.note,
          poids: this.noteDraftRE.poids,
          bareme: this.noteDraftRE.bareme,
          commentaire: this.noteDraftRE.commentaire
        }];

        this.companyEvaluationsService
          .enregistrerNotePonctualite(evaluation.id, this.context!.userId, notePayload)
          .pipe(timeout(15000))
          .subscribe({
            next: (updated) => {
              this.successMessage = label;
              this.isSaving = false;
              this.selectedEvaluation = updated;
              this.loadEvaluations();
            },
            error: (error) => {
              this.successMessage = label + ' (note Ponctualité non enregistrée)';
              this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer la note de ponctualité.";
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

    // Charger la note Ponctualité existante
    const existing = (evaluation.notesAttribuees ?? []).find(
      (n) => n.critereLibelle === 'Ponctualité'
    );
    this.noteDraftRE = existing
      ? {
          critereLibelle: 'Ponctualité',
          critereEvaluationId: existing.critereEvaluationId ?? null,
          note: existing.note ?? 0,
          poids: existing.poids ?? 2,
          bareme: existing.bareme ?? 5,
          commentaire: existing.commentaire ?? ''
        }
      : this.defaultNotePonctualite();
  }

  private defaultNotePonctualite(): RpNoteDraft {
    return { critereLibelle: 'Ponctualité', critereEvaluationId: null, note: 0, poids: 2, bareme: 5, commentaire: '' };
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
}
