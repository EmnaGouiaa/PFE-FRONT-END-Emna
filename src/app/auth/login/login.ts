import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  formulaireConnexion: FormGroup;
  enChargement = false;
  messageErreur = '';
  messageSucces = '';

  constructor(
    private fb: FormBuilder,
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {
    this.formulaireConnexion = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.formulaireConnexion.invalid) {
      this.formulaireConnexion.markAllAsTouched();
      return;
    }

    this.messageErreur = '';
    this.messageSucces = '';
    this.enChargement = true;

    const { email, motDePasse } = this.formulaireConnexion.value;

    this.serviceAuthentification.connexion({ email: email.trim(), motDePasse })
      .pipe(
        finalize(() => {
          this.enChargement = false;
        })
      )
      .subscribe({
        next: (reponse) => {
          this.gererConnexionReussie(reponse);
        },
        error: (erreur) => {
          this.gererErreurConnexion(erreur);
        }
      });
  }

  private gererConnexionReussie(reponse: unknown): void {
    void reponse;
    const role = this.serviceAuthentification.getRoleUtilisateur();

    if (!role) {
      this.messageErreur = 'Connexion réussie, mais le rôle utilisateur est introuvable.';
      return;
    }

    if (this.serviceAuthentification.doitChangerMotDePasse()) {
      this.router.navigate(['/premiere-connexion']);
      return;
    }

    this.router.navigate([this.serviceAuthentification.getRouteTableauDeBord(role)]);
  }

  private gererErreurConnexion(erreur: any): void {
    const messageBackend =
      (typeof erreur?.error === 'string' ? erreur.error : erreur?.error?.message) ||
      erreur?.message ||
      '';

    if (erreur?.status === 400) {
      this.messageErreur = messageBackend || 'Requête invalide. Veuillez vérifier vos informations.';
      return;
    }

    if (erreur?.status === 401 || erreur?.status === 403) {
      this.messageErreur = messageBackend || 'E-mail ou mot de passe invalide.';
      return;
    }

    if (erreur?.status === 0) {
      this.messageErreur = 'Serveur inaccessible. Veuillez vérifier votre connexion.';
      return;
    }

    if (erreur instanceof Error) {
      this.messageErreur = erreur.message || 'La connexion a échoué. Veuillez réessayer.';
      return;
    }

    this.messageErreur = messageBackend || 'La connexion a échoué. Veuillez réessayer.';
  }
}
