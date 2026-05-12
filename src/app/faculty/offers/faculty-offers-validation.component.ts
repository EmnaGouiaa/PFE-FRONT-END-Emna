import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { Entreprise, EntreprisesService } from '../../services/entreprises.service';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyOffer } from '../../services/faculty/faculty.models';

interface FacultyOfferDraft {
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
  entrepriseId: number | null;
}

@Component({
  selector: 'app-faculty-offers-validation-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Validation des offres de stage</h1>
          <p>
            Les offres soumises par les entreprises restent invisibles pour les etudiants
            tant qu'elles n'ont pas ete validees par le responsable des stages.
          </p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" (click)="openCreateForm()" [disabled]="isLoading || isActing">
            Publier une offre
          </button>
          <button type="button" class="btn btn-secondary" (click)="loadOffers()" [disabled]="isLoading">
            Actualiser
          </button>
        </div>
      </header>

      <div class="support-banner">
        Regle metier : une offre creee par l'entreprise passe d'abord par cette file de validation avant diffusion.
        Une offre creee par le responsable des stages est enregistree directement comme validee.
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">En attente</div>
          <span class="stat-value">{{ offers.length }}</span>
          <div class="stat-subtitle">Offres a traiter par la faculte</div>
        </article>

        <article class="stat-card">
          <div class="stat-label">Selection</div>
          <span class="stat-value" style="font-size: 1.15rem;">{{ selectedOffer?.entrepriseNom || 'Aucune' }}</span>
          <div class="stat-subtitle">
            {{ selectedOffer ? ('Offre #' + selectedOffer.id + ' prete a etre analysee') : 'Selectionnez une offre pour voir les details' }}
          </div>
        </article>
      </section>

      <section class="toolbar">
        <input
          class="input"
          type="text"
          placeholder="Rechercher par titre, entreprise, competences..."
          [(ngModel)]="searchQuery"
          (input)="applyFilters()"
        />
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des offres en attente...</div>

      <section *ngIf="!isLoading">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Offres proposees par les entreprises</h2>
              <div class="panel-subtitle">{{ filteredOffers.length }} offre(s) a valider</div>
            </div>
          </div>

          <div *ngIf="filteredOffers.length === 0" class="empty-card">
            Aucune offre en attente de validation pour le moment.
          </div>

          <div class="offer-card-grid" *ngIf="filteredOffers.length > 0">
            <article class="offer-card" *ngFor="let offer of filteredOffers" (click)="selectOffer(offer)">
              <div class="offer-card-top">
                <div>
                  <h3>{{ offer.titre || ('Offre #' + offer.id) }}</h3>
                  <p>{{ offer.entrepriseNom || 'Entreprise non renseignee' }}</p>
                </div>
                <span class="status-pill" [ngClass]="'status-' + offer.statut">{{ getOfferStateLabel(offer) }}</span>
              </div>

              <p class="offer-card-description">{{ offer.descriptionMissions || 'Description non renseignee' }}</p>

              <div class="offer-card-meta">
                <div class="offer-meta-item">
                  <span class="label">Date de debut</span>
                  <span class="value">{{ offer.dateDebutPrevue || 'Non definie' }}</span>
                </div>
                <div class="offer-meta-item">
                  <span class="label">Duree</span>
                  <span class="value">{{ offer.duree ? offer.duree + ' mois' : 'Non precisee' }}</span>
                </div>
                <div class="offer-meta-item">
                  <span class="label">Profil</span>
                  <span class="value">{{ offer.profilRecherche || 'Non precise' }}</span>
                </div>
              </div>

              <div class="offer-card-foot">
                <span class="status-pill status-warning" *ngIf="offer.statut === 'EN_ATTENTE'">Validation en attente</span>
                <span class="status-pill status-VALIDEE" *ngIf="offer.statut === 'VALIDEE'">Deja validee</span>
              </div>

              <div class="inline-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="selectOffer(offer); $event.stopPropagation()"
                >
                  Voir details
                </button>
                <button
                  type="button"
                  class="btn btn-success"
                  *ngIf="offer.statut === 'EN_ATTENTE'"
                  (click)="selectOffer(offer); approveSelectedOffer(); $event.stopPropagation()"
                  [disabled]="isActing"
                >
                  Approuver
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  *ngIf="offer.statut === 'EN_ATTENTE'"
                  (click)="selectOffer(offer); rejectSelectedOffer(); $event.stopPropagation()"
                  [disabled]="isActing"
                >
                  Refuser
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>

      <div class="modal-overlay" *ngIf="showDetailsModal && selectedOffer" (click)="closeOfferDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Detail et validation de l'offre</h2>
            <button type="button" class="btn-close" (click)="closeOfferDetails()">x</button>
          </div>

          <div class="form">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Titre</span>
                <span class="value">{{ selectedOffer.titre || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedOffer.entrepriseNom || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Date de debut</span>
                <span class="value">{{ selectedOffer.dateDebutPrevue || 'Non renseignee' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Duree</span>
                <span class="value">{{ selectedOffer.duree ? selectedOffer.duree + ' mois' : 'Non precisee' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">{{ getOfferStateLabel(selectedOffer) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Validation</span>
                <span class="value">{{ selectedOffer.valideeParNomComplet || 'En attente de decision' }}</span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Description</div>
              <div class="info-meta">{{ selectedOffer.descriptionMissions || 'Aucune description fournie.' }}</div>
            </div>

            <div class="detail-card">
              <div class="info-title">Competences demandees</div>
              <div class="info-meta">{{ selectedOffer.profilRecherche || 'Aucune competence detaillee.' }}</div>
            </div>

            <div class="detail-card">
              <div class="info-title">Motif de refus</div>
              <label for="motifRefus">Commentaire optionnel en cas de refus</label>
              <textarea
                id="motifRefus"
                class="textarea"
                [(ngModel)]="refusalReason"
                placeholder="Expliquez pourquoi l'offre doit etre retravaillee ou refusee..."
              ></textarea>
              <div class="table-note">
                Ce commentaire est optionnel. Il sera conserve avec la decision de refus.
              </div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeOfferDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-success"
                (click)="approveSelectedOffer()"
                [disabled]="isActing || !selectedOffer || !canApproveSelectedOffer()"
              >
                {{ isActing && pendingAction === 'approve' ? 'Approbation...' : "Approuver l'offre" }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="rejectSelectedOffer()"
                [disabled]="isActing || !selectedOffer"
              >
                {{ isActing && pendingAction === 'reject' ? 'Refus...' : "Refuser l'offre" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showCreateForm" (click)="closeCreateForm()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Publier une offre de stage</h2>
          <button type="button" class="btn-close" (click)="closeCreateForm()">x</button>
        </div>

        <form class="form">
          <label for="entrepriseId">Entreprise</label>
          <select id="entrepriseId" class="select" [(ngModel)]="draftOffer.entrepriseId" name="entrepriseId" required autofocus>
            <option [ngValue]="null">Selectionner une entreprise</option>
            <option *ngFor="let company of companies" [ngValue]="company.id">
              {{ company.nomEntreprise }}
            </option>
          </select>

          <label for="titre">Titre</label>
          <input id="titre" class="input" [(ngModel)]="draftOffer.titre" name="titre" />

          <label for="descriptionMissions">Description des missions</label>
          <textarea
            id="descriptionMissions"
            class="textarea"
            [(ngModel)]="draftOffer.descriptionMissions"
            name="descriptionMissions"
          ></textarea>

          <label for="profilRecherche">Profil recherche</label>
          <input id="profilRecherche" class="input" [(ngModel)]="draftOffer.profilRecherche" name="profilRecherche" />

          <label for="duree">Duree (mois)</label>
          <input id="duree" class="input" type="number" [(ngModel)]="draftOffer.duree" name="duree" />

          <label for="dateDebutPrevue">Date de debut prevue</label>
          <input id="dateDebutPrevue" class="input" type="date" [(ngModel)]="draftOffer.dateDebutPrevue" name="dateDebutPrevue" />

          <div class="table-note">
            L'offre sera rattachee a l'entreprise selectionnee et validee automatiquement pour ce role.
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="closeCreateForm()">Annuler</button>
            <button type="button" class="btn btn-primary" (click)="createOffer()" [disabled]="isCreatingOffer">
              {{ isCreatingOffer ? 'Publication...' : "Publier l'offre" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyOffersValidationPageComponent implements OnInit {
  offers: FacultyOffer[] = [];
  filteredOffers: FacultyOffer[] = [];
  selectedOffer: FacultyOffer | null = null;
  companies: Entreprise[] = [];
  showCreateForm = false;
  showDetailsModal = false;
  isCreatingOffer = false;
  draftOffer: FacultyOfferDraft = this.createEmptyDraft();

  isLoading = false;
  isActing = false;
  pendingAction: 'approve' | 'reject' | null = null;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  refusalReason = '';

  constructor(
    private facultyPortalService: FacultyPortalService,
    private authentificationService: AuthentificationService,
    private entreprisesService: EntreprisesService
  ) {}

  ngOnInit(): void {
    console.log('[FacultyOffersValidation] ngOnInit');
    this.loadCompanies();
    this.loadOffers();
  }

  openCreateForm(): void {
    this.showCreateForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.draftOffer = this.createEmptyDraft();
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.isCreatingOffer = false;
  }

  loadOffers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('[FacultyOffersValidation] loading pending offers...');

    this.facultyPortalService.listPendingOffers().pipe(timeout(15000)).subscribe({
      next: (offers) => {
        console.log('[FacultyOffersValidation] pending offers received', offers);
        this.offers = [...offers].sort((a, b) => b.id - a.id);
        this.selectedOffer = this.resolveSelection(this.selectedOffer?.id ?? null);
        this.refusalReason = this.selectedOffer?.motifRefus || '';
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[FacultyOffersValidation] pending offers load error', error);
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les offres en attente.');
        this.isLoading = false;
      }
    });
  }

  loadCompanies(): void {
    this.entreprisesService.list().pipe(timeout(15000)).subscribe({
      next: (companies) => {
        this.companies = companies
          .filter((company) => !!company.id)
          .sort((left, right) => String(left.nomEntreprise ?? '').localeCompare(String(right.nomEntreprise ?? '')));
      },
      error: (error) => {
        console.error('[FacultyOffersValidation] companies load error', error);
      }
    });
  }

  applyFilters(): void {
    const search = this.searchQuery.trim().toLowerCase();

    this.filteredOffers = this.offers.filter((offer) => {
      const searchableText = [
        offer.titre,
        offer.descriptionMissions,
        offer.entrepriseNom,
        offer.profilRecherche,
        offer.statut
      ].join(' ').toLowerCase();

      return !search || searchableText.includes(search);
    });

    console.log('[FacultyOffersValidation] filtered offers', {
      total: this.offers.length,
      filtered: this.filteredOffers.length,
      search
    });

    if (!this.selectedOffer && this.filteredOffers.length > 0) {
      this.selectOffer(this.filteredOffers[0]);
    }
  }

  selectOffer(offer: FacultyOffer): void {
    this.selectedOffer = offer;
    this.refusalReason = offer.motifRefus || '';
    this.errorMessage = '';
    this.successMessage = '';
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

  createOffer(): void {
    if (!this.isDraftValid()) {
      this.errorMessage = "Veuillez renseigner l'entreprise, le titre, la description et la date de debut.";
      return;
    }

    this.isCreatingOffer = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.createOffer({
      titre: this.draftOffer.titre,
      descriptionMissions: this.draftOffer.descriptionMissions,
      duree: this.draftOffer.duree,
      profilRecherche: this.draftOffer.profilRecherche,
      dateDebutPrevue: this.draftOffer.dateDebutPrevue,
      entrepriseId: Number(this.draftOffer.entrepriseId)
    }).pipe(timeout(15000)).subscribe({
      next: (offer) => {
        this.successMessage = `L'offre "${offer.titre}" a ete creee par le responsable des stages et validee automatiquement.`;
        this.isCreatingOffer = false;
        this.showCreateForm = false;
        this.selectedOffer = offer;
        this.refusalReason = offer.motifRefus || '';
        this.draftOffer = this.createEmptyDraft();
        this.loadOffers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de publier cette offre.");
        this.isCreatingOffer = false;
      }
    });
  }

  approveSelectedOffer(): void {
    if (!this.selectedOffer) return;
    if (!this.canApproveSelectedOffer()) {
      this.errorMessage = "Cette offre n'est plus en attente de validation. La liste va etre rechargee.";
      this.loadOffers();
      return;
    }

    const responsableId = this.authentificationService.getUserId();
    if (!responsableId) {
      this.errorMessage = "Impossible d'identifier le responsable des stages connecte.";
      return;
    }

    this.isActing = true;
    this.pendingAction = 'approve';
    this.errorMessage = '';
    this.successMessage = '';

    console.log('[FacultyOffersValidation] approve offer', {
      offreId: this.selectedOffer.id,
      responsableId
    });

    this.facultyPortalService.approveOffer(this.selectedOffer.id, responsableId).pipe(timeout(15000)).subscribe({
      next: (updatedOffer) => {
        this.successMessage = `L'offre "${updatedOffer.titre}" a ete approuvee avec succes.`;
        this.removeOfferFromList(updatedOffer.id);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible d'approuver cette offre.");
        this.isActing = false;
        this.pendingAction = null;

        if (error?.status === 400 || error?.status === 404) {
          this.loadOffers();
        }
      }
    });
  }

  rejectSelectedOffer(): void {
    if (!this.selectedOffer) return;

    this.isActing = true;
    this.pendingAction = 'reject';
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.rejectOffer(this.selectedOffer.id, this.refusalReason).pipe(timeout(15000)).subscribe({
      next: (updatedOffer) => {
        this.successMessage = `L'offre "${updatedOffer.titre}" a ete refusee.`;
        this.removeOfferFromList(updatedOffer.id);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de refuser cette offre.");
        this.isActing = false;
        this.pendingAction = null;
      }
    });
  }

  formatStatus(status: string): string {
    return (status || 'N/D').replace(/_/g, ' ');
  }

  getOfferStateLabel(offer: FacultyOffer): string {
    if (offer.stageCree) {
      return 'Stage cree';
    }

    return this.formatStatus(offer.statut);
  }

  canApproveSelectedOffer(): boolean {
    return this.selectedOffer?.statut === 'EN_ATTENTE';
  }

  private isDraftValid(): boolean {
    return !!this.draftOffer.entrepriseId
      && this.draftOffer.titre.trim().length >= 3
      && this.draftOffer.descriptionMissions.trim().length >= 10
      && this.draftOffer.dateDebutPrevue.trim().length > 0;
  }

  private removeOfferFromList(offerId: number): void {
    this.offers = this.offers.filter((offer) => offer.id !== offerId);
    this.selectedOffer = null;
    this.refusalReason = '';
    this.applyFilters();
    this.isActing = false;
    this.pendingAction = null;
  }

  private resolveSelection(selectedOfferId: number | null): FacultyOffer | null {
    if (!selectedOfferId) {
      return this.offers[0] ?? null;
    }

    return this.offers.find((offer) => offer.id === selectedOfferId) ?? this.offers[0] ?? null;
  }

  private createEmptyDraft(): FacultyOfferDraft {
    return {
      titre: '',
      descriptionMissions: '',
      duree: null,
      profilRecherche: '',
      dateDebutPrevue: '',
      entrepriseId: null
    };
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return `${fallback} Requete bloquee avant reponse du serveur (backend indisponible, CORS ou preflight OPTIONS/PATCH).`;
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (typeof error.error?.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return `${fallback} (${error.status || 'HTTP'}) ${error.message}`;
      }
    }

    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return `${fallback} ${error.message}`;
    return fallback;
  }
}
