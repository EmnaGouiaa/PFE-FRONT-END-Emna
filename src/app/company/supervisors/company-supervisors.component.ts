import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { ProfessionalSupervisorsService } from '../../services/company/professional-supervisors.service';
import { CompanyContext, ProfessionalSupervisor, ProfessionalSupervisorPayload } from '../../services/company/company.models';
import { phoneValidator, strictEmailValidator } from '../../admin/admin-form-validators';

type FieldErrors = Record<string, string>;

@Component({
  selector: 'app-company-supervisors-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './company-supervisors.component.html',
  styleUrls: ['../company-shared.css', './company-supervisors.component.css']
})
export class CompanySupervisorsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  supervisors: ProfessionalSupervisor[] = [];
  selectedSupervisor: ProfessionalSupervisor | null = null;
  supervisorForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  showForm = false;
  isEditMode = false;
  errorMessage = '';
  successMessage = '';
  submitAttempted = false;
  fieldErrors: FieldErrors = {};

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private professionalSupervisorsService: ProfessionalSupervisorsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.supervisorForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [Validators.required, phoneValidator()]],
      poste: [''],
      service: ['']
    });

    this.loadSupervisors();
  }

  private clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const details = typeof error?.error?.details === 'string' ? error.error.details.trim() : '';
    const message = typeof error?.error?.message === 'string' ? error.error.message.trim() : '';

    if (message && details) {
      return `${message} ${details}`;
    }
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (message) return message;
    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error).find(
        (value) => typeof value === 'string' && value.trim().length > 0
      );
      if (typeof firstValue === 'string') return firstValue;
    }
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

  private applyBackendFieldErrors(error: any): void {
    const errors: FieldErrors = {};

    if (typeof error?.error?.field === 'string' && typeof error?.error?.message === 'string') {
      errors[error.error.field] = error.error.message;
    }

    if (error?.error && typeof error.error === 'object') {
      for (const [key, value] of Object.entries(error.error)) {
        if (typeof value === 'string' && this.supervisorForm.contains(key)) {
          errors[key] = value;
        }
      }
    }

    this.fieldErrors = errors;
  }

  loadSupervisors(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachee a ce compte.";
          this.isLoading = false;
          return;
        }

        this.professionalSupervisorsService
          .listByEntreprise(context.responsable.entrepriseId)
          .pipe(timeout(15000))
          .subscribe({
            next: (supervisors) => {
              this.supervisors = supervisors;
              this.selectedSupervisor = supervisors[0] ?? null;
              this.isLoading = false;
            },
            error: (error) => {
              this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les encadrants professionnels.');
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

  openCreate(): void {
    this.isEditMode = false;
    this.showForm = true;
    this.submitAttempted = false;
    this.clearFeedback();
    this.supervisorForm.reset({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      poste: '',
      service: ''
    });
  }

  openEdit(supervisor: ProfessionalSupervisor): void {
    this.selectedSupervisor = supervisor;
    this.isEditMode = true;
    this.showForm = true;
    this.submitAttempted = false;
    this.clearFeedback();
    this.supervisorForm.reset({
      nom: supervisor.nom,
      prenom: supervisor.prenom,
      email: supervisor.email,
      telephone: supervisor.telephone,
      poste: supervisor.poste,
      service: supervisor.service
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.submitAttempted = false;
    this.fieldErrors = {};
    this.supervisorForm.reset();
  }

  saveSupervisor(): void {
    if (!this.context) return;

    this.submitAttempted = true;
    this.clearFeedback();

    if (this.supervisorForm.invalid) {
      this.supervisorForm.markAllAsTouched();
      this.errorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    const payload: ProfessionalSupervisorPayload = {
      ...this.supervisorForm.getRawValue(),
      entrepriseId: this.context.responsable.entrepriseId
    };

    this.isSaving = true;

    const request$ = this.isEditMode && this.selectedSupervisor
      ? this.professionalSupervisorsService.update(this.selectedSupervisor.id, payload)
      : this.professionalSupervisorsService.createByResponsable(this.context.responsable.id, payload);

    request$.pipe(timeout(15000)).subscribe({
      next: () => {
        try {
          this.successMessage = this.isEditMode
            ? 'Encadrant professionnel mis a jour avec succes.'
            : "Encadrant professionnel cree avec succes. Les identifiants ont ete envoyes par email.";
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 4000 });
          this.showForm = false;
          this.loadSupervisors();
        } finally {
          this.isSaving = false;
        }
      },
      error: (error) => {
        try {
          this.applyBackendFieldErrors(error);
          this.errorMessage = this.extractErrorMessage(error, "Impossible d'enregistrer cet encadrant.");
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSaving = false;
        }
      }
    });
  }

  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.supervisorForm.get(fieldName);
    if (!control || !(control.touched || this.submitAttempted)) {
      return '';
    }

    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['minlength']) return 'Minimum 2 caracteres.';
    if (control.errors?.['missingAt']) return "L'email doit contenir @.";
    if (control.errors?.['email']) return 'Format email invalide.';
    if (control.errors?.['phone']) return 'Numero de telephone invalide.';

    return '';
  }
}
