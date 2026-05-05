import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

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
  comptesDemo = [
    { email: 'admin@test.com', motDePasse: 'admin123', role: 'Administrateur' },
    { email: 'stagiaire@test.com', motDePasse: '123456', role: 'Étudiant' },
    { email: 'acad@test.com', motDePasse: '123456', role: 'Encadrant académique' },
    { email: 'pro@test.com', motDePasse: '123456', role: 'Encadrant professionnel' },
    { email: 'resp@test.com', motDePasse: '123456', role: 'Responsable d’entreprise' }
  ];

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

  ngOnInit(): void {
    // Vérifier les messages de déconnexion si nécessaire.
  }

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

  private gererConnexionReussie(reponse: any): void {
    // Backend login returns the role both in the response body and in the JWT "role" claim.
    // The auth service resolves JWT first and falls back to the stored role if needed.
    const role = this.serviceAuthentification.getRoleUtilisateur();

    if (!role) {
      this.messageErreur = 'Connexion réussie, mais le rôle utilisateur est introuvable.';
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
      this.messageErreur = messageBackend || 'Email ou mot de passe invalide.';
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
