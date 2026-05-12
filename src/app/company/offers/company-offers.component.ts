import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyOffersService } from '../../services/company/company-offers.service';
import { CompanyContext, CompanyOffer, CompanyOfferPayload } from '../../services/company/company.models';

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
  offerToAssign: CompanyOffer | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private companyContextService: CompanyContextService,
    private companyOffersService: CompanyOffersService
  ) {}

  ngOnInit(): void {
    this.offerForm = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3)]],
      descriptionMissions: ['', [Validators.required, Validators.minLength(10)]],
      profilRecherche: ['', [this.optionalMinLengthValidator(2)]],
      duree: [null, [this.positiveIntegerValidator()]],
      dateDebutPrevue: ['', [Validators.required, this.todayOrFutureDateValidator()]]
    });

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

  openCreate(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditMode = false;
    this.showForm = true;
    this.offerForm.reset({
      titre: '',
      descriptionMissions: '',
      profilRecherche: '',
      duree: null,
      dateDebutPrevue: ''
    });
  }

  openEdit(offer: CompanyOffer): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedOffer = offer;
    this.isEditMode = true;
    this.showForm = true;
    this.offerForm.patchValue({
      titre: offer.titre,
      descriptionMissions: offer.descriptionMissions,
      profilRecherche: offer.profilRecherche,
      duree: offer.duree,
      dateDebutPrevue: offer.dateDebutPrevue
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.offerForm.reset({
      titre: '',
      descriptionMissions: '',
      profilRecherche: '',
      duree: null,
      dateDebutPrevue: ''
    });
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
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      this.errorMessage = this.getOfferFormValidationMessage();
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
          ? "Offre modifiee avec succes. Son statut a ete mis a jour selon les regles de validation."
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

  canEdit(offer: CompanyOffer): boolean {
    return this.getEditDisabledReason(offer) === null;
  }

  getEditDisabledReason(offer: CompanyOffer): string | null {
    if (offer.stageCree || offer.statut === 'AFFECTEE') {
      return 'Offre deja affectee a un stage';
    }

    if (offer.statut === 'FERMEE') {
      return 'Offre fermee';
    }

    return null;
  }

  canAssign(offer: CompanyOffer): boolean {
    return this.getAssignDisabledReason(offer) === null;
  }

  getAssignDisabledReason(offer: CompanyOffer): string | null {
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

  getOfferStatusLabel(offer: CompanyOffer): string {
    if (offer.stageCree) {
      return 'Stage cree';
    }

    if (offer.statut === 'AFFECTEE') {
      return 'Deja affectee';
    }

    return offer.statut.replace(/_/g, ' ');
  }

  getOfferFieldError(fieldName: string): string {
    const control = this.offerForm.get(fieldName);
    if (!control || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }

    if (control.hasError('minlength')) {
      if (fieldName === 'titre') {
        return 'Le titre doit contenir au moins 3 caracteres.';
      }
      if (fieldName === 'descriptionMissions') {
        return 'La description doit contenir au moins 10 caracteres.';
      }
      return 'La valeur saisie est trop courte.';
    }

    if (control.hasError('invalidPositiveInteger')) {
      return 'La duree doit etre un nombre entier positif.';
    }

    if (control.hasError('pastDate')) {
      return 'La date de debut doit etre egale ou posterieure a la date du jour.';
    }

    if (control.hasError('optionalMinLength')) {
      return 'Le profil recherche doit contenir au moins 2 caracteres.';
    }

    return '';
  }

  private getOfferFormValidationMessage(): string {
    const rawValue = this.offerForm.getRawValue();
    if (!String(rawValue.titre ?? '').trim()
      || !String(rawValue.descriptionMissions ?? '').trim()
      || !String(rawValue.dateDebutPrevue ?? '').trim()) {
      return 'Tous les champs obligatoires doivent être renseignés.';
    }

    return 'Les données saisies sont invalides.';
  }

  canCancelAssignment(offer: CompanyOffer): boolean {
    return offer.stageCree || offer.statut === 'AFFECTEE';
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
      this.errorMessage = "Aucune affectation active trouvee pour cette offre.";
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
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private positiveIntegerValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const numericValue = Number(value);
      if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return { invalidPositiveInteger: true };
      }

      return null;
    };
  }

  private todayOrFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return null;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(`${value}T00:00:00`);
      if (Number.isNaN(selectedDate.getTime())) {
        return { pastDate: true };
      }

      return selectedDate < today ? { pastDate: true } : null;
    };
  }

  private optionalMinLengthValidator(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return null;
      }

      return value.length < minLength ? { optionalMinLength: true } : null;
    };
  }
}
