import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceProfilService } from '../../services/service-profil.service';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-first-login-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="dot-pattern"></div>
      <div class="shape-1"></div>
      <div class="shape-2"></div>

      <div class="login-wrapper">
        <div class="login-card">
          <div class="brand-section">
            <h1>Premiere connexion</h1>
            <p>Pour securiser votre compte, vous devez modifier votre mot de passe provisoire avant de continuer.</p>
          </div>

          <div *ngIf="messageErreur" class="error-message">{{ messageErreur }}</div>
          <div *ngIf="messageSucces" class="success-message">{{ messageSucces }}</div>

          <form [formGroup]="formulaire" (ngSubmit)="soumettre()" class="login-form">
            <div class="input-group">
              <label for="ancienMotDePasse">Mot de passe provisoire</label>
              <input id="ancienMotDePasse" type="password" formControlName="ancienMotDePasse" autocomplete="current-password" />
            </div>

            <div class="input-group">
              <label for="nouveauMotDePasse">Nouveau mot de passe</label>
              <input id="nouveauMotDePasse" type="password" formControlName="nouveauMotDePasse" autocomplete="new-password" />
            </div>

            <div class="input-group">
              <label for="confirmationNouveauMotDePasse">Confirmation</label>
              <input id="confirmationNouveauMotDePasse" type="password" formControlName="confirmationNouveauMotDePasse" autocomplete="new-password" />
            </div>

            <button type="submit" class="submit-btn" [disabled]="enChargement">
              {{ enChargement ? 'Mise a jour...' : 'Modifier le mot de passe' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.css']
})
export class FirstLoginPasswordChangeComponent {
  enChargement = false;
  messageErreur = '';
  messageSucces = '';

  readonly formulaire;

  constructor(
    private readonly fb: FormBuilder,
    private readonly serviceProfil: ServiceProfilService,
    private readonly authService: AuthentificationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.formulaire = this.fb.group({
      ancienMotDePasse: ['', Validators.required],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationNouveauMotDePasse: ['', Validators.required]
    });
  }

  soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    if (valeurs.nouveauMotDePasse !== valeurs.confirmationNouveauMotDePasse) {
      this.messageErreur = 'Le nouveau mot de passe et sa confirmation ne correspondent pas.';
      return;
    }

    const validation = this.serviceProfil.validerMotDePasse(valeurs.nouveauMotDePasse ?? '');
    if (!validation.estValide) {
      this.messageErreur = validation.erreurs[0];
      return;
    }

    this.enChargement = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.serviceProfil.mettreAJourMotDePasse({
      motDePasseActuel: valeurs.ancienMotDePasse ?? '',
      nouveauMotDePasse: valeurs.nouveauMotDePasse ?? '',
      confirmationMotDePasse: valeurs.confirmationNouveauMotDePasse ?? ''
    }).subscribe({
      next: () => {
        this.messageSucces = 'Mot de passe modifie avec succes.';
        const retourUrl = this.route.snapshot.queryParamMap.get('retourUrl');
        const destination = retourUrl && !retourUrl.startsWith('/premiere-connexion')
          ? retourUrl
          : this.authService.getRouteTableauDeBord();
        setTimeout(() => {
          void this.router.navigateByUrl(destination);
        }, 400);
        this.enChargement = false;
      },
      error: (error) => {
        this.messageErreur =
          error?.error?.message
          || error?.error
          || error?.message
          || 'Impossible de modifier le mot de passe.';
        this.enChargement = false;
      }
    });
  }
}
