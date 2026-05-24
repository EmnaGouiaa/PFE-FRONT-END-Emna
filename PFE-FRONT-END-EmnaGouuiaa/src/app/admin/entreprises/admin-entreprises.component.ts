import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import {
  AdminCompanyAccount,
  AdminCompanyAccountRequest,
  AdminCompanyAccountsService
} from '../../services/admin-company-accounts.service';
import {
  EncadrantsProfessionnelsService,
  EncadrantProfessionnel,
  CreateEncadrantRequest
} from '../../services/encadrants-professionnels.service';
import { phoneValidator, strictEmailValidator } from '../admin-form-validators';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';

type FieldErrors = Record<string, string>;

@Component({
  selector: 'app-admin-entreprises',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule, PhoneInputComponent],
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
  formSubmitAttempted = false;
  fieldErrors: FieldErrors = {};

  // ── Detail view ──────────────────────────────────────────────────────────────
  detailAccount: AdminCompanyAccount | null = null;

  // ── Encadrant management ─────────────────────────────────────────────────────
  encadrants: EncadrantProfessionnel[] = [];
  isLoadingEncadrants = false;
  showEncadrantForm = false;
  isEditEncadrantMode = false;
  editingEncadrantId: number | null = null;
  isSubmittingEncadrant = false;
  encadrantForm!: FormGroup;
  encadrantFormSubmitAttempted = false;
  encadrantFieldErrors: FieldErrors = {};
  encadrantErrorMessage = '';
  encadrantSuccessMessage = '';

  get linkedRepresentativeCount(): number {
    return this.companyAccounts.filter((item) => item.representantId !== null).length;
  }

  get configuredEmailCount(): number {
    return this.companyAccounts.filter((item) => item.emailResponsable || item.emailEntreprise).length;
  }

  constructor(
    private service: AdminCompanyAccountsService,
    private encadrantsService: EncadrantsProfessionnelsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.minLength(2)]],
      emailEntreprise: ['', [strictEmailValidator()]],
      telephoneEntreprise: ['', [phoneValidator()]],
      adresse: [''],
      secteurActivite: [''],
      nomResponsable: ['', [Validators.required, Validators.minLength(2)]],
      prenomResponsable: ['', [Validators.required, Validators.minLength(2)]],
      emailResponsable: ['', [Validators.required, strictEmailValidator()]],
      telephoneResponsable: ['', [phoneValidator()]]
    });

    this.encadrantForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [phoneValidator()]],
      poste: [''],
      service: ['']
    });

    this.load();
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
      secteurActivite: '',
      nomResponsable: '',
      prenomResponsable: '',
      emailResponsable: '',
      telephoneResponsable: ''
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
      secteurActivite: account.secteurActivite ?? '',
      nomResponsable: account.nomResponsable ?? '',
      prenomResponsable: account.prenomResponsable ?? '',
      emailResponsable: account.emailResponsable ?? '',
      telephoneResponsable: account.telephoneResponsable ?? ''
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

  private buildPayload(): AdminCompanyAccountRequest {
    const value = this.form.getRawValue();
    return {
      representantId: this.selectedCompanyAccount?.representantId ?? null,
      nomEntreprise: String(value.nomEntreprise ?? '').trim(),
      emailEntreprise: String(value.emailEntreprise ?? '').trim(),
      telephoneEntreprise: String(value.telephoneEntreprise ?? '').trim(),
      adresse: String(value.adresse ?? '').trim(),
      secteurActivite: String(value.secteurActivite ?? '').trim(),
      nomResponsable: String(value.nomResponsable ?? '').trim(),
      prenomResponsable: String(value.prenomResponsable ?? '').trim(),
      emailResponsable: String(value.emailResponsable ?? '').trim(),
      telephoneResponsable: String(value.telephoneResponsable ?? '').trim()
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
    const payload = this.buildPayload();

    if (this.isEditMode && this.editingId !== null) {
      this.service.update(this.editingId, payload).pipe(
        timeout(15000)
      ).subscribe({
        next: (updatedAccount) => {
          try {
            this.successMessage = this.resolveAccountMessage(
              updatedAccount,
              'Entreprise et representant mis a jour avec succes.'
            );
            this.upsertCompanyAccountInState(updatedAccount);
            // Sync detail view if it's the same account
            if (this.detailAccount?.entrepriseId === updatedAccount.entrepriseId) {
              this.detailAccount = { ...updatedAccount };
            }
            this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
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

    this.service.create(payload).pipe(
      timeout(15000)
    ).subscribe({
      next: (createdAccount) => {
        const message = this.resolveAccountMessage(
          createdAccount,
          'Entreprise et representant crees avec succes. Les identifiants ont ete envoyes par email.'
        );
        this.refreshAfterCreate(createdAccount, message);
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

  // ── Detail view ──────────────────────────────────────────────────────────────

  selectEntreprise(account: AdminCompanyAccount): void {
    this.detailAccount = { ...account };
    this.encadrants = [];
    this.encadrantErrorMessage = '';
    this.encadrantSuccessMessage = '';
    this.showEncadrantForm = false;
    this.loadEncadrants();
  }

  backToList(): void {
    this.detailAccount = null;
    this.encadrants = [];
    this.showEncadrantForm = false;
    this.encadrantErrorMessage = '';
    this.encadrantSuccessMessage = '';
    this.encadrantForm?.reset();
  }

  // ── Encadrant management ─────────────────────────────────────────────────────

  loadEncadrants(): void {
    if (!this.detailAccount) return;
    this.isLoadingEncadrants = true;
    this.encadrantErrorMessage = '';

    this.encadrantsService.listByEntreprise(this.detailAccount.entrepriseId).pipe(
      timeout(15000)
    ).subscribe({
      next: (items) => {
        this.encadrants = items ?? [];
        this.isLoadingEncadrants = false;
      },
      error: (err) => {
        const status: number = err?.status ?? 0;
        if (status === 403) {
          this.encadrantErrorMessage = 'Acces refuse (403) — permissions insuffisantes pour charger les encadrants.';
        } else if (status === 404) {
          this.encadrantErrorMessage = 'Entreprise introuvable (404) — impossible de charger les encadrants.';
        } else if (status === 0) {
          this.encadrantErrorMessage = 'Serveur injoignable — verifiez que le backend est en cours d\'execution.';
        } else {
          this.encadrantErrorMessage = this.extractErrorMessage(
            err,
            `Echec du chargement des encadrants (HTTP ${status || '?'}).`
          );
        }
        this.isLoadingEncadrants = false;
      }
    });
  }

  openAddEncadrant(): void {
    this.isEditEncadrantMode = false;
    this.editingEncadrantId = null;
    this.showEncadrantForm = true;
    this.encadrantFormSubmitAttempted = false;
    this.encadrantFieldErrors = {};
    this.encadrantErrorMessage = '';
    this.encadrantSuccessMessage = '';
    this.encadrantForm.reset({ nom: '', prenom: '', email: '', telephone: '', poste: '', service: '' });
  }

  openEditEncadrant(enc: EncadrantProfessionnel): void {
    this.isEditEncadrantMode = true;
    this.editingEncadrantId = enc.id;
    this.showEncadrantForm = true;
    this.encadrantFormSubmitAttempted = false;
    this.encadrantFieldErrors = {};
    this.encadrantErrorMessage = '';
    this.encadrantSuccessMessage = '';
    this.encadrantForm.reset({
      nom: enc.nom ?? '',
      prenom: enc.prenom ?? '',
      email: enc.email ?? '',
      telephone: enc.telephone ?? '',
      poste: enc.poste ?? '',
      service: enc.service ?? ''
    });
  }

  closeEncadrantForm(): void {
    this.showEncadrantForm = false;
    this.isEditEncadrantMode = false;
    this.editingEncadrantId = null;
    this.encadrantFormSubmitAttempted = false;
    this.encadrantFieldErrors = {};
    this.encadrantForm.reset();
  }

  submitEncadrant(): void {
    this.encadrantFormSubmitAttempted = true;
    this.encadrantErrorMessage = '';
    this.encadrantSuccessMessage = '';

    if (this.encadrantForm.invalid) {
      this.encadrantForm.markAllAsTouched();
      this.encadrantErrorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    if (!this.detailAccount) return;

    this.isSubmittingEncadrant = true;
    const value = this.encadrantForm.getRawValue();
    const dto: CreateEncadrantRequest = {
      nom: String(value.nom ?? '').trim(),
      prenom: String(value.prenom ?? '').trim(),
      email: String(value.email ?? '').trim(),
      telephone: String(value.telephone ?? '').trim(),
      poste: String(value.poste ?? '').trim(),
      service: String(value.service ?? '').trim()
    };

    const entrepriseId = this.detailAccount.entrepriseId;

    if (this.isEditEncadrantMode && this.editingEncadrantId !== null) {
      this.encadrantsService.updateForEntreprise(entrepriseId, this.editingEncadrantId, dto).pipe(
        timeout(15000)
      ).subscribe({
        next: (updated) => {
          try {
            const index = this.encadrants.findIndex((e) => e.id === updated.id);
            if (index >= 0) {
              const next = [...this.encadrants];
              next[index] = updated;
              this.encadrants = next;
            }
            this.encadrantSuccessMessage = 'Encadrant mis a jour avec succes.';
            this.snackBar.open(this.encadrantSuccessMessage, 'Fermer', { duration: 3500 });
            this.closeEncadrantForm();
          } finally {
            this.isSubmittingEncadrant = false;
          }
        },
        error: (err) => {
          try {
            this.encadrantErrorMessage = this.extractErrorMessage(err, "Echec de la mise a jour de l'encadrant.");
            this.snackBar.open(this.encadrantErrorMessage, 'Fermer', { duration: 4500 });
          } finally {
            this.isSubmittingEncadrant = false;
          }
        }
      });
      return;
    }

    this.encadrantsService.createForEntreprise(entrepriseId, dto).pipe(
      timeout(15000)
    ).subscribe({
      next: (created) => {
        try {
          this.encadrants = [created, ...this.encadrants];
          this.encadrantSuccessMessage = 'Encadrant cree avec succes.';
          this.snackBar.open(this.encadrantSuccessMessage, 'Fermer', { duration: 3500 });
          this.closeEncadrantForm();
        } finally {
          this.isSubmittingEncadrant = false;
        }
      },
      error: (err) => {
        try {
          this.encadrantErrorMessage = this.extractErrorMessage(err, "Echec de la creation de l'encadrant.");
          this.snackBar.open(this.encadrantErrorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSubmittingEncadrant = false;
        }
      }
    });
  }

  getEncadrantFieldError(fieldName: string): string {
    if (this.encadrantFieldErrors[fieldName]) {
      return this.encadrantFieldErrors[fieldName];
    }

    const control = this.encadrantForm.get(fieldName);
    if (!control || !(control.touched || this.encadrantFormSubmitAttempted)) {
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
