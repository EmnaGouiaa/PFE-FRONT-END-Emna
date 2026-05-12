import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
<<<<<<< HEAD
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
=======
import {
  EntreprisesService,
  Entreprise,
  CreateEntrepriseRequest,
  UpdateEntrepriseRequest
} from '../../services/entreprises.service';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

@Component({
  selector: 'app-admin-entreprises',
  standalone: true,
<<<<<<< HEAD
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
=======
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  templateUrl: './admin-entreprises.component.html',
  styleUrls: ['./admin-entreprises.component.css']
})
export class AdminEntreprisesComponent implements OnInit {
<<<<<<< HEAD
  companyAccounts: AdminCompanyAccount[] = [];
  filtered: AdminCompanyAccount[] = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
=======
  entreprises: Entreprise[] = [];
  filtered: Entreprise[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  searchQuery = '';
  showForm = false;
  isEditMode = false;
  editingId: number | null = null;
<<<<<<< HEAD
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
=======
  form!: FormGroup;

  constructor(private service: EntreprisesService, private fb: FormBuilder) {}
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

  ngOnInit(): void {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.minLength(2)]],
<<<<<<< HEAD
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
=======
      adresseEntreprise: [''],
      emailEntreprise: ['', [Validators.email]],
      telephoneEntreprise: ['']
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    });
    this.load();
  }

<<<<<<< HEAD
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
=======
  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

<<<<<<< HEAD
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
=======
  private upsertEntrepriseInState(entreprise: Entreprise): void {
    console.log('[AdminEntreprises] API RESPONSE:', entreprise);
    if (!entreprise || !Number.isFinite(entreprise.id) || entreprise.id <= 0) return;

    const index = this.entreprises.findIndex((item) => item.id === entreprise.id);
    if (index >= 0) {
      const nextItems = [...this.entreprises];
      nextItems[index] = entreprise;
      this.entreprises = nextItems;
    } else {
      this.entreprises = [entreprise, ...this.entreprises];
    }

    this.filtered = [...this.entreprises];
    this.filter();
    console.log('[AdminEntreprises] UPDATED LIST:', this.entreprises);
  }

  load(): void {
    console.log('[AdminEntreprises] load triggered');
    this.isLoading = true;
    this.errorMessage = '';

    this.service.list().subscribe({
      next: (items) => {
        console.log('[AdminEntreprises] list success', items?.length ?? 0);
        this.entreprises = [...(items ?? [])];
        this.filtered = [...this.entreprises];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading entreprises:', err);
        this.errorMessage = this.extractErrorMessage(err, 'Echec du chargement des entreprises.');
        this.isLoading = false;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    });
  }

  filter(): void {
    const q = this.searchQuery.trim().toLowerCase();
<<<<<<< HEAD
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
=======
    this.filtered = this.entreprises.filter((e) => {
      if (!q) return true;
      const text = [e.nomEntreprise, e.emailEntreprise, e.adresseEntreprise].filter(Boolean).join(' ').toLowerCase();
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      return text.includes(q);
    });
  }

  openCreate(): void {
<<<<<<< HEAD
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
=======
    console.log('[AdminEntreprises] openCreate');
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.reset({
      nomEntreprise: '',
      adresseEntreprise: '',
      emailEntreprise: '',
      telephoneEntreprise: ''
    });
  }

  openEdit(e: Entreprise): void {
    console.log('[AdminEntreprises] openEdit', e?.id);
    this.isEditMode = true;
    this.editingId = e.id;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.patchValue({
      nomEntreprise: e.nomEntreprise ?? '',
      adresseEntreprise: e.adresseEntreprise ?? '',
      emailEntreprise: e.emailEntreprise ?? '',
      telephoneEntreprise: e.telephoneEntreprise ?? ''
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    });
  }

  closeForm(): void {
<<<<<<< HEAD
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
=======
    console.log('[AdminEntreprises] closeForm');
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
  }

  submit(): void {
    console.log('[AdminEntreprises] submit', { isEditMode: this.isEditMode, editingId: this.editingId });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const v = this.form.value;

    if (this.isEditMode && this.editingId !== null) {
      const payload: UpdateEntrepriseRequest = {
        nomEntreprise: v.nomEntreprise,
        adresseEntreprise: v.adresseEntreprise,
        emailEntreprise: v.emailEntreprise,
        telephoneEntreprise: v.telephoneEntreprise
      };

      this.service.update(this.editingId, payload).subscribe({
        next: (updatedEntreprise) => {
          console.log('[AdminEntreprises] update success', this.editingId);
          this.successMessage = 'Entreprise mise a jour avec succes.';
          this.closeForm();
          this.upsertEntrepriseInState(updatedEntreprise);
          this.isLoading = false;

          if (!updatedEntreprise || !Number.isFinite(updatedEntreprise.id) || updatedEntreprise.id <= 0) {
            this.load();
          }
        },
        error: (err) => {
          console.error('Error updating entreprise:', err);
          this.errorMessage = this.extractErrorMessage(err, 'Echec de la mise a jour.');
          this.isLoading = false;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        }
      });
      return;
    }

<<<<<<< HEAD
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
=======
    const payload: CreateEntrepriseRequest = {
      nomEntreprise: v.nomEntreprise,
      adresseEntreprise: v.adresseEntreprise,
      emailEntreprise: v.emailEntreprise,
      telephoneEntreprise: v.telephoneEntreprise
    };

    this.service.create(payload).subscribe({
      next: (createdEntreprise) => {
        console.log('[AdminEntreprises] create success');
        this.successMessage = 'Entreprise creee avec succes.';
        this.closeForm();
        this.upsertEntrepriseInState(createdEntreprise);
        this.isLoading = false;

        if (!createdEntreprise || !Number.isFinite(createdEntreprise.id) || createdEntreprise.id <= 0) {
          this.load();
        }
      },
      error: (err) => {
        console.error('Error creating entreprise:', err);
        this.errorMessage = this.extractErrorMessage(err, 'Echec de la creation.');
        this.isLoading = false;
      }
    });
  }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
