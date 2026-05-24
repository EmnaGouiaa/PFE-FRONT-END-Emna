import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { ServiceProfilService } from '../../services/service-profil.service';
import { StudentProfile, StudentProfileUpdateRequest } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';

@Component({
  selector: 'app-student-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PhoneInputComponent],
  templateUrl: './student-profile-page.component.html',
  styleUrls: ['../../admin/dashboard/admin-dashboard.css', '../../company/company-shared.css', '../student-shared.css', './student-profile-page.component.css']
})
export class StudentProfilePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  @ViewChild('signatureFileInput') signatureFileInput!: ElementRef<HTMLInputElement>;

  isLoading = true;
  isSaving = false;
  isSavingEmail = false;
  isEditing = false;
  showEmailConfirmation = false;
  errorMessage = '';
  successMessage = '';
  emailConfirmationError = '';
  profile: StudentProfile | null = null;
  private studentId: number | null = null;

  /** Aperçu local de la signature (data-URI) affiché pendant l'édition. */
  signatureApercuLocal: string | null = null;

  readonly profileForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    nom: ['', [Validators.required, Validators.maxLength(100)]],
    prenom: ['', [Validators.required, Validators.maxLength(100)]],
    telephone: ['', [Validators.maxLength(30)]],
    adresse: ['', [Validators.maxLength(255)]],
    matricule: ['', [Validators.maxLength(100)]],
    dateNaiss: [''],
    // Pas de limite de longueur : la valeur est une image encodée en Base-64.
    nomFichierSignature: ['']
  });

  readonly emailConfirmationForm = this.fb.nonNullable.group({
    motDePasse: ['', Validators.required]
  });

  constructor(
    private authService: AuthentificationService,
    private studentPortalService: StudentPortalService,
    private serviceProfil: ServiceProfilService
  ) {}

  ngOnInit(): void {
    this.studentId = this.authService.getUserId();
    if (!this.studentId) {
      this.errorMessage = 'Impossible de déterminer le stagiaire connecté.';
      this.isLoading = false;
      return;
    }

    this.loadProfile();
  }

  startEditing(): void {
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.showEmailConfirmation = false;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
    if (this.profile) {
      this.applyProfile(this.profile);
    }
  }

  saveProfile(): void {
    if (!this.isEditing) {
      this.startEditing();
      return;
    }

    if (!this.studentId) {
      this.errorMessage = 'Impossible de déterminer le stagiaire connecté.';
      return;
    }

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
    if (!this.studentId) {
      this.emailConfirmationError = 'Impossible de déterminer le stagiaire connecté.';
      return;
    }

    if (this.emailConfirmationForm.invalid) {
      this.emailConfirmationForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    this.isSaving = true;
    this.isSavingEmail = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.emailConfirmationError = '';

    this.serviceProfil.modifierAdresseEmail({
      email: values.email,
      motDePasseActuel: this.emailConfirmationForm.controls.motDePasse.value
    }).pipe(
      switchMap(() => this.studentPortalService.updateProfile(this.studentId!, this.buildProfilePayload()))
    ).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.successMessage = 'Adresse e-mail modifiée avec succès.';
        this.isEditing = false;
        this.showEmailConfirmation = false;
        this.emailConfirmationForm.reset();
        this.isSaving = false;
        this.isSavingEmail = false;
      },
      error: (error) => {
        const message = this.describeError(error, "Impossible de modifier l'adresse e-mail.");
        this.emailConfirmationError = message.includes('Mot de passe') ? 'Mot de passe incorrect' : message;
        this.isSaving = false;
        this.isSavingEmail = false;
      }
    });
  }

  cancelEmailChange(): void {
    if (this.profile) {
      this.profileForm.controls.email.setValue(this.profile.email || '');
    }
    this.showEmailConfirmation = false;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
  }

  reloadProfile(): void {
    this.loadProfile();
  }

  isInvalid(controlName: 'email' | 'nom' | 'prenom' | 'telephone' | 'adresse' | 'matricule' | 'dateNaiss'): boolean {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  isConfirmationInvalid(): boolean {
    const control = this.emailConfirmationForm.controls.motDePasse;
    return control.invalid && (control.touched || control.dirty);
  }

  hasSignature(): boolean {
    return Boolean(this.profile?.nomFichierSignature?.trim());
  }

  // ── Gestion de l'import de signature (image uniquement) ────────────────────

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
      this.profileForm.controls.nomFichierSignature.setValue(dataUri);
      this.errorMessage = '';
    };
    reader.readAsDataURL(fichier);

    // Remet l'input à zéro pour permettre de re-sélectionner le même fichier.
    input.value = '';
  }

  supprimerSignature(): void {
    this.signatureApercuLocal = null;
    this.profileForm.controls.nomFichierSignature.setValue('');
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  private loadProfile(): void {
    if (!this.studentId) {
      return;
    }

    this.isLoading = true;
    this.isEditing = false;
    this.showEmailConfirmation = false;
    this.errorMessage = '';

    this.studentPortalService.getProfile(this.studentId).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.describeError(error, 'Impossible de charger le profil.');
        this.isLoading = false;
      }
    });
  }

  private saveProfileWithoutEmail(): void {
    if (!this.studentId) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.updateProfile(this.studentId, this.buildProfilePayload()).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.successMessage = 'Profil mis à jour avec succès.';
        this.isEditing = false;
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = this.describeError(error, 'Impossible de mettre à jour le profil.');
        this.isSaving = false;
      }
    });
  }

  private applyProfile(profile: StudentProfile): void {
    this.profile = profile;
    this.profileForm.reset({
      email: profile.email || '',
      nom: profile.nom || '',
      prenom: profile.prenom || '',
      telephone: profile.telephone || '',
      adresse: profile.adresse || '',
      matricule: profile.matricule || '',
      dateNaiss: profile.dateNaiss || '',
      nomFichierSignature: profile.nomFichierSignature || ''
    });

    // Synchronise l'aperçu de signature avec les données du profil.
    this.signatureApercuLocal = profile.nomFichierSignature?.trim() || null;

    this.emailConfirmationForm.reset();
  }

  private buildProfilePayload(): StudentProfileUpdateRequest {
    const values = this.profileForm.getRawValue();
    return {
      nom: values.nom,
      prenom: values.prenom,
      telephone: values.telephone,
      adresse: values.adresse,
      matricule: values.matricule,
      dateNaiss: values.dateNaiss,
      nomFichierSignature: values.nomFichierSignature
    };
  }

  private openEmailConfirmation(): void {
    this.showEmailConfirmation = true;
    this.emailConfirmationError = '';
    this.emailConfirmationForm.reset();
  }

  private emailChanged(): boolean {
    if (!this.profile) return false;
    return this.normalizeEmail(this.profileForm.controls.email.value) !== this.normalizeEmail(this.profile.email);
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private describeError(error: unknown, fallback: string): string {
    if (typeof (error as any)?.error === 'string' && (error as any).error.trim()) {
      return (error as any).error;
    }

    const errorBody = (error as any)?.error;
    if (errorBody && typeof errorBody === 'object') {
      const firstMessage = Object.values(errorBody).find((value) => typeof value === 'string' && value.trim());
      if (firstMessage) {
        return String(firstMessage);
      }
    }

    return this.studentPortalService.describeError(error, fallback);
  }
}
