import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyOffer } from '../../services/faculty/faculty.models';

@Component({
  selector: 'app-faculty-all-offers-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Offres de stage</h1>
          <p>Consultez toutes les offres du systeme, suivez leur etat et supprimez uniquement celles qui restent libres.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadOffers()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div class="support-banner">
        Les offres deja affectees restent visibles pour suivi, mais deviennent non modifiables et non supprimables.
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Toutes les offres</div>
          <span class="stat-value">{{ offers.length }}</span>
          <div class="stat-subtitle">Vision globale du portefeuille d'offres</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Pourvues</div>
          <span class="stat-value">{{ disabledOffersCount }}</span>
          <div class="stat-subtitle">Offres deja affectees ou avec stage cree</div>
        </article>
      </section>

      <section class="toolbar">
        <input
          class="input"
          type="text"
          placeholder="Rechercher par titre, entreprise, statut..."
          [(ngModel)]="searchQuery"
          (input)="applyFilters()"
        />
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des offres...</div>

      <section *ngIf="!isLoading">
        <div class="empty-card" *ngIf="filteredOffers.length === 0">Aucune offre de stage a afficher.</div>

        <div class="offer-card-grid" *ngIf="filteredOffers.length > 0">
          <article
            class="offer-card"
            [class.offer-card-disabled]="isDisabledOffer(offer)"
            *ngFor="let offer of filteredOffers"
            (click)="openOfferDetails(offer)"
          >
            <div class="offer-card-top">
              <div>
                <h3>{{ offer.titre || ('Offre #' + offer.id) }}</h3>
                <p>{{ offer.entrepriseNom || 'Entreprise non renseignee' }}</p>
              </div>
              <span class="status-pill" [ngClass]="'status-' + offer.statut">{{ getOfferStateLabel(offer) }}</span>
            </div>

            <p class="offer-card-description">{{ offer.descriptionMissions || 'Description non renseignee.' }}</p>

            <div class="offer-card-meta">
              <div class="offer-meta-item">
                <span class="label">Profil</span>
                <span class="value">{{ offer.profilRecherche || 'Non precise' }}</span>
              </div>
              <div class="offer-meta-item">
                <span class="label">Debut</span>
                <span class="value">{{ offer.dateDebutPrevue || 'Non defini' }}</span>
              </div>
              <div class="offer-meta-item">
                <span class="label">Duree</span>
                <span class="value">{{ offer.duree ? offer.duree + ' mois' : 'Non precisee' }}</span>
              </div>
            </div>

            <div class="offer-card-foot">
              <span class="status-pill status-warning" *ngIf="isDisabledOffer(offer)">{{ getDisabledReason(offer) }}</span>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="openOfferDetails(offer); $event.stopPropagation()">
                Voir details
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="deleteOffer(offer); $event.stopPropagation()"
                [disabled]="isDeleting || !canDeleteOffer(offer)"
              >
                Supprimer
              </button>
            </div>
          </article>
        </div>
      </section>

      <div class="modal-overlay" *ngIf="showDetailsModal && selectedOffer" (click)="closeOfferDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Detail de l'offre</h2>
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
                <span class="value">{{ selectedOffer.valideeParNomComplet || 'En attente de validation' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">Description</span>
                <span class="value">{{ selectedOffer.descriptionMissions || 'Aucune description fournie.' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedOffer.motifRefus">
                <span class="label">Motif de refus</span>
                <span class="value">{{ selectedOffer.motifRefus }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="isDisabledOffer(selectedOffer)">
                <span class="label">Etat d'affectation</span>
                <span class="value">{{ getDisabledReason(selectedOffer) }}</span>
              </div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeOfferDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="deleteOffer(selectedOffer)"
                [disabled]="isDeleting || !canDeleteOffer(selectedOffer)"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css', './faculty-offers-list.component.css']
})
export class FacultyAllOffersPageComponent implements OnInit {
  offers: FacultyOffer[] = [];
  filteredOffers: FacultyOffer[] = [];
  selectedOffer: FacultyOffer | null = null;
  showDetailsModal = false;
  isLoading = false;
  isDeleting = false;
  searchQuery = '';
  errorMessage = '';
  successMessage = '';

  constructor(private facultyPortalService: FacultyPortalService) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.facultyPortalService.listAllOffers().pipe(timeout(15000)).subscribe({
      next: (offers) => {
        this.offers = offers;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les offres.');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchQuery.trim().toLowerCase();
    this.filteredOffers = this.offers.filter((offer) => {
      const text = [
        offer.titre,
        offer.entrepriseNom,
        offer.profilRecherche,
        offer.descriptionMissions,
        offer.statut
      ].join(' ').toLowerCase();
      return !search || text.includes(search);
    });
  }

  openOfferDetails(offer: FacultyOffer): void {
    this.selectedOffer = offer;
    this.showDetailsModal = true;
    this.errorMessage = '';
    this.successMessage = '';
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

  get disabledOffersCount(): number {
    return this.offers.filter((offer) => this.isDisabledOffer(offer)).length;
  }

  isDisabledOffer(offer: FacultyOffer): boolean {
    return offer.stageCree || offer.statut === 'AFFECTEE';
  }

  canDeleteOffer(offer: FacultyOffer): boolean {
    return !this.isDisabledOffer(offer);
  }

  getDisabledReason(offer: FacultyOffer): string {
    if (offer.stageCree) {
      return 'Stage cree';
    }
    if (offer.statut === 'AFFECTEE') {
      return 'Affectee';
    }
    return 'Non modifiable';
  }

  getOfferStateLabel(offer: FacultyOffer): string {
    if (offer.stageCree) {
      return 'Stage cree';
    }
    if (offer.statut === 'AFFECTEE') {
      return 'Affectee';
    }
    return (offer.statut || 'N/D').replace(/_/g, ' ');
  }

  deleteOffer(offer: FacultyOffer): void {
    if (!this.canDeleteOffer(offer)) {
      this.errorMessage = this.getDisabledReason(offer);
      return;
    }

    if (!confirm(`Supprimer l'offre "${offer.titre}" ?`)) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.deleteOffer(offer.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = `L'offre "${offer.titre}" a ete supprimee.`;
        this.showDetailsModal = false;
        this.selectedOffer = null;
        this.isDeleting = false;
        this.loadOffers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de supprimer cette offre.");
        this.isDeleting = false;
      }
    });
  }

  private extractErrorMessage(error: any, fallback: string): string {
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
}
