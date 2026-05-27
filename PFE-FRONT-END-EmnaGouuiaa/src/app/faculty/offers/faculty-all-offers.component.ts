import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyOffer } from '../../services/faculty/faculty.models';

interface OfferEditDraft {
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
}

@Component({
  selector: 'app-faculty-all-offers-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Offres de stage</h1>
          <p>Consultez toutes les offres du système, suivez leur état et modifiez celles qui restent libres.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadOffers()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div class="support-banner">
        Les offres déjà affectées restent visibles pour suivi, mais ne peuvent plus être modifiées.
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
          <span class="stat-value">{{ lockedOffersCount }}</span>
          <div class="stat-subtitle">Offres déjà affectées ou avec stage créé</div>
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
        <div class="empty-card" *ngIf="filteredOffers.length === 0">Aucune offre de stage à afficher.</div>

        <div class="offer-card-grid" *ngIf="filteredOffers.length > 0">
          <article
            class="offer-card"
            [class.offer-card-disabled]="isLockedOffer(offer)"
            *ngFor="let offer of filteredOffers"
            (click)="openOfferDetails(offer)"
          >
            <div class="offer-card-top">
              <div style="min-width:0">
                <h3>{{ offer.titre || ('Offre #' + offer.id) }}</h3>
                <p>{{ offer.entrepriseNom || 'Entreprise non renseignée' }}</p>
              </div>
              <span class="status-pill" [ngClass]="'status-' + offer.statut">{{ getOfferStateLabel(offer) }}</span>
            </div>

            <div class="offer-card-meta">
              <div class="offer-meta-item">
                <span class="label">Début</span>
                <span class="value">{{ offer.dateDebutPrevue || '-' }}</span>
              </div>
              <div class="offer-meta-item">
                <span class="label">Durée</span>
                <span class="value">{{ offer.duree ? offer.duree + ' mois' : '-' }}</span>
              </div>
            </div>

            <div class="offer-card-foot" *ngIf="isLockedOffer(offer)">
              <span class="status-pill status-warning">Non modifiable — stage créé ou affectée</span>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary"
                      (click)="openOfferDetails(offer); $event.stopPropagation()">
                Voir détails
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="openEditModal(offer); $event.stopPropagation()"
                [disabled]="isLockedOffer(offer)"
                [title]="isLockedOffer(offer) ? 'Cette offre ne peut plus être modifiée' : 'Modifier les informations de cette offre'"
              >
                Modifier
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- ── Modale de détails ─────────────────────────────────────────────── -->
      <div class="modal-overlay" *ngIf="showDetailsModal && selectedOffer" (click)="closeOfferDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div style="min-width:0">
              <h2 style="margin:0;font-size:1.15rem">{{ selectedOffer.titre || '-' }}</h2>
              <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.92rem">{{ selectedOffer.entrepriseNom || '-' }}</p>
            </div>
            <button type="button" class="btn-close" (click)="closeOfferDetails()">×</button>
          </div>

          <div class="form">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedOffer.entrepriseNom || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">
                  <span class="status-pill" [ngClass]="'status-' + selectedOffer.statut">{{ getOfferStateLabel(selectedOffer) }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Date de début</span>
                <span class="value">{{ selectedOffer.dateDebutPrevue || 'Non renseignée' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Durée</span>
                <span class="value">{{ selectedOffer.duree ? selectedOffer.duree + ' mois' : 'Non précisée' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Validation</span>
                <span class="value">{{ selectedOffer.valideeParNomComplet || 'En attente de validation' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="isLockedOffer(selectedOffer)">
                <span class="label">État</span>
                <span class="value">Non modifiable — stage créé ou offre affectée</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">Profil recherché</span>
                <span class="value">{{ selectedOffer.profilRecherche || 'Non précisé' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">Description des missions</span>
                <span class="value" style="white-space:pre-wrap;line-height:1.6">{{ selectedOffer.descriptionMissions || 'Aucune description fournie.' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedOffer.motifRefus">
                <span class="label">Motif de refus</span>
                <span class="value">{{ selectedOffer.motifRefus }}</span>
              </div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeOfferDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="openEditModal(selectedOffer); closeOfferDetails()"
                [disabled]="isLockedOffer(selectedOffer)"
                [title]="isLockedOffer(selectedOffer) ? 'Cette offre ne peut plus être modifiée' : 'Modifier les informations de cette offre'"
              >
                Modifier
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Modale de modification ────────────────────────────────────────── -->
      <div class="modal-overlay" *ngIf="showEditModal && editTargetOffer" (click)="closeEditModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 style="margin:0;font-size:1.15rem">Modifier l'offre</h2>
            <button type="button" class="btn-close" (click)="closeEditModal()">×</button>
          </div>

          <div class="form">
            <label>Titre de l'offre</label>
            <input class="input" [(ngModel)]="editDraft.titre" placeholder="Titre de l'offre" />

            <label>Description des missions</label>
            <textarea class="textarea" [(ngModel)]="editDraft.descriptionMissions"
                      placeholder="Décrivez les missions du stagiaire..." rows="4"></textarea>

            <label>Profil recherché</label>
            <input class="input" [(ngModel)]="editDraft.profilRecherche"
                   placeholder="Compétences, niveau requis..." />

            <label>Durée (mois)</label>
            <input class="input" type="number" [(ngModel)]="editDraft.duree" min="1" max="24" />

            <label>Date de début prévue</label>
            <input class="input" type="date" [(ngModel)]="editDraft.dateDebutPrevue" />

            <div class="inline-actions" style="margin-top:16px">
              <button type="button" class="btn btn-secondary" (click)="closeEditModal()" [disabled]="isSavingEdit">
                Annuler
              </button>
              <button type="button" class="btn btn-primary" (click)="saveEdit()" [disabled]="isSavingEdit">
                {{ isSavingEdit ? 'Enregistrement...' : 'Enregistrer les modifications' }}
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
  editTargetOffer: FacultyOffer | null = null;
  showDetailsModal = false;
  showEditModal = false;
  isLoading = false;
  isSavingEdit = false;
  searchQuery = '';
  errorMessage = '';
  successMessage = '';

  editDraft: OfferEditDraft = this.emptyDraft();

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

  openEditModal(offer: FacultyOffer): void {
    if (this.isLockedOffer(offer)) {
      this.errorMessage = "Cette offre ne peut plus être modifiée car elle est déjà affectée ou liée à un stage.";
      return;
    }
    this.editTargetOffer = offer;
    this.editDraft = {
      titre:               offer.titre,
      descriptionMissions: offer.descriptionMissions,
      duree:               offer.duree,
      profilRecherche:     offer.profilRecherche,
      dateDebutPrevue:     offer.dateDebutPrevue
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editTargetOffer = null;
    this.editDraft = this.emptyDraft();
  }

  saveEdit(): void {
    if (!this.editTargetOffer) return;

    if (!this.editDraft.titre.trim()) {
      this.errorMessage = "Le titre de l'offre est requis.";
      return;
    }
    if (!this.editDraft.descriptionMissions.trim()) {
      this.errorMessage = "La description des missions est requise.";
      return;
    }
    if (!this.editDraft.dateDebutPrevue) {
      this.errorMessage = "La date de début est requise.";
      return;
    }

    this.isSavingEdit = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService
      .updateOffer(this.editTargetOffer.id, {
        titre:               this.editDraft.titre,
        descriptionMissions: this.editDraft.descriptionMissions,
        duree:               this.editDraft.duree,
        profilRecherche:     this.editDraft.profilRecherche,
        dateDebutPrevue:     this.editDraft.dateDebutPrevue,
        entrepriseId:        this.editTargetOffer.entrepriseId
      })
      .pipe(timeout(15000))
      .subscribe({
        next: (updated) => {
          this.successMessage = `L'offre "${updated.titre}" a été mise à jour.`;
          this.isSavingEdit = false;
          this.closeEditModal();
          this.loadOffers();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, "Impossible de mettre à jour l'offre.");
          this.isSavingEdit = false;
        }
      });
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showEditModal) {
      this.closeEditModal();
      return;
    }
    if (this.showDetailsModal) {
      this.closeOfferDetails();
    }
  }

  get lockedOffersCount(): number {
    return this.offers.filter((offer) => this.isLockedOffer(offer)).length;
  }

  isLockedOffer(offer: FacultyOffer): boolean {
    return offer.stageCree || offer.statut === 'AFFECTEE';
  }

  getOfferStateLabel(offer: FacultyOffer): string {
    if (offer.statut === 'TERMINEE' || offer.statut === 'ARCHIVEE' || offer.statut === 'FERMEE') {
      return 'Terminée';
    }
    if (offer.statut === 'REFUSEE') return 'Refusée';
    if (offer.statut === 'AFFECTEE') return 'En cours de stage';
    if (offer.statut === 'PUBLIEE' || offer.statut === 'VALIDEE') return 'Approuvée';
    if (offer.statut === 'EN_ATTENTE') return "En attente d'approbation";
    return (offer.statut || 'N/D').replace(/_/g, ' ');
  }

  private emptyDraft(): OfferEditDraft {
    return { titre: '', descriptionMissions: '', duree: null, profilRecherche: '', dateDebutPrevue: '' };
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}
