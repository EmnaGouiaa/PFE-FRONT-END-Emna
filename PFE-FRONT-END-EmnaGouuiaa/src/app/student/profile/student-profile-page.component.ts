import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { ServiceProfilService } from '../../services/service-profil.service';
import { StudentProfile, StudentProfileUpdateRequest } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './student-profile-page.component.html',
  styleUrls: ['../../admin/dashboard/admin-dashboard.css', '../../company/company-shared.css', '../student-shared.css', './student-profile-page.component.css']
})
export class StudentProfilePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

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

  readonly profileForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    nom: ['', [Validators.required, Validators.maxLength(100)]],
    prenom: ['', [Validators.required, Validators.maxLength(100)]],
    telephone: ['', [Validators.maxLength(30)]],
    adresse: ['', [Validators.maxLength(255)]],
    nomFichierSignature: ['', [Validators.maxLength(255)]]
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

  isInvalid(controlName: 'email' | 'nom' | 'prenom' | 'telephone' | 'adresse' | 'nomFichierSignature'): boolean {
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

  isLink(value: string | null | undefined): boolean {
    return /^https?:\/\//i.test(String(value ?? '').trim());
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
      nomFichierSignature: profile.nomFichierSignature || ''
    });

    this.emailConfirmationForm.reset();
  }

  private buildProfilePayload(): StudentProfileUpdateRequest {
    const values = this.profileForm.getRawValue();
    return {
      nom: values.nom,
      prenom: values.prenom,
      telephone: values.telephone,
      adresse: values.adresse,
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
