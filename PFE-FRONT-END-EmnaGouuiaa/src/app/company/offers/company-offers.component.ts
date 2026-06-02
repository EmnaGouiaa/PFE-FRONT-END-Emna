import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  STAGE_MAX_DURATION_MONTHS,
  STAGE_MIN_DURATION_MONTHS,
  maxDurationMonthsForStartDate,
  notPastDateValidator,
  stagePeriodValidator,
  validateStagePeriod,
} from '../../shared/validators/stage-period.validation';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyOffersService } from '../../services/company/company-offers.service';
import { ProfessionalSupervisorsService } from '../../services/company/professional-supervisors.service';
import { CompanyContext, CompanyOffer, CompanyOfferPayload, ProfessionalSupervisor } from '../../services/company/company.models';

@Component({
  selector: 'app-company-offers-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-offers.component.html',
  styleUrls: ['../company-shared.css']
})
export class CompanyOffersPageComponent implements OnInit {
  context: CompanyContext | null = null;
  offers: CompanyOffer[] = [];
  encadrants: ProfessionalSupervisor[] = [];
  isLoadingEncadrants = false;
  selectedOffer: CompanyOffer | null = null;
  offerForm!: FormGroup;
  assignForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  isAssigning = false;
  isCancelling = false;
  showForm = false;
  showAssignForm = false;
  showDetailsModal = false;
  isEditMode = false;
  /** Mode d'edition courant du formulaire (cf. regle metier validation sujet). */
  currentEditMode: 'FULL' | 'LOCKED' = 'FULL';
  offerToAssign: CompanyOffer | null = null;
  errorMessage = '';
  successMessage = '';

