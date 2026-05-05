import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../login/login.css', './forgot-password.component.css']
})
export class ForgotPasswordComponent {
  emailForm: FormGroup;
  resetForm: FormGroup;
  isSubmittingEmail = false;
  isResettingPassword = false;
  currentStep: 1 | 2 = 1;
  messageErreur = '';
  messageSucces = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthentificationService,
    private router: Router
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  submitEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isSubmittingEmail = true;
    this.messageErreur = '';
    this.messageSucces = '';

    const email = String(this.emailForm.value.email ?? '').trim();
    this.authService.forgotPassword({ email })
      .pipe(finalize(() => { this.isSubmittingEmail = false; }))
      .subscribe({
        next: (response) => {
          this.currentStep = 2;
          this.resetForm.patchValue({ email });
          this.messageSucces = response.message || 'If this email exists, a reset code has been sent.';
        },
        error: (error) => {
          this.messageErreur = this.extractErrorMessage(error, 'Impossible de lancer la reinitialisation du mot de passe.');
        }
      });
  }

  submitReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { email, code, newPassword, confirmPassword } = this.resetForm.value;
    if (newPassword !== confirmPassword) {
      this.messageErreur = 'La confirmation du mot de passe ne correspond pas.';
      return;
    }

    this.isResettingPassword = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.authService.resetPassword({ email, code, newPassword, confirmPassword })
      .pipe(finalize(() => { this.isResettingPassword = false; }))
      .subscribe({
        next: (response) => {
          this.messageSucces = response.message || 'Votre mot de passe a ete reinitialise avec succes.';
          window.setTimeout(() => {
            this.router.navigate(['/connexion']);
          }, 1200);
        },
        error: (error) => {
          this.messageErreur = this.extractErrorMessage(error, 'Impossible de reinitialiser le mot de passe.');
        }
      });
  }

  retourEtapeEmail(): void {
    this.currentStep = 1;
    this.messageErreur = '';
    this.messageSucces = '';
  }

  private extractErrorMessage(erreur: any, fallback: string): string {
    if (typeof erreur?.error === 'string' && erreur.error.trim()) return erreur.error;
    if (typeof erreur?.error?.message === 'string' && erreur.error.message.trim()) return erreur.error.message;
    if (erreur?.error && typeof erreur.error === 'object' && !Array.isArray(erreur.error)) {
      const first = Object.values(erreur.error).find((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (first) return first;
    }
    if (typeof erreur?.message === 'string' && erreur.message.trim()) return erreur.message;
    return fallback;
  }
}
