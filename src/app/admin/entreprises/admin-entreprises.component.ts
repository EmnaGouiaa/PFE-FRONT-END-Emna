import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import {
  AdminCompanyAccount,
  AdminCompanyAccountsService
} from '../../services/admin-company-accounts.service';
import {
  CreateEntrepriseRequest,
  EntreprisesService
} from '../../services/entreprises.service';
import { ProfessionalSupervisorPayload } from '../../services/company/company.models';
import { ProfessionalSupervisorsService } from '../../services/company/professional-supervisors.service';
import {
  CreateResponsableEntrepriseRequest,
  ResponsablesEntrepriseService,
  UpdateResponsableEntrepriseRequest
} from '../../services/responsables-entreprise.service';
import { phoneValidator, strictEmailValidator } from '../admin-form-validators';

type FieldErrors = Record<string, string>;

@Component({
  selector: 'app-admin-entreprises',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './admin-entreprises.component.html',
  styleUrls: ['./admin-entreprises.component.css']
})
export class AdminEntreprisesComponent implements OnInit {
  companyAccounts: AdminCompanyAccount[] = [];
  filtered: AdminCompanyAccount[] = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  showForm = false;
  isEditMode = false;
  editingId: number | null = null;
  selectedCompanyAccount: AdminCompanyAccount | null = null;
  form!: FormGroup;
  supervisorForm!: FormGroup;
  representativeForm!: FormGroup;
  formSubmitAttempted = false;
  supervisorSubmitAttempted = false;
  representativeSubmitAttempted = false;
  fieldErrors: FieldErrors = {};
  supervisorFieldErrors: FieldErrors = {};
  representativeFieldErrors: FieldErrors = {};
  showSupervisorForm = false;
  showRepresentativeForm = false;
  selectedSupervisorCompany: AdminCompanyAccount | null = null;
  selectedRepresentativeCompany: AdminCompanyAccount | null = null;

  get linkedRepresentativeCount(): number {
    return this.companyAccounts.filter((item) => item.representantId !== null).length;
  }

  get configuredEmailCount(): number {
    return this.companyAccounts.filter((item) => item.emailResponsable || item.emailEntreprise).length;
  }

