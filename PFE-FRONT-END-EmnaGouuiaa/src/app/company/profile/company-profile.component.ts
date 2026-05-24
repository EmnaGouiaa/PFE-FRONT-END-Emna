import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, switchMap, timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyContext } from '../../services/company/company.models';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { EntreprisesService } from '../../services/entreprises.service';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';

@Component({
  selector: 'app-company-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent],
  templateUrl: './company-profile.component.html',
  styleUrls: ['../company-shared.css', './company-profile.component.css']
})
export class CompanyProfilePageComponent implements OnInit {
  @ViewChild('signatureFileInput') signatureFileInput!: ElementRef<HTMLInputElement>;

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

  /** Aperçu local de la signature (data-URI ou URL) affiché pendant l'édition. */
  signatureApercuLocal: string | null = null;

  /** Signature chargée depuis le serveur, utilisée pour annuler les modifications. */
  private signatureChargee = '';

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private currentUserProfileService: CurrentUserProfileService,
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
      // Pas de limite de longueur : la valeur peut être une image encodée en Base-64.
      nomFichierSignature: ['']
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

  get hasSignature(): boolean {
    return Boolean(String(this.profileForm?.get('nomFichierSignature')?.value ?? '').trim());
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

    this.companyContextService.refresh().pipe(
      switchMap((context) =>
        this.currentUserProfileService.getCurrentProfile().pipe(
          map((profile) => ({ context, profile }))
        )
      ),
      timeout(15000)
    ).subscribe({
      next: ({ context, profile }) => {
        this.context = context;
        const signature = profile.nomFichierSignature || '';
        this.signatureChargee = signature;

        this.profileForm.patchValue({
          email: context.responsable.email ?? profile.email ?? '',
          prenom: context.responsable.prenom ?? profile.prenom ?? '',
          nom: context.responsable.nom ?? profile.nom ?? '',
          telephone: context.responsable.telephone ?? profile.telephone ?? '',
          poste: context.responsable.poste ?? profile.poste ?? '',
          service: context.responsable.service ?? profile.service ?? '',
          nomFichierSignature: signature
        });
        this.signatureApercuLocal = signature.trim() || null;
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
      nomFichierSignature: this.signatureChargee
    });
    this.signatureApercuLocal = this.signatureChargee.trim() || null;
  }

  // ── Gestion de l'import de signature ───────────────────────────────────────

  ouvrirSelecteurFichier(): void {
    this.signatureFileInput?.nativeElement.click();
  }

  onSignatureSelectionnee(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;

    const typesAcceptes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!typesAcceptes.includes(fichier.type)) {
      this.errorMessage = 'Format non supporté. Utilisez PNG, JPG ou WEBP.';
      return;
    }

    const tailleMaxKo = 1024; // 1 Mo
    if (fichier.size > tailleMaxKo * 1024) {
      this.errorMessage = `L'image ne doit pas dépasser ${tailleMaxKo} Ko.`;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      this.signatureApercuLocal = dataUri;
      this.profileForm.get('nomFichierSignature')?.setValue(dataUri);
      this.errorMessage = '';
    };
    reader.readAsDataURL(fichier);

    // Remet l'input à zéro pour permettre de re-sélectionner le même fichier.
    input.value = '';
  }

  supprimerSignature(): void {
    this.signatureApercuLocal = null;
    this.profileForm.get('nomFichierSignature')?.setValue('');
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
      switchMap(() => this.saveProfileRequest()),
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
      this.errorMessage = "Aucune entreprise n'est disponible pour la mise à jour.";
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
          this.successMessage = "Informations de l'entreprise mises à jour avec succès.";
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

    this.saveProfileRequest()
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

  /**
   * Met à jour le profil via l'endpoint self-service `/api/utilisateurs/me/profile`.
   * Ce point d'accès gère prenom/nom/telephone/poste/service/signature pour le rôle
   * RESPONSABLE_ENTREPRISE — il n'est plus nécessaire d'appeler l'endpoint admin
   * `PUT /api/responsables-entreprise/{id}` (réservé à l'ADMINISTRATEUR -> 403).
   */
  private saveProfileRequest() {
    const values = this.profileForm.getRawValue();

    return this.currentUserProfileService.updateCurrentProfile({
      prenom: values.prenom,
      nom: values.nom,
      telephone: values.telephone,
      poste: values.poste,
      service: values.service,
      nomFichierSignature: values.nomFichierSignature
    });
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
