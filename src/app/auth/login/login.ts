import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  formulaireConnexion: FormGroup;
  enChargement = false;
  messageErreur = '';
  messageSucces = '';
  comptesDemo = [
    { email: 'admin@pfe.tn', motDePasse: 'admin123', role: 'Administrateur' },
    { email: 'student@pfe.tn', motDePasse: 'admin123', role: 'Étudiant' },
    { email: 'teacher@pfe.tn', motDePasse: 'admin123', role: 'Enseignant' },
    { email: 'company@pfe.tn', motDePasse: 'admin123', role: 'Responsable Entreprise' },
    { email: 'internship@pfe.tn', motDePasse: 'admin123', role: 'Service des Stages' }
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
    // Vérifier les messages de déconnexion si nécessaire
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
    // Use the role stored by AuthentificationService (derived from JWT when possible).
    // This avoids redirecting based on an inconsistent/misparsed response field.
    const role = this.serviceAuthentification.getRoleUtilisateur();

    if (!role) {
      this.messageErreur = 'Connexion réussie, mais le rôle utilisateur est introuvable dans le token.';
      return;
    }

    switch (role) {
      case RoleUtilisateur.ADMINISTRATEUR:
        this.router.navigate(['/admin/tableau-de-bord']);
        break;
      case RoleUtilisateur.STAGIAIRE:
        this.router.navigate(['/etudiant/tableau-de-bord']);
        break;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        this.router.navigate(['/enseignant/tableau-de-bord']);
        break;
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
        this.router.navigate(['/responsable/tableau-de-bord']);
        break;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        this.router.navigate(['/entreprise/tableau-de-bord']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
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