  constructor(
    private service: AdminCompanyAccountsService,
    private entreprisesService: EntreprisesService,
    private professionalSupervisorsService: ProfessionalSupervisorsService,
    private responsablesEntrepriseService: ResponsablesEntrepriseService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.minLength(2)]],
      emailEntreprise: ['', [strictEmailValidator()]],
      telephoneEntreprise: ['', [phoneValidator()]],
      adresse: [''],
      secteurActivite: ['']
    });
    this.supervisorForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [Validators.required, phoneValidator()]],
      poste: [''],
      service: ['']
    });
    this.representativeForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [phoneValidator()]]
    });
    this.load();
  }

  private clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};
    this.supervisorFieldErrors = {};
    this.representativeFieldErrors = {};
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
        if (typeof value === 'string' && this.form.contains(key)) {
          errors[key] = value;
        }
      }
    }

    this.fieldErrors = errors;
  }

  private upsertCompanyAccountInState(account: AdminCompanyAccount): void {
    if (!account || !Number.isFinite(account.entrepriseId) || account.entrepriseId <= 0) return;

    const index = this.companyAccounts.findIndex((item) => item.entrepriseId === account.entrepriseId);
    if (index >= 0) {
      const nextItems = [...this.companyAccounts];
      nextItems[index] = account;
      this.companyAccounts = nextItems;
    } else {
      this.companyAccounts = [account, ...this.companyAccounts];
    }

    this.filtered = [...this.companyAccounts];
    this.filter();
  }

  private replaceCompanyAccounts(items: AdminCompanyAccount[] | null | undefined): void {
    this.companyAccounts = [...(items ?? [])];
    this.filtered = [...this.companyAccounts];
    this.filter();
  }

  private resolveAccountMessage(account: AdminCompanyAccount | null | undefined, fallback: string): string {
    const message = account?.message?.trim();
    return message ? message : fallback;
  }

  private refreshAfterCreate(createdAccount: AdminCompanyAccount, message: string): void {
    this.service.list().pipe(
      timeout(15000)
    ).subscribe({
      next: (items) => {
        try {
          this.replaceCompanyAccounts(items);
          const exists = this.companyAccounts.some((item) => item.entrepriseId === createdAccount.entrepriseId);
          this.successMessage = exists
            ? message
            : `${message} La liste actualisee ne confirme pas encore la presence du compte.`;
          this.snackBar.open(this.successMessage, 'Fermer', { duration: exists ? 4000 : 5000 });
          this.closeForm();
        } finally {
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        try {
          this.successMessage = `${message} Impossible d'actualiser la liste pour confirmer la creation.`;
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 5000 });
          this.errorMessage = this.extractErrorMessage(err, "Impossible d'actualiser la liste des entreprises.");
          this.closeForm();
        } finally {
          this.isSubmitting = false;
        }
      }
    });
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.service.list().pipe(
      timeout(15000)
    ).subscribe({
      next: (items) => {
        try {
          this.replaceCompanyAccounts(items);
        } finally {
          this.isLoading = false;
        }
      },
      error: (err) => {
        try {
          this.errorMessage = this.extractErrorMessage(err, 'Echec du chargement des entreprises.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  filter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = this.companyAccounts.filter((item) => {
      if (!q) return true;
      const text = [
        item.nomEntreprise,
        item.emailEntreprise,
        item.telephoneEntreprise,
        item.nomResponsable,
        item.prenomResponsable,
        item.emailResponsable,
        item.telephoneResponsable,
        item.secteurActivite,
        item.adresse
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.selectedCompanyAccount = null;
    this.showForm = true;
    this.formSubmitAttempted = false;
    this.clearFeedback();
    this.form.reset({
      nomEntreprise: '',
      emailEntreprise: '',
      telephoneEntreprise: '',
      adresse: '',
      secteurActivite: ''
    });
  }

  openEdit(account: AdminCompanyAccount): void {
    this.isEditMode = true;
    this.editingId = account.entrepriseId;
    this.selectedCompanyAccount = { ...account };
    this.showForm = true;
    this.formSubmitAttempted = false;
    this.clearFeedback();
    this.form.reset({
      nomEntreprise: account.nomEntreprise ?? '',
      emailEntreprise: account.emailEntreprise ?? '',
      telephoneEntreprise: account.telephoneEntreprise ?? '',
      adresse: account.adresse ?? '',
      secteurActivite: account.secteurActivite ?? ''
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
    this.selectedCompanyAccount = null;
    this.formSubmitAttempted = false;
    this.fieldErrors = {};
    this.form.reset();
  }

  openRepresentativeForm(account: AdminCompanyAccount): void {
    this.selectedRepresentativeCompany = { ...account };
    this.showRepresentativeForm = true;
    this.representativeSubmitAttempted = false;
    this.representativeFieldErrors = {};
    this.clearFeedback();
    this.representativeForm.reset({
      nom: account.nomResponsable ?? '',
      prenom: account.prenomResponsable ?? '',
      email: account.emailResponsable ?? '',
      telephone: account.telephoneResponsable ?? ''
    });
  }

  closeRepresentativeForm(): void {
    this.showRepresentativeForm = false;
    this.selectedRepresentativeCompany = null;
    this.representativeSubmitAttempted = false;
    this.representativeFieldErrors = {};
    this.representativeForm.reset();
  }

  openSupervisorCreate(account: AdminCompanyAccount): void {
    this.selectedSupervisorCompany = { ...account };
    this.showSupervisorForm = true;
    this.supervisorSubmitAttempted = false;
    this.supervisorFieldErrors = {};
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

  closeSupervisorForm(): void {
    this.showSupervisorForm = false;
    this.selectedSupervisorCompany = null;
    this.supervisorSubmitAttempted = false;
    this.supervisorFieldErrors = {};
    this.supervisorForm.reset();
  }

  saveSupervisor(): void {
    if (!this.selectedSupervisorCompany?.entrepriseId) {
      this.errorMessage = "Impossible de creer l'encadrant sans entreprise cible.";
      return;
    }

    this.supervisorSubmitAttempted = true;
    this.supervisorFieldErrors = {};
    this.clearFeedback();

    if (this.supervisorForm.invalid) {
      this.supervisorForm.markAllAsTouched();
      this.errorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    const value = this.supervisorForm.getRawValue();
    const payload: ProfessionalSupervisorPayload = {
      nom: String(value.nom ?? '').trim(),
      prenom: String(value.prenom ?? '').trim(),
      email: String(value.email ?? '').trim(),
      telephone: String(value.telephone ?? '').trim(),
      poste: String(value.poste ?? '').trim() || undefined,
      service: String(value.service ?? '').trim() || undefined,
      entrepriseId: this.selectedSupervisorCompany.entrepriseId
    };

    this.isSubmitting = true;

    this.professionalSupervisorsService.createForEntreprise(payload).pipe(
      timeout(15000)
    ).subscribe({
      next: () => {
        try {
          this.successMessage = "Encadrant professionnel cree avec succes. Il est rattache a l'entreprise selectionnee.";
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 4000 });
          this.closeSupervisorForm();
        } finally {
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        try {
          this.applySupervisorFieldErrors(err);
          this.errorMessage = this.extractErrorMessage(err, "Impossible de creer cet encadrant professionnel.");
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSubmitting = false;
        }
      }
    });
  }

  private applySupervisorFieldErrors(error: any): void {
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

    this.supervisorFieldErrors = errors;
  }

  private applyRepresentativeFieldErrors(error: any): void {
    const errors: FieldErrors = {};

    if (typeof error?.error?.field === 'string' && typeof error?.error?.message === 'string') {
      errors[error.error.field] = error.error.message;
    }

    if (error?.error && typeof error.error === 'object') {
      for (const [key, value] of Object.entries(error.error)) {
        if (typeof value === 'string' && this.representativeForm.contains(key)) {
          errors[key] = value;
        }
      }
    }

    this.representativeFieldErrors = errors;
  }

  private buildCompanyPayload(): CreateEntrepriseRequest {
    const value = this.form.getRawValue();
    return {
      nomEntreprise: String(value.nomEntreprise ?? '').trim(),
      emailEntreprise: String(value.emailEntreprise ?? '').trim(),
      telephoneEntreprise: String(value.telephoneEntreprise ?? '').trim(),
      adresse: String(value.adresse ?? '').trim(),
      secteurActivite: String(value.secteurActivite ?? '').trim()
    };
  }

  submit(): void {
    this.formSubmitAttempted = true;
    this.clearFeedback();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildCompanyPayload();

    if (this.isEditMode && this.editingId !== null) {
      this.entreprisesService.update(this.editingId, payload).pipe(
        timeout(15000)
      ).subscribe({
        next: () => {
          try {
            this.successMessage = 'Entreprise mise a jour avec succes.';
            this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
            this.load();
            this.closeForm();
          } finally {
            this.isSubmitting = false;
          }
        },
        error: (err) => {
          try {
            this.applyBackendFieldErrors(err);
            this.errorMessage = this.extractErrorMessage(err, 'Echec de la mise a jour.');
            this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
          } finally {
            this.isSubmitting = false;
          }
        }
      });
      return;
    }

    this.entreprisesService.create(payload).pipe(
      timeout(15000)
    ).subscribe({
      next: () => {
        this.successMessage = 'Entreprise creee avec succes.';
        this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
        this.load();
        this.closeForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        try {
          this.applyBackendFieldErrors(err);
          this.errorMessage = this.extractErrorMessage(err, 'Echec de la creation.');
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSubmitting = false;
        }
      }
    });
  }

  saveRepresentative(): void {
    if (!this.selectedRepresentativeCompany?.entrepriseId) {
      this.errorMessage = "Impossible d'associer un responsable sans entreprise existante.";
      return;
    }

    this.representativeSubmitAttempted = true;
    this.representativeFieldErrors = {};
    this.clearFeedback();

    if (this.representativeForm.invalid) {
      this.representativeForm.markAllAsTouched();
      this.errorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    const value = this.representativeForm.getRawValue();
    const payload: CreateResponsableEntrepriseRequest | UpdateResponsableEntrepriseRequest = {
      nom: String(value.nom ?? '').trim(),
      prenom: String(value.prenom ?? '').trim(),
      email: String(value.email ?? '').trim(),
      telephone: String(value.telephone ?? '').trim(),
      entrepriseId: this.selectedRepresentativeCompany.entrepriseId
    };

    this.isSubmitting = true;

    const request$ = this.selectedRepresentativeCompany.representantId
      ? this.responsablesEntrepriseService.update(this.selectedRepresentativeCompany.representantId, payload)
      : this.responsablesEntrepriseService.create(payload as CreateResponsableEntrepriseRequest);

    request$.pipe(timeout(15000)).subscribe({
      next: () => {
        try {
          this.successMessage = this.selectedRepresentativeCompany?.representantId
            ? 'Responsable entreprise mis a jour avec succes.'
            : "Responsable entreprise cree avec succes. Les identifiants ont ete envoyes par email.";
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 4000 });
          this.load();
          this.closeRepresentativeForm();
        } finally {
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        try {
          this.applyRepresentativeFieldErrors(err);
          this.errorMessage = this.extractErrorMessage(err, "Impossible d'enregistrer ce responsable entreprise.");
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSubmitting = false;
        }
      }
    });
  }

  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.form.get(fieldName);
    if (!control || !(control.touched || this.formSubmitAttempted)) {
      return '';
    }

    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['minlength']) return 'Minimum 2 caracteres.';
    if (control.errors?.['missingAt']) return "L'email doit contenir @.";
    if (control.errors?.['email']) return 'Format email invalide.';
    if (control.errors?.['phone']) return 'Numero de telephone invalide.';

    return '';
  }

  getSupervisorFieldError(fieldName: string): string {
    if (this.supervisorFieldErrors[fieldName]) {
      return this.supervisorFieldErrors[fieldName];
    }

    const control = this.supervisorForm.get(fieldName);
    if (!control || !(control.touched || this.supervisorSubmitAttempted)) {
      return '';
    }

    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['minlength']) return 'Minimum 2 caracteres.';
    if (control.errors?.['missingAt']) return "L'email doit contenir @.";
    if (control.errors?.['email']) return 'Format email invalide.';
    if (control.errors?.['phone']) return 'Numero de telephone invalide.';

    return '';
  }

  getRepresentativeFieldError(fieldName: string): string {
    if (this.representativeFieldErrors[fieldName]) {
      return this.representativeFieldErrors[fieldName];
    }

    const control = this.representativeForm.get(fieldName);
    if (!control || !(control.touched || this.representativeSubmitAttempted)) {
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
