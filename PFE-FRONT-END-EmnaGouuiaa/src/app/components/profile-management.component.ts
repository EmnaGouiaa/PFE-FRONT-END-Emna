import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { ProfileCompletionService } from '../services/profile-completion.service';
import { DonneesProfil, ServiceProfilService } from '../services/service-profil.service';

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile-management.component.html',
  styleUrls: ['../admin/dashboard/admin-dashboard.css', '../company/company-shared.css', './profile-management.component.css']
})
export class ProfileManagementComponent implements OnInit {
  profil: DonneesProfil | null = null;
  enChargement = false;
  enregistrementEnCours = false;
  modificationEmailEnCours = false;
  modificationMotDePasseEnCours = false;
  afficherChampsMotDePasse = false;
  modeEditionProfil = false;
  afficherConfirmationEmail = false;

  formulaireProfil!: FormGroup;
  formulaireConfirmationEmail!: FormGroup;
  formulaireMotDePasse!: FormGroup;

  messageErreur: string | null = null;
  messageSucces: string | null = null;
  messageErreurConfirmationEmail: string | null = null;
  erreursValidation: string[] = [];

  constructor(
    private serviceProfil: ServiceProfilService,
    private profileCompletionService: ProfileCompletionService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initialiserFormulaires();
    this.chargerProfil();
  }

  get roleLabel(): string {
    return this.profil ? this.getNomAffichageRole(this.profil.role) : 'Utilisateur';
  }

  get hasSignature(): boolean {
    return Boolean(this.profil?.nomFichierSignature?.trim());
  }

  get signatureRequired(): boolean {
    return this.profileCompletionService.requiresSignatureForRole(this.profil?.role);
  }

  get showSignatureReminder(): boolean {
    return this.signatureRequired && !this.hasSignature;
  }

  get signatureStatusLabel(): string {
    if (!this.signatureRequired) return 'Non requise';
    return this.hasSignature ? 'Disponible' : 'Manquante';
  }

