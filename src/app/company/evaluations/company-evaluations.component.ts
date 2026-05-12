import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyEvaluationsService } from '../../services/company/company-evaluations.service';
import { CompanyContext, CompanyEvaluation, CompanyInternship } from '../../services/company/company.models';

@Component({
  selector: 'app-company-evaluations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-evaluations.component.html',
  styleUrls: ['../company-shared.css', './company-evaluations.component.css']
})
export class CompanyEvaluationsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  evaluations: CompanyEvaluation[] = [];
  selectedEvaluation: CompanyEvaluation | null = null;
  evaluationForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyEvaluationsService: CompanyEvaluationsService
  ) {}

  ngOnInit(): void {
    this.evaluationForm = this.fb.group({
      stageId: [null, Validators.required],
      pointFortResponsableEntreprise: ['', [Validators.required, Validators.minLength(3)]],
      axeAmeliorationResponsableEntreprise: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.evaluationForm.get('stageId')?.valueChanges.subscribe((stageId) => {
      const selectedStageId = Number(stageId ?? 0);
      const evaluation = this.evaluations.find((item) => item.stageId === selectedStageId) ?? null;
      this.selectedEvaluation = evaluation;

      if (evaluation) {
        this.fillForm(evaluation);
        return;
      }

      this.setReadOnlyMode(false);
      this.evaluationForm.patchValue(
        {
          pointFortResponsableEntreprise: '',
          axeAmeliorationResponsableEntreprise: ''
        },
        { emitEvent: false }
      );
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

        this.companyInternshipsService.listByEntreprise(context.responsable.entrepriseId).pipe(timeout(15000)).subscribe({
          next: (internships) => {
            this.internships = internships;

            if (!internships.length) {
              this.evaluations = [];
              this.selectedEvaluation = null;
              this.isLoading = false;
              return;
            }

            forkJoin(
              internships.map((internship) =>
                this.companyEvaluationsService.getByStageId(internship.id).pipe(catchError(() => of(null)))
              )
            )
              .pipe(
                map((items) => items.filter((item): item is CompanyEvaluation => item !== null)),
                timeout(15000)
              )
              .subscribe({
                next: (evaluations) => {
                  this.evaluations = evaluations;
                  this.selectedEvaluation = evaluations[0] ?? null;
                  if (this.selectedEvaluation) {
                    this.fillForm(this.selectedEvaluation);
                  }
                  this.isLoading = false;
                },
                error: (error) => {
                  this.errorMessage = error?.error?.message ?? "Impossible de charger les évaluations.";
                  this.isLoading = false;
                }
              });
          },
          error: (error) => {
            this.errorMessage = error?.error?.message ?? 'Impossible de charger les stages entreprise.';
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

  selectEvaluation(evaluation: CompanyEvaluation): void {
    this.selectedEvaluation = evaluation;
    this.fillForm(evaluation);
  }

  isReadOnly(evaluation: CompanyEvaluation | null = this.selectedEvaluation): boolean {
    if (!evaluation) {
      return false;
    }
    return Boolean(evaluation.verrouillee) || Boolean(evaluation.signatureRepresentantEntreprise);
  }

  saveEvaluation(): void {
    if (!this.context) {
      return;
    }
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }

    const payload = this.evaluationForm.getRawValue();
    const existing = this.evaluations.find((item) => item.stageId === payload.stageId);

    if (existing && this.isReadOnly(existing)) {
      this.errorMessage = "Cette évaluation est verrouillée et ne peut plus être modifiée.";
      return;
    }
    if (!existing) {
      this.errorMessage = "La fiche d'évaluation n'est pas encore disponible pour ce stage.";
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyEvaluationsService.fillResponsableSection(existing.id, this.context.userId, payload).pipe(timeout(15000)).subscribe({
      next: (evaluation) => {
        this.successMessage = 'Évaluation mise à jour avec succès.';
        this.isSaving = false;
        this.selectedEvaluation = evaluation;
        this.loadEvaluations();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'évaluation.";
        this.isSaving = false;
      }
    });
  }

  signEvaluation(evaluation: CompanyEvaluation): void {
    if (!this.context) {
      return;
    }
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
        this.errorMessage = error?.error?.message ?? "Impossible de signer cette évaluation.";
      }
    });
  }

  getCompletionLabel(evaluation: CompanyEvaluation): string {
    if (evaluation.signaturesCompletes) return 'Signée';
    if (evaluation.complete) return 'Prête';
    if (evaluation.pointFortResponsableEntreprise || evaluation.axeAmeliorationResponsableEntreprise) return 'En cours';
    return 'À remplir';
  }

  getCompletionBadgeClass(evaluation: CompanyEvaluation): string {
    const label = this.getCompletionLabel(evaluation);
    if (label === 'Signée') return 'status-positive';
    if (label === 'Prête') return 'status-info';
    if (label === 'À remplir') return 'status-neutral';
    return 'status-warning';
  }

  getEvaluationNoteLabel(score: number | null): string {
    return score == null ? '-' : score.toFixed(2);
  }

  private fillForm(evaluation: CompanyEvaluation): void {
    this.setReadOnlyMode(this.isReadOnly(evaluation));
    this.evaluationForm.patchValue(
      {
        stageId: evaluation.stageId,
        pointFortResponsableEntreprise: evaluation.pointFortResponsableEntreprise,
        axeAmeliorationResponsableEntreprise: evaluation.axeAmeliorationResponsableEntreprise
      },
      { emitEvent: false }
    );
  }

  private setReadOnlyMode(readOnly: boolean): void {
    const fields = ['pointFortResponsableEntreprise', 'axeAmeliorationResponsableEntreprise'];
    for (const field of fields) {
      const control = this.evaluationForm.get(field);
      if (!control) {
        continue;
      }
      if (readOnly) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }
}