  /** Champs verrouillables ailleurs que descriptionMissions (regle "description-only" — legacy). */
  private readonly nonDescriptionFields = ['titre', 'profilRecherche', 'duree', 'dateDebutPrevue', 'encadrantProId'] as const;
  /**
   * Champs verrouilles APRES validation academique. Les autres champs du formulaire
   * (titre, profilRecherche, encadrantProId) restent modifiables.
   */
  private readonly criticalLockedFields = ['descriptionMissions', 'duree', 'dateDebutPrevue'] as const;
  private readonly allFormFields = ['titre', 'descriptionMissions', 'profilRecherche', 'duree', 'dateDebutPrevue', 'encadrantProId'] as const;

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private companyOffersService: CompanyOffersService,
    private professionalSupervisorsService: ProfessionalSupervisorsService
  ) {}

  ngOnInit(): void {
    this.offerForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3)]],
      descriptionMissions: ['', [Validators.required, Validators.minLength(10)]],
      profilRecherche: ['', [Validators.required, Validators.minLength(2)]],
      duree: [null, [Validators.required, Validators.min(STAGE_MIN_DURATION_MONTHS)]],
      dateDebutPrevue: ['', [Validators.required, notPastDateValidator]],
      encadrantProId: [null, Validators.required]
    }, { validators: [stagePeriodValidator] });

    this.assignForm = this.fb.group({
      emailEtudiant: ['', [Validators.required, Validators.email]]
    });

    this.loadOffers();
  }

  loadOffers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachee a ce compte.";
          this.isLoading = false;
          return;
        }

        this.loadEncadrants(context.responsable.entrepriseId);

        this.companyOffersService
          .listByEntreprise(context.responsable.entrepriseId)
          .pipe(timeout(15000))
          .subscribe({
            next: (offers) => {
              this.offers = offers;
              this.selectedOffer = this.selectedOffer
                ? offers.find((offer) => offer.id === this.selectedOffer?.id) ?? null
                : null;
              this.isLoading = false;
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? 'Impossible de charger les offres.';
              this.isLoading = false;
            }
          });
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  /** Charge les encadrants professionnels de l'entreprise pour le selecteur du formulaire. */
  loadEncadrants(entrepriseId: number): void {
    this.isLoadingEncadrants = true;
    this.professionalSupervisorsService
      .listByEntreprise(entrepriseId)
      .pipe(timeout(15000))
      .subscribe({
        next: (encadrants) => {
          this.encadrants = encadrants ?? [];
          this.isLoadingEncadrants = false;
        },
        error: () => {
          // Non bloquant pour l'affichage des offres : le selecteur affichera l'etat vide.
          this.encadrants = [];
          this.isLoadingEncadrants = false;
        }
      });
  }

  /** Libelle lisible d'un encadrant professionnel pour les options du selecteur. */
  encadrantLabel(enc: ProfessionalSupervisor): string {
    const fullName = `${enc.prenom ?? ''} ${enc.nom ?? ''}`.trim() || enc.email || `Encadrant #${enc.id}`;
    return enc.poste ? `${fullName} — ${enc.poste}` : fullName;
  }

  get hasEncadrants(): boolean {
    return this.encadrants.length > 0;
  }

  /**
   * Message d'erreur du validator de periode (stagePeriodValidator) à afficher dans
   * le formulaire. Renvoie une chaîne vide si la combinaison date/durée respecte
   * la règle Periode 1 / Periode 2.
   */
  get stagePeriodErrorMessage(): string {
    const error = this.offerForm?.errors?.['stagePeriod'];
    if (!error) return '';
    return typeof error === 'object' && error.message ? String(error.message) : '';
  }

  /** Date du jour au format YYYY-MM-DD (local) pour l'attribut min du champ date. */
  /** Plafond de durée selon la date de début saisie (3 mois période 1, 2 mois période 2). */
  get maxDureeForForm(): number {
    const fromDate = maxDurationMonthsForStartDate(this.offerForm?.get('dateDebutPrevue')?.value);
    return fromDate ?? STAGE_MAX_DURATION_MONTHS;
  }

  get todayIso(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  // ── Règles de période de création ────────────────────────────────────────

  /**
   * Fenêtres de création autorisées pour le responsable entreprise :
   *   - Période 1 : du 1er février au 1er juin (inclus)
   *   - Période 2 : du 1er juin au 30 août (inclus)
   * Combinées : du 1er février au 30 août inclus.
   */
  get isCreationPeriodOpen(): boolean {
    const today = new Date();
    const month = today.getMonth() + 1; // 1–12
    const day   = today.getDate();
    if (month < 2 || month > 8) return false;
    if (month === 8 && day > 30) return false;
    return true;
  }

  /** Libellé de la prochaine ouverture (1er février N ou N+1). */
  get nextOpeningLabel(): string {
    const today = new Date();
    const month = today.getMonth() + 1;
    const nextYear = month >= 9 ? today.getFullYear() + 1 : today.getFullYear();
    return `1er février ${nextYear}`;
  }

  /** Message du bandeau de période affiché en haut de la page. */
  get periodBannerText(): string {
    if (this.isCreationPeriodOpen) {
      return 'Période ouverte — vous pouvez créer des offres de stage du 1er février au 1er juin, puis du 1er juin au 30 août.';
    }
    return `Création d'offres fermée jusqu'au ${this.nextOpeningLabel}. Périodes autorisées : 1er février → 1er juin et 1er juin → 30 août.`;
  }

  // ─────────────────────────────────────────────────────────────────────────

  openCreate(): void {
    if (!this.isCreationPeriodOpen) {
      this.errorMessage = `La création d'offres de stage est actuellement fermée. Prochaine ouverture : ${this.nextOpeningLabel}.`;
      return;
    }
    this.isEditMode = false;
    this.showForm = true;
    this.errorMessage = '';
    this.currentEditMode = 'FULL';
    this.applyEditModeLock('FULL');
    this.offerForm.reset({
      titre: '',
      descriptionMissions: '',
      profilRecherche: '',
      duree: null,
      dateDebutPrevue: '',
      encadrantProId: null
    });
  }

  openEdit(offer: CompanyOffer): void {
    if (!this.canEdit(offer)) {
      this.errorMessage = this.getEditDisabledReason(offer) ?? 'Modification impossible.';
      return;
    }
    this.selectedOffer = offer;
    this.isEditMode = true;
    this.showForm = true;
    this.errorMessage = '';
    this.currentEditMode = this.getOfferEditMode(offer);
    // 1. Reactiver tous les controles pour que patchValue propage bien les valeurs.
    this.applyEditModeLock('FULL');
    this.offerForm.patchValue({
      titre: offer.titre,
      descriptionMissions: offer.descriptionMissions,
      profilRecherche: offer.profilRecherche,
      duree: offer.duree,
      dateDebutPrevue: offer.dateDebutPrevue,
      encadrantProId: offer.encadrantProId
    });
    // 2. Puis appliquer les verrouillages selon le mode d'edition de cette offre.
    this.applyEditModeLock(this.currentEditMode);
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
  }

  openAssign(offer: CompanyOffer): void {
    if (!this.canAssign(offer)) {
      this.errorMessage = this.getAssignDisabledReason(offer) ?? "Cette offre n'est plus affectable.";
      return;
    }
    this.offerToAssign = offer;
    this.selectedOffer = offer;
    this.showAssignForm = true;
    this.assignForm.reset({
      emailEtudiant: ''
    });
  }

  closeAssignForm(): void {
    this.showAssignForm = false;
    this.offerToAssign = null;
    this.isAssigning = false;
  }

  openOfferDetails(offer: CompanyOffer): void {
    this.selectedOffer = offer;
    this.showDetailsModal = true;
  }

  closeOfferDetails(): void {
    this.showDetailsModal = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDetailsModal) {
      this.closeOfferDetails();
    }
  }

  saveOffer(): void {
    if (!this.context?.responsable.entrepriseId) return;

    // Vérifie la période de création pour les nouvelles offres
    if (!this.isEditMode && !this.isCreationPeriodOpen) {
      this.errorMessage = `La création d'offres de stage est fermée jusqu'au ${this.nextOpeningLabel}.`;
      this.showForm = false;
      return;
    }

    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    const payload: CompanyOfferPayload = {
      ...this.offerForm.getRawValue(),
      entrepriseId: this.context.responsable.entrepriseId,
      publieeParId: this.context.responsable.id
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.isEditMode && this.selectedOffer
      ? this.companyOffersService.update(this.selectedOffer.id, payload)
      : this.companyOffersService.create(payload);

    request$.pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = this.isEditMode
          ? 'Offre mise a jour et replacee dans le circuit de validation.'
          : 'Offre creee et soumise a validation avec succes.';
        this.isSaving = false;
        this.showForm = false;
        this.loadOffers();
      },
      error: (error) => {
        this.errorMessage = this.extractApiMessage(error, "Impossible d'enregistrer l'offre.");
        this.isSaving = false;
      }
    });
  }

  publish(offer: CompanyOffer): void {
    if (!this.context) return;
    if (!confirm(`Publier l'offre "${offer.titre}" ?`)) return;

    this.companyOffersService.publish(offer.id, this.context.responsable.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Offre publiee avec succes.';
        this.loadOffers();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de publier cette offre.';
      }
    });
  }

  close(offer: CompanyOffer): void {
    if (!confirm(`Fermer l'offre "${offer.titre}" ?`)) return;

    this.companyOffersService.close(offer.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Offre fermee avec succes.';
        this.loadOffers();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de fermer cette offre.';
      }
    });
  }

  isOfferLockedByTerminatedStage(offer: CompanyOffer): boolean {
    return offer.stageTermine === true;
  }

  canEdit(offer: CompanyOffer): boolean {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return false;
    }
    // Etats finaux ou refus definitif : aucune modification.
    if (offer.statut === 'TERMINEE' || offer.statut === 'ARCHIVEE' || offer.statut === 'FERMEE') {
      return false;
    }
    if (offer.statut === 'REFUSEE') {
      return false;
    }
    // EN_ATTENTE : edition libre. VALIDEE/PUBLIEE/AFFECTEE : edition partielle (verrouillage
    // des champs sensibles dans le formulaire), mais le bouton reste actif.
    return true;
  }

  /**
   * Determine le mode d'edition pour le RESPONSABLE_ENTREPRISE :
   *  - FULL   : offre EN_ATTENTE (pas encore approuvee par le Responsable des Stages)
   *             → modification libre integrale.
   *  - LOCKED : offre deja approuvee (VALIDEE / PUBLIEE / AFFECTEE) → verrou partiel sur
   *             description, duree, date de debut. Titre, profil et encadrant restent
   *             modifiables. Toute modif des champs sensibles necessite une nouvelle
   *             validation responsable stages / academique.
   *  Etats finaux (TERMINEE, ARCHIVEE, FERMEE) et REFUSEE → bouton Modifier desactive
   *  via canEdit, on ne reach pas ce mode.
   */
  getOfferEditMode(offer: CompanyOffer): 'FULL' | 'LOCKED' {
    return offer.statut === 'EN_ATTENTE' ? 'FULL' : 'LOCKED';
  }

  /** Motif explique a l'utilisateur (tooltip ou banniere) quand l'edition est restreinte. */
  getEditDisabledReason(offer: CompanyOffer): string | null {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return 'Modification impossible : stage terminé';
    }
    if (offer.statut === 'TERMINEE' || offer.statut === 'ARCHIVEE') {
      return 'Offre terminée — lecture seule, plus aucune modification possible.';
    }
    if (offer.statut === 'FERMEE') {
      return 'Offre fermée — non modifiable.';
    }
    if (offer.statut === 'REFUSEE') {
      return 'Offre refusée par le Responsable des Stages — modification interdite. Créez une nouvelle offre pour toute correction.';
    }
    // Mode LOCKED (offre approuvee) : pas de raison renvoyee — le formulaire reste accessible
    // avec un verrou partiel et une banniere explicative.
    return null;
  }

  /** Applique l'activation/desactivation des controles du formulaire selon le mode. */
  private applyEditModeLock(mode: 'FULL' | 'LOCKED'): void {
    // 1. Tout reactiver pour partir d'un etat connu.
    this.allFormFields.forEach((name) => this.offerForm.get(name)?.enable({ emitEvent: false }));
    // 2. En mode LOCKED (sujet valide), verrouiller UNIQUEMENT les champs sensibles :
    //    descriptionMissions, duree, dateDebutPrevue. Les autres (titre, profil, encadrant)
    //    restent modifiables — toute modif d'un champ sensible necessite une revalidation
    //    academique et est donc bloquee ici.
    if (mode === 'LOCKED') {
      this.criticalLockedFields.forEach((name) => this.offerForm.get(name)?.disable({ emitEvent: false }));
    }
    // FULL : tout reste actif.
  }

  /** Banniere d'information affichee dans le formulaire selon le mode d'edition. */
  get editModeBanner(): string {
    if (this.currentEditMode === 'LOCKED') {
      return 'Cette offre a déjà été approuvée : les champs sensibles '
        + '(description, durée, date de début) sont verrouillés. Pour les modifier, '
        + 'une nouvelle validation est nécessaire (Responsable des Stages / Encadrant '
        + 'Académique). Vous pouvez toujours ajuster le titre, le profil recherché et '
        + 'l’encadrant professionnel.';
    }
    return '';
  }

  canAssign(offer: CompanyOffer): boolean {
    return this.getAssignDisabledReason(offer) === null;
  }

  canCloseOffer(offer: CompanyOffer): boolean {
    return !this.isOfferLockedByTerminatedStage(offer);
  }

  getAssignDisabledReason(offer: CompanyOffer): string | null {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return 'Modification impossible : stage terminé';
    }
    if (offer.stageCree) {
      return 'Stage deja cree';
    }

    switch (offer.statut) {
      case 'VALIDEE':
        return offer.affectable ? null : 'Action indisponible';
      case 'AFFECTEE':
        return 'Offre deja affectee';
      case 'FERMEE':
        return 'Offre fermee';
      case 'PUBLIEE':
      case 'EN_ATTENTE':
        return 'Validation requise';
      case 'REFUSEE':
        return 'Offre refusee';
      default:
        return 'Action indisponible';
    }
  }

  get activeOffers(): CompanyOffer[] {
    return this.offers.filter((offer) => !offer.stageCree && !['AFFECTEE', 'FERMEE'].includes(offer.statut));
  }

  get archivedOffers(): CompanyOffer[] {
    return this.offers.filter((offer) => offer.stageCree || ['AFFECTEE', 'FERMEE'].includes(offer.statut));
  }

  /**
   * Libellé utilisateur du statut d'une offre, aligné sur le cycle de vie complet :
   * En attente d'approbation / Approuvée / En attente de validation académique /
   * En cours de stage / Terminée. Plus REFUSEE comme etat metier final.
   *
   * Mapping :
   *  - EN_ATTENTE                              → "En attente d'approbation" (responsable stages)
   *  - VALIDEE / PUBLIEE                       → "Approuvée" (par le responsable stages)
   *  - AFFECTEE + sujet non valide             → "En attente de validation académique"
   *  - AFFECTEE + sujet VALIDEE                → "En cours de stage"
   *  - TERMINEE / ARCHIVEE (legacy) / FERMEE   → "Terminée"
   *  - REFUSEE                                 → "Refusée"
   */
  getOfferStatusLabel(offer: CompanyOffer): string {
    if (offer.statut === 'TERMINEE' || offer.statut === 'ARCHIVEE' || offer.statut === 'FERMEE') {
      return 'Terminée';
    }
    if (offer.statut === 'REFUSEE') return 'Refusée';
    if (offer.statut === 'AFFECTEE') {
      return offer.statutSujet === 'VALIDEE' ? 'En cours de stage' : 'En attente de validation académique';
    }
    if (offer.statut === 'PUBLIEE' || offer.statut === 'VALIDEE') return 'Approuvée';
    if (offer.statut === 'EN_ATTENTE') return 'En attente d\'approbation';
    return (offer.statut || '').replace(/_/g, ' ');
  }

  canCancelAssignment(offer: CompanyOffer): boolean {
    if (offer.annulationAffectationAutorisee === true) {
      return true;
    }
    if (offer.annulationAffectationAutorisee === false) {
      return false;
    }
    if (offer.stageTermine || offer.statutSujet === 'VALIDEE') {
      return false;
    }
    if (!offer.affectationActive && offer.statut !== 'AFFECTEE' && !offer.stageCree) {
      return false;
    }
    const dateDebut = offer.dateDebutPrevue?.trim();
    if (!dateDebut) {
      return offer.affectationActive ?? offer.statut === 'AFFECTEE';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const debut = new Date(dateDebut);
    debut.setHours(0, 0, 0, 0);
    return !Number.isNaN(debut.getTime()) && debut.getTime() > today.getTime();
  }

  getCancelAssignmentDisabledReason(offer: CompanyOffer): string {
    if (this.canCancelAssignment(offer)) {
      return '';
    }
    if (offer.stageTermine) {
      return 'Le stage est terminé : annulation impossible.';
    }
    if (offer.statutSujet === 'VALIDEE') {
      return 'Le sujet a été validé par l\'encadrant académique : annulation impossible.';
    }
    if (offer.dateDebutPrevue) {
      return 'La date de début du stage est atteinte ou passée : annulation impossible.';
    }
    return 'Aucune affectation annulable pour cette offre.';
  }

  assignStudent(): void {
    if (!this.offerToAssign) return;
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const emailEtudiant = String(this.assignForm.getRawValue().emailEtudiant ?? '').trim();
    console.log('[Affectation offre] Email saisi pour affectation:', emailEtudiant);
    if (!confirm(`Affecter l'etudiant ${emailEtudiant} a l'offre "${this.offerToAssign.titre}" ?`)) return;

    this.isAssigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyOffersService
      .assignStudent(this.offerToAssign.id, { emailEtudiant })
      .pipe(timeout(15000))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message || 'Stage cree avec succes.';
          this.closeAssignForm();
          this.loadOffers();
        },
        error: (error) => {
          this.errorMessage = this.extractApiMessage(error, "Impossible d'affecter cet etudiant a l'offre.");
          this.isAssigning = false;
        }
      });
  }

  cancelAssignment(offer: CompanyOffer): void {
    if (!this.canCancelAssignment(offer)) {
      this.errorMessage = this.getCancelAssignmentDisabledReason(offer)
        || "Aucune affectation active trouvee pour cette offre.";
      return;
    }

    const confirmation = confirm(
      `Annuler l'affectation de l'offre "${offer.titre}" ?\n\n` +
      `L'etudiant ne sera plus considere comme stagiaire affecte et l'offre pourra redevenir disponible.`
    );

    if (!confirmation) {
      return;
    }

    this.isCancelling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyOffersService
      .cancelAssignment(offer.id)
      .pipe(timeout(15000))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message || "Affectation annulee avec succes.";
          this.showDetailsModal = false;
          this.offerToAssign = null;
          this.isCancelling = false;
          this.loadOffers();
        },
        error: (error) => {
          this.errorMessage = this.extractApiMessage(error, "Impossible d'annuler cette affectation.");
          this.isCancelling = false;
        }
      });
  }

  private extractApiMessage(error: any, fallback: string): string {
    const TECHNICAL_PATTERNS = [
      /^\[CONTRAINTE DB\]/i,
      /data too long/i,
      /data truncat/i,
      /foreign key constraint/i,
      /sql/i,
      /hibernate/i,
      /jdbc/i
    ];

    const sanitize = (msg: string): string | null => {
      if (!msg?.trim()) return null;
      if (TECHNICAL_PATTERNS.some((p) => p.test(msg))) return null;
      return msg;
    };

    const fromErrorString = typeof error?.error === 'string' ? sanitize(error.error) : null;
    if (fromErrorString) return fromErrorString;

    const fromErrorMessage = typeof error?.error?.message === 'string' ? sanitize(error.error.message) : null;
    if (fromErrorMessage) return fromErrorMessage;

    const fromMessage = typeof error?.message === 'string' ? sanitize(error.message) : null;
    if (fromMessage) return fromMessage;

    return fallback;
  }
}
