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
  styleUrls: ['./login.css']
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
      .pipe(finalize(() => this.enChargement = false))
      .subscribe({
        next: (reponse) => this.gererConnexionReussie(reponse),
        error: (erreur) => this.gererErreurConnexion(erreur)
      });
  }

  private gererConnexionReussie(reponse: any): void {
    const role = reponse.role; // verify this with backend

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
      case RoleUtilisateur.RESPONSABLE_STAGE:
        this.router.navigate(['/responsable/tableau-de-bord']);
        break;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        this.router.navigate(['/entreprise/tableau-de-bord']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  private gererErreurConnexion(erreur: any): void {
    if (erreur.status === 401 || erreur.status === 403) {
      this.messageErreur = erreur.error?.message || 'Email ou mot de passe invalide.';
    } else if (erreur.status === 0) {
      this.messageErreur = 'Serveur inaccessible. Veuillez vérifier votre connexion.';
    } else {
      this.messageErreur = 'La connexion a échoué. Veuillez réessayer.';
    }
  }
}
