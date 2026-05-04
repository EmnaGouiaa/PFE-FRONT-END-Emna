import { Component, OnInit } from '@angular/core';
import { ServiceProfilService, DonneesProfil, MiseAJourProfil, MiseAJourMotDePasse } from '../services/service-profil.service';
import { AuthentificationService } from '../services/authentification.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile-management.component.html',
  styleUrls: ['./profile-management.component.css']
})
export class ProfileManagementComponent implements OnInit {
  
  profil: DonneesProfil | null = null;
  enChargement = false;
  enregistrementEnCours = false;
  modificationMotDePasseEnCours = false;
  afficherChampsMotDePasse = false;
  
  formulaireProfil!: FormGroup;
  formulaireMotDePasse!: FormGroup;
  
  messageErreur: string | null = null;
  messageSucces: string | null = null;
  erreursValidation: string[] = [];
  
  constructor(
    private serviceProfil: ServiceProfilService,
    private serviceAuthentification: AuthentificationService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initialiserFormulaires();
    this.chargerProfil();
  }

  initialiserFormulaires(): void {
    this.formulaireProfil = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.maxLength(20)]],
      adresse: [''],
      poste: [''],
      specialite: ['']
    });

    this.formulaireMotDePasse = this.fb.group({
      motDePasseActuel: ['', Validators.required],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationMotDePasse: ['', Validators.required]
    });
  }

  chargerProfil(): void {
    this.enChargement = true;
    this.serviceProfil.getProfil().subscribe({
      next: (profil) => {
        this.profil = profil;
        this.remplirFormulaire();
        this.enChargement = false;
      },
      error: () => {
        this.messageErreur = 'Échec du chargement du profil.';
        this.enChargement = false;
      }
    });
  }

  remplirFormulaire(): void {
    if (!this.profil) return;
    this.formulaireProfil.patchValue({
      prenom: this.profil.prenom,
      nom: this.profil.nom,
      telephone: this.profil.telephone || '',
      adresse: this.profil.adresse || '',
      poste: this.profil.poste || '',
      specialite: this.profil.specialite || ''
    });
  }

  mettreAJourProfil(): void {
    if (this.formulaireProfil.invalid) {
      this.marquerChampsCommeTouches(this.formulaireProfil);
      return;
    }

    this.enregistrementEnCours = true;
    this.serviceProfil.mettreAJourProfil(this.formulaireProfil.value).subscribe({
      next: (reponse) => {
        this.messageSucces = 'Profil mis à jour avec succès !';
        this.profil = reponse;
        this.enregistrementEnCours = false;
        setTimeout(() => this.messageSucces = null, 3000);
      },
      error: (err) => {
        this.messageErreur = err.error?.message || 'Erreur lors de la mise à jour.';
        this.enregistrementEnCours = false;
      }
    });
  }

  mettreAJourMotDePasse(): void {
    if (this.formulaireMotDePasse.invalid) {
      this.marquerChampsCommeTouches(this.formulaireMotDePasse);
      return;
    }

    const donneesPass = this.formulaireMotDePasse.value;
    if (donneesPass.nouveauMotDePasse !== donneesPass.confirmationMotDePasse) {
      this.messageErreur = 'Le nouveau mot de passe et sa confirmation ne correspondent pas.';
      return;
    }

    this.modificationMotDePasseEnCours = true;
    this.serviceProfil.mettreAJourMotDePasse(donneesPass).subscribe({
      next: () => {
        this.messageSucces = 'Mot de passe mis à jour !';
        this.modificationMotDePasseEnCours = false;
        this.formulaireMotDePasse.reset();
        this.afficherChampsMotDePasse = false;
        setTimeout(() => this.messageSucces = null, 3000);
      },
      error: (err) => {
        this.messageErreur = err.error?.message || 'Erreur de mise à jour du mot de passe.';
        this.modificationMotDePasseEnCours = false;
      }
    });
  }

  desactiverCompte(): void {
    if (!confirm('Voulez-vous vraiment désactiver votre compte ?')) return;
    this.serviceProfil.desactiverCompte().subscribe({
      next: () => {
        alert('Compte désactivé. Vous allez être déconnecté.');
        this.deconnexion();
      }
    });
  }

  deconnexion(): void {
    this.serviceAuthentification.deconnexion();
    this.router.navigate(['/connexion']);
  }

  marquerChampsCommeTouches(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => control.markAsTouched());
  }

  getNomAffichageRole(role: string): string {
    return this.serviceProfil.getNomAffichageRole(role);
  }

  formaterDate(date: string): string {
    return this.serviceProfil.formaterDate(date);
  }
}
