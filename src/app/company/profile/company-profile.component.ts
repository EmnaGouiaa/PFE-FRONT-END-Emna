import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyContext } from '../../services/company/company.models';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { EntreprisesService } from '../../services/entreprises.service';
import { ResponsablesEntrepriseService } from '../../services/responsables-entreprise.service';

@Component({
  selector: 'app-company-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-profile.component.html',
  styleUrls: ['../company-shared.css', './company-profile.component.css']
})
export class CompanyProfilePageComponent implements OnInit {
  context: CompanyContext | null = null;
  profileForm!: FormGroup;
  emailConfirmationForm!: FormGroup;
  companyForm!: FormGroup;
  isLoading = false;
  isSavingProfile = false;
  isSavingEmail = false;
  isSavingCompany = false;
  isEditingProfile = false;
  isEditingCompany = false;
  showEmailConfirmation = false;
  errorMessage = '';
  successMessage = '';
  emailConfirmationError = '';

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private currentUserProfileService: CurrentUserProfileService,
    private responsablesEntrepriseService: ResponsablesEntrepriseService,
    private entreprisesService: EntreprisesService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: [''],
      poste: [''],
      service: [''],
      nomFichierSignature: ['', [Validators.maxLength(255)]]
    });

    this.emailConfirmationForm = this.fb.group({
      motDePasse: ['', Validators.required]
    });

    this.companyForm = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.minLength(2)]],
      adresseEntreprise: [''],
      emailEntreprise: ['', Validators.email],
      telephoneEntreprise: [''],
      secteurActivite: ['']
    });

    this.loadContext();
  }

  loadContext(preserveSuccessMessage = false): void {
    this.isLoading = true;
    this.isEditingProfile = false;
    this.isEditingCompany = false;
    this.showEmailConfirmation = false;
    this.errorMessage = '';
    if (!preserveSuccessMessage) {
      this.successMessage = '';
    }
    this.emailConfirmationError = '';

    this.companyContextService.refresh().pipe(timeout(15000)).subscribe({
      next: (context) => {
        this.context = context;
        this.profileForm.patchValue({
          email: context.responsable.email ?? '',
          prenom: context.responsable.prenom ?? '',
          nom: context.responsable.nom ?? '',
          telephone: context.responsable.telephone ?? '',
          poste: context.responsable.poste ?? '',
          service: context.responsable.service ?? '',
          nomFichierSignature: context.responsable.nomFichierSignature ?? this.currentUserProfileService.getCachedSignature()
        });
        this.emailConfirmationForm.reset();

        this.companyForm.patchValue({
          nomEntreprise: context.entreprise?.nomEntreprise ?? context.responsable.entrepriseNom ?? '',
          adresseEntreprise: context.entreprise?.adresseEntreprise ?? '',
          emailEntreprise: context.entreprise?.emailEntreprise ?? '',
          telephoneEntreprise: context.entreprise?.telephoneEntreprise ?? '',
          secteurActivite: context.entreprise?.secteurActivite ?? ''
        });

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le profil entreprise.';
        this.isLoading = false;
      }
    });
  }

  startProfileEditing(): void {
    this.isEditingProfile = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelProfileEditing(): void {
    if (!this.context) return;
    this.isEditingProfile = false;
    this.showEmailConfirmation = false;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
    this.profileForm.patchValue({
      email: this.context.responsable.email ?? '',
      prenom: this.context.responsable.prenom ?? '',
      nom: this.context.responsable.nom ?? '',
      telephone: this.context.responsable.telephone ?? '',
      poste: this.context.responsable.poste ?? '',
      service: this.context.responsable.service ?? '',
      nomFichierSignature: this.context.responsable.nomFichierSignature ?? this.currentUserProfileService.getCachedSignature()
    });
  }

  saveProfile(): void {
    if (!this.isEditingProfile) {
      this.startProfileEditing();
      return;
    }

    if (!this.context) return;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    if (this.emailChanged()) {
      this.openEmailConfirmation();
      return;
    }

    this.saveProfileWithoutEmail();
  }

  confirmEmailChange(): void {
    if (!this.context) return;
    if (this.emailConfirmationForm.invalid) {
      this.emailConfirmationForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    this.isSavingProfile = true;
    this.isSavingEmail = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.emailConfirmationError = '';

    this.currentUserProfileService.updateCurrentEmail({
      email: values.email,
      motDePasseActuel: this.emailConfirmationForm.get('motDePasse')?.value
    }).pipe(
      switchMap(() => this.saveProfileRequest(values.email)),
      timeout(15000)
    ).subscribe({
      next: () => {
        this.successMessage = 'Adresse e-mail modifiée avec succès.';
        this.isSavingProfile = false;
        this.isSavingEmail = false;
        this.isEditingProfile = false;
        this.showEmailConfirmation = false;
        this.emailConfirmationForm.reset();
        this.loadContext(true);
      },
      error: (error) => {
        const message = this.describeError(error, "Impossible de modifier l'adresse e-mail.");
        this.emailConfirmationError = message.includes('Mot de passe') ? 'Mot de passe incorrect' : message;
        this.isSavingProfile = false;
        this.isSavingEmail = false;
      }
    });
  }

  cancelEmailChange(): void {
    if (this.context) {
      this.profileForm.patchValue({ email: this.context.responsable.email ?? '' });
    }
    this.showEmailConfirmation = false;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
  }

  startCompanyEditing(): void {
    this.isEditingCompany = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelCompanyEditing(): void {
    if (!this.context) return;
    this.isEditingCompany = false;
    this.companyForm.patchValue({
      nomEntreprise: this.context.entreprise?.nomEntreprise ?? this.context.responsable.entrepriseNom ?? '',
      adresseEntreprise: this.context.entreprise?.adresseEntreprise ?? '',
      emailEntreprise: this.context.entreprise?.emailEntreprise ?? '',
      telephoneEntreprise: this.context.entreprise?.telephoneEntreprise ?? '',
      secteurActivite: this.context.entreprise?.secteurActivite ?? ''
    });
  }

  saveCompany(): void {
    if (!this.isEditingCompany) {
      this.startCompanyEditing();
      return;
    }

    const entrepriseId = this.context?.entreprise?.id;
    if (!entrepriseId) {
      this.errorMessage = 'Aucune entreprise n’est disponible pour la mise à jour.';
      return;
    }

    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSavingCompany = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.entreprisesService
      .update(entrepriseId, this.companyForm.getRawValue())
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.successMessage = 'Informations de l’entreprise mises à jour avec succès.';
          this.isSavingCompany = false;
          this.isEditingCompany = false;
          this.loadContext(true);
        },
        error: (error) => {
          this.errorMessage = this.describeError(error, "Impossible de mettre à jour l'entreprise.");
          this.isSavingCompany = false;
        }
      });
  }

  isProfileInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  isCompanyInvalid(controlName: string): boolean {
    const control = this.companyForm.get(controlName);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  isEmailConfirmationInvalid(): boolean {
    const control = this.emailConfirmationForm.get('motDePasse');
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  private saveProfileWithoutEmail(): void {
    if (!this.context) return;

    this.isSavingProfile = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.saveProfileRequest(this.context.responsable.email ?? '')
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.successMessage = 'Profil du représentant mis à jour avec succès.';
          this.isSavingProfile = false;
          this.isEditingProfile = false;
          this.loadContext(true);
        },
        error: (error) => {
          this.errorMessage = this.describeError(error, 'Impossible de mettre à jour le représentant.');
          this.isSavingProfile = false;
        }
      });
  }

  private saveProfileRequest(email: string) {
    const context = this.context!;
    const values = this.profileForm.getRawValue();

    return this.currentUserProfileService
      .updateCurrentProfile({
        prenom: values.prenom,
        nom: values.nom,
        telephone: values.telephone,
        nomFichierSignature: values.nomFichierSignature
      })
      .pipe(
        switchMap(() => this.responsablesEntrepriseService.update(context.responsable.id, {
          prenom: values.prenom,
          nom: values.nom,
          email,
          telephone: values.telephone,
          poste: values.poste,
          service: values.service,
          entrepriseId: context.responsable.entrepriseId
        }))
      );
  }

  private openEmailConfirmation(): void {
    this.showEmailConfirmation = true;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
  }

  private emailChanged(): boolean {
    if (!this.context) return false;
    return this.normalizeEmail(this.profileForm.get('email')?.value) !== this.normalizeEmail(this.context.responsable.email);
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private describeError(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error?.error && typeof error.error === 'object') {
      const firstMessage = Object.values(error.error).find((value) => typeof value === 'string' && value.trim());
      if (firstMessage) {
        return String(firstMessage);
      }
    }

    return error?.error?.message ?? error?.message ?? fallback;
  }
}
