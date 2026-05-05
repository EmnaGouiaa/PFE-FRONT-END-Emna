import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentOffer } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-offers-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Offres de stage</h1>
          <p>Consultation secondaire des offres ouvertes, avec un affichage en cards plus lisible.</p>
        </div>
      </section>

      <section class="panel">
        <div class="filters-grid">
          <input class="input" [(ngModel)]="searchTerm" placeholder="Rechercher par titre, entreprise ou profil" />
        </div>
      </section>

      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="empty-card" *ngIf="isLoading">Chargement des offres...</div>

      <section *ngIf="!isLoading" class="panel">
          <div class="panel-header">
            <div>
              <h2>Offres ouvertes</h2>
              <p class="panel-subtitle">{{ filteredOffers.length }} offre(s) visible(s)</p>
            </div>
          </div>

          <div class="support-banner">
            Si un stage vous a deja ete affecte, privilegiez surtout la section <strong>Mon stage</strong>.
          </div>

          <div class="empty-card" *ngIf="!filteredOffers.length">Aucune offre de stage disponible pour le moment.</div>

          <div class="offer-card-grid" *ngIf="filteredOffers.length">
            <article class="offer-card" *ngFor="let offer of filteredOffers" (click)="selectOffer(offer)">
              <div class="offer-card-top">
                <div>
                  <h3>{{ offer.titre || 'Sans titre' }}</h3>
                  <p>{{ offer.entrepriseNom || 'Entreprise non renseignee' }}</p>
                </div>
                <span class="status-pill" [ngClass]="'status-' + offer.statut">{{ offer.statut || 'OUVERTE' }}</span>
              </div>

              <p class="offer-card-description">{{ offer.descriptionMissions || 'Aucune description fournie.' }}</p>

              <div class="offer-card-meta">
                <div class="offer-meta-item">
                  <span class="label">Profil</span>
                  <span class="value">{{ offer.profilRecherche || 'Non precise' }}</span>
                </div>
                <div class="offer-meta-item">
                  <span class="label">Debut</span>
                  <span class="value">{{ formatDate(offer.dateDebutPrevue) }}</span>
                </div>
                <div class="offer-meta-item">
                  <span class="label">Duree</span>
                  <span class="value">{{ offer.duree ? (offer.duree + ' mois') : 'Non renseignee' }}</span>
                </div>
              </div>

              <div class="inline-actions">
                <button type="button" class="btn btn-secondary" (click)="selectOffer(offer); $event.stopPropagation()">
                  Voir details
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
            <div class="kv-list">
              <div class="kv-item">
                <span class="label">Titre</span>
                <span class="value">{{ selectedOffer.titre || 'Sans titre' }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedOffer.entrepriseNom || 'Non renseignee' }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Date de debut prevue</span>
                <span class="value">{{ formatDate(selectedOffer.dateDebutPrevue) }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Duree</span>
                <span class="value">{{ selectedOffer.duree ? (selectedOffer.duree + ' mois') : 'Non renseignee' }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Statut</span>
                <span class="value">{{ selectedOffer.statut || 'Non precise' }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Profil recherche</span>
                <span class="value">{{ selectedOffer.profilRecherche || 'Non precise' }}</span>
              </div>
              <div class="kv-item">
                <span class="label">Missions</span>
                <span class="value">{{ selectedOffer.descriptionMissions || 'Aucune description fournie.' }}</span>
              </div>
            </div>

            <div class="message-info">
              L'API actuelle permet seulement la consultation des offres ouvertes. Le suivi principal reste centre sur le stage reel lorsqu'il existe.
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeOfferDetails()">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentOffersPageComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  offers: StudentOffer[] = [];
  selectedOffer: StudentOffer | null = null;
  showDetailsModal = false;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listOpenOffers().subscribe({
      next: (offers) => {
        this.offers = offers;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les offres.');
        this.isLoading = false;
      }
    });
  }

  get filteredOffers(): StudentOffer[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.offers;
    return this.offers.filter((offer) =>
      [offer.titre, offer.entrepriseNom, offer.profilRecherche, offer.descriptionMissions]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }

  selectOffer(offer: StudentOffer): void {
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

  formatDate(value: string): string {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }
}
