import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { ProfileCompletionService } from '../services/profile-completion.service';
import { DonneesProfil, ServiceProfilService } from '../services/service-profil.service';
import { PhoneInputComponent } from './phone-input/phone-input.component';

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PhoneInputComponent],
  templateUrl: './profile-management.component.html',
  styleUrls: ['../admin/dashboard/admin-dashboard.css', '../company/company-shared.css', './profile-management.component.css']
})
export class ProfileManagementComponent implements OnInit {
  @ViewChild('signatureFileInput') signatureFileInput!: ElementRef<HTMLInputElement>;

  profil: DonneesProfil | null = null;
  enChargement = false;
  enregistrementEnCours = false;
  modificationEmailEnCours = false;
  modificationMotDePasseEnCours = false;
  afficherChampsMotDePasse = false;
  modeEditionProfil = false;
  afficherConfirmationEmail = false;

  /** Aperçu local de la signature (data-URI ou URL) affiché pendant l'édition. */
  signatureApercuLocal: string | null = null;

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
      // Pas de limite de longueur : la valeur peut être une image encodée en Base-64
      nomFichierSignature: ['']
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

    // Synchronise l'aperçu de signature avec les données du profil
    this.signatureApercuLocal = this.profil.nomFichierSignature?.trim() || null;

    this.formulaireConfirmationEmail.reset();
  }

  // ── Gestion de l'import de signature ───────────────────────────────────────

  /**
   * Vrai si la signature de l'utilisateur a deja ete enregistree cote serveur
   * (donc definitive et non modifiable).
   */
  get signatureVerrouillee(): boolean {
    return Boolean(this.profil?.nomFichierSignature?.trim());
  }

  /** Message d'avertissement explicite — affiche AVANT le 1er enregistrement. */
  readonly avertissementSignature =
    "Attention : après l'ajout de votre signature, celle-ci ne pourra plus être modifiée. "
    + "Veuillez vérifier attentivement votre signature avant de la valider.";

  /** Remarque affichee quand la signature existe deja (lecture seule). */
  readonly remarqueSignatureDefinitive =
    "Votre signature est définitive et ne peut plus être modifiée ni supprimée. "
    + "Elle est utilisée dans les documents officiels que vous signez.";

  ouvrirSelecteurFichier(): void {
    // Blocage strict si la signature est deja enregistree (ne peut etre ni modifiee
    // ni remplacee — regle metier).
    if (this.signatureVerrouillee) {
      this.messageErreur = this.remarqueSignatureDefinitive;
      return;
    }

    // 1er enregistrement : avertissement obligatoire avant ouverture du selecteur.
    const confirmation = window.confirm(this.avertissementSignature);
    if (!confirmation) {
      return;
    }
    this.signatureFileInput?.nativeElement.click();
  }

  onSignatureSelectionnee(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;

    // Re-garde-fou : si entre temps la signature a ete posee ailleurs, on bloque.
    if (this.signatureVerrouillee) {
      this.messageErreur = this.remarqueSignatureDefinitive;
      input.value = '';
      return;
    }

    const typesAcceptes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!typesAcceptes.includes(fichier.type)) {
      this.messageErreur = 'Format non supporté. Utilisez PNG, JPG ou WEBP.';
      return;
    }

    const tailleMaxKo = 1024; // 1 Mo
    if (fichier.size > tailleMaxKo * 1024) {
      this.messageErreur = `L'image ne doit pas dépasser ${tailleMaxKo} Ko.`;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      this.signatureApercuLocal = dataUri;
      this.formulaireProfil.get('nomFichierSignature')?.setValue(dataUri);
      this.messageErreur = null;
    };
    reader.readAsDataURL(fichier);

    // Remet l'input a zero pour permettre de re-selectionner le meme fichier
    input.value = '';
  }

  supprimerSignature(): void {
    // Suppression INTERDITE une fois la signature enregistree (regle metier).
    if (this.signatureVerrouillee) {
      this.messageErreur = this.remarqueSignatureDefinitive;
      return;
    }
    // Avant le 1er enregistrement : on autorise a retirer l'apercu local
    // (annulation de la selection avant validation du formulaire).
    this.signatureApercuLocal = null;
    this.formulaireProfil.get('nomFichierSignature')?.setValue('');
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

    const erreursValidationMotDePasse = this.serviceProfil.validerMotDePasse(donneesPass.nouveauMotDePasse);
    if (!erreursValidationMotDePasse.estValide) {
      this.messageErreur = erreursValidationMotDePasse.erreurs[0];
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

    // Capture the submitted signature before the API call so we can verify it was saved.
    const signatureEnvoyee = (this.formulaireProfil.get('nomFichierSignature')?.value ?? '').trim();

    this.serviceProfil.mettreAJourProfil(this.construirePayloadProfil()).subscribe({
      next: (reponse) => {
        this.profil = reponse;
        this.remplirFormulaire();
        this.modeEditionProfil = false;
        this.enregistrementEnCours = false;

        // N'afficher le succès que si la signature soumise est bien retournée par le serveur.
        // Comparaison exacte : évite qu'une valeur mise en cache masque un échec de sauvegarde.
        const signatureRetournee = (reponse.nomFichierSignature ?? '').trim();
        const signatureNonSauvegardee =
          signatureEnvoyee.length > 0 && signatureRetournee !== signatureEnvoyee;

        if (signatureNonSauvegardee) {
          this.messageErreur =
            'La signature n\'a pas pu être sauvegardée. Veuillez réessayer.';
        } else {
          this.messageSucces = 'Profil mis à jour avec succès.';
          setTimeout(() => (this.messageSucces = null), 3000);
        }
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
      RESPONSABLE_STAGE: []
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