  initialiserFormulaires(): void {
    this.formulaireProfil = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.maxLength(20)]],
      adresse: [''],
      poste: [''],
      service: [''],
      specialite: [''],
      grade: [''],
      matricule: [''],
      dateNaiss: [''],
      nomFichierSignature: ['', [Validators.maxLength(255)]]
    });

    this.formulaireConfirmationEmail = this.fb.group({
      motDePasse: ['', Validators.required]
    });

    this.formulaireMotDePasse = this.fb.group({
      motDePasseActuel: ['', Validators.required],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationMotDePasse: ['', Validators.required]
    });
  }

  chargerProfil(): void {
    this.enChargement = true;
    this.messageErreur = null;

    this.serviceProfil.getProfil().subscribe({
      next: (profil) => {
        this.profil = profil;
        this.remplirFormulaire();
        this.modeEditionProfil = false;
        this.enChargement = false;
      },
      error: (err) => {
        this.messageErreur = err?.error?.message || 'Échec du chargement du profil.';
        this.enChargement = false;
      }
    });
  }

  remplirFormulaire(): void {
    if (!this.profil) return;

    this.formulaireProfil.patchValue({
      email: this.profil.email,
      prenom: this.profil.prenom,
      nom: this.profil.nom,
      telephone: this.profil.telephone || '',
      adresse: this.profil.adresse || '',
      poste: this.profil.poste || '',
      service: this.profil.service || '',
      specialite: this.profil.specialite || '',
      grade: this.profil.grade || '',
      matricule: this.profil.matricule || '',
      dateNaiss: this.profil.dateNaiss || '',
      nomFichierSignature: this.profil.nomFichierSignature || ''
    });

    this.formulaireConfirmationEmail.reset();
  }

  champInvalide(formulaire: FormGroup, nomChamp: string): boolean {
    const control = formulaire.get(nomChamp);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  activerEditionProfil(): void {
    this.modeEditionProfil = true;
    this.messageErreur = null;
    this.messageSucces = null;
  }

  annulerEditionProfil(): void {
    this.modeEditionProfil = false;
    this.afficherConfirmationEmail = false;
    this.messageErreurConfirmationEmail = null;
    this.formulaireConfirmationEmail.reset();
    this.remplirFormulaire();
  }

  mettreAJourProfil(): void {
    if (!this.modeEditionProfil) {
      this.activerEditionProfil();
      return;
    }

    if (this.formulaireProfil.invalid) {
      this.marquerChampsCommeTouches(this.formulaireProfil);
      return;
    }

    if (this.emailModifie()) {
      this.ouvrirConfirmationEmail();
      return;
    }

    this.enregistrerProfilSansEmail();
  }

  confirmerModificationEmail(): void {
    if (this.formulaireConfirmationEmail.invalid) {
      this.marquerChampsCommeTouches(this.formulaireConfirmationEmail);
      return;
    }

    this.enregistrementEnCours = true;
    this.modificationEmailEnCours = true;
    this.messageErreur = null;
    this.messageSucces = null;
    this.messageErreurConfirmationEmail = null;

    const valeursProfil = this.formulaireProfil.getRawValue();
    const motDePasseActuel = this.formulaireConfirmationEmail.get('motDePasse')?.value;

    this.serviceProfil.modifierAdresseEmail({
      email: valeursProfil.email,
      motDePasseActuel
    }).pipe(
      switchMap(() => this.serviceProfil.mettreAJourProfil(this.construirePayloadProfil()))
    ).subscribe({
      next: (profil) => {
        this.profil = profil;
        this.remplirFormulaire();
        this.messageSucces = 'Adresse e-mail modifiée avec succès.';
        this.modeEditionProfil = false;
        this.afficherConfirmationEmail = false;
        this.formulaireConfirmationEmail.reset();
        this.enregistrementEnCours = false;
        this.modificationEmailEnCours = false;
        setTimeout(() => (this.messageSucces = null), 3000);
      },
      error: (err) => {
        const message = this.extraireMessageErreur(err, "Erreur lors de la modification de l'adresse e-mail.");
        this.messageErreurConfirmationEmail = message.includes('Mot de passe') ? 'Mot de passe incorrect' : message;
        this.enregistrementEnCours = false;
        this.modificationEmailEnCours = false;
      }
    });
  }

  annulerModificationEmail(): void {
    if (this.profil) {
      this.formulaireProfil.patchValue({ email: this.profil.email });
    }
    this.afficherConfirmationEmail = false;
    this.messageErreurConfirmationEmail = null;
    this.formulaireConfirmationEmail.reset();
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
    this.messageErreur = null;
    this.messageSucces = null;

    this.serviceProfil.mettreAJourMotDePasse(donneesPass).subscribe({
      next: () => {
        this.messageSucces = 'Mot de passe mis à jour.';
        this.modificationMotDePasseEnCours = false;
        this.formulaireMotDePasse.reset();
        this.afficherChampsMotDePasse = false;
        setTimeout(() => (this.messageSucces = null), 3000);
      },
      error: (err) => {
        this.messageErreur = this.extraireMessageErreur(err, 'Erreur de mise à jour du mot de passe.');
        this.modificationMotDePasseEnCours = false;
      }
    });
  }

  marquerChampsCommeTouches(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => control.markAsTouched());
  }

  preparerAjoutSignature(): void {
    this.activerEditionProfil();
    this.formulaireProfil.get('nomFichierSignature')?.markAsTouched();
  }

  getNomAffichageRole(role: string): string {
    return this.serviceProfil.getNomAffichageRole(role);
  }

  afficherChampSpecifique(nomChamp: string): boolean {
    if (!this.profil) return false;
    const autorises = this.profil.champsProfilAutorises?.length
      ? this.profil.champsProfilAutorises
      : this.getChampsProfilParDefaut(this.profil.role);
    return autorises.includes(nomChamp);
  }

  get hasSpecificProfileFields(): boolean {
    return [
      'dateNaiss',
      'matricule',
      'grade',
      'specialite',
      'poste',
      'service'
    ].some((field) => this.afficherChampSpecifique(field));
  }

  formaterDate(date: string): string {
    return this.serviceProfil.formaterDate(date);
  }

  private extraireMessageErreur(err: any, fallback: string): string {
    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (err?.error && typeof err.error === 'object') {
      const firstMessage = Object.values(err.error).find((value) => typeof value === 'string' && value.trim());
      if (firstMessage) {
        return String(firstMessage);
      }
    }

    return err?.error?.message || err?.message || fallback;
  }

  private ouvrirConfirmationEmail(): void {
    this.afficherConfirmationEmail = true;
    this.messageErreurConfirmationEmail = null;
    this.formulaireConfirmationEmail.reset();
  }

  private enregistrerProfilSansEmail(): void {
    this.enregistrementEnCours = true;
    this.messageErreur = null;
    this.messageSucces = null;

    this.serviceProfil.mettreAJourProfil(this.construirePayloadProfil()).subscribe({
      next: (reponse) => {
        this.messageSucces = 'Profil mis à jour avec succès.';
        this.profil = reponse;
        this.remplirFormulaire();
        this.modeEditionProfil = false;
        this.enregistrementEnCours = false;
        setTimeout(() => (this.messageSucces = null), 3000);
      },
      error: (err) => {
        this.messageErreur = this.extraireMessageErreur(err, 'Erreur lors de la mise à jour.');
        this.enregistrementEnCours = false;
      }
    });
  }

  private construirePayloadProfil() {
    const valeurs = this.formulaireProfil.getRawValue();
    return {
      prenom: valeurs.prenom,
      nom: valeurs.nom,
      telephone: valeurs.telephone,
      adresse: valeurs.adresse,
      poste: this.afficherChampSpecifique('poste') ? valeurs.poste : undefined,
      service: this.afficherChampSpecifique('service') ? valeurs.service : undefined,
      specialite: this.afficherChampSpecifique('specialite') ? valeurs.specialite : undefined,
      grade: this.afficherChampSpecifique('grade') ? valeurs.grade : undefined,
      matricule: this.afficherChampSpecifique('matricule') ? valeurs.matricule : undefined,
      dateNaiss: this.afficherChampSpecifique('dateNaiss') ? valeurs.dateNaiss : undefined,
      nomFichierSignature: valeurs.nomFichierSignature
    };
  }

  private getChampsProfilParDefaut(role: string): string[] {
    const communs = ['email', 'nom', 'prenom', 'telephone', 'adresse', 'nomFichierSignature'];
    const specifiques: Record<string, string[]> = {
      STAGIAIRE: ['dateNaiss', 'matricule'],
      ENCADRANT_ACADEMIQUE: ['grade', 'specialite'],
      ENCADRANT_PROFESSIONNEL: ['poste', 'service'],
      RESPONSABLE_ENTREPRISE: ['poste', 'service'],
      RESPONSABLE_SERVICE_STAGES: ['service'],
      RESPONSABLE_UNIVERSITAIRE_STAGES: []
    };
    return [...communs, ...(specifiques[role] ?? [])];
  }

  private emailModifie(): boolean {
    if (!this.profil) return false;
    const emailFormulaire = this.normaliserEmail(this.formulaireProfil.get('email')?.value);
    const emailActuel = this.normaliserEmail(this.profil.email);
    return emailFormulaire !== emailActuel;
  }

  private normaliserEmail(email: unknown): string {
    return String(email ?? '').trim().toLowerCase();
  }
}
