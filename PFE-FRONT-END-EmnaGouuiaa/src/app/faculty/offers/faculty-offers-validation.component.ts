import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { Entreprise, EntreprisesService } from '../../services/entreprises.service';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyOffer } from '../../services/faculty/faculty.models';
import {
  canFacultyEditOffer,
  canShowFacultyOfferEditActions,
  isFacultyOfferLockedForEdit,
} from './faculty-offer-actions.util';
import { validateStagePeriod } from '../../shared/validators/stage-period.validation';

interface FacultyOfferDraft {
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
  entrepriseId: number | null;
}

interface OfferEditDraft {
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
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
            tant qu'elles n'ont pas ete validees par le responsable universitaire.
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
        Une offre creee par le responsable universitaire est enregistree directement comme validee.
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
                <div style="min-width:0">
                  <h3>{{ offer.titre || ('Offre #' + offer.id) }}</h3>
                  <p>{{ offer.entrepriseNom || 'Entreprise non renseignee' }}</p>
                </div>
                <span class="status-pill" [ngClass]="'status-' + offer.statut">{{ getOfferStateLabel(offer) }}</span>
              </div>

              <div class="offer-card-meta">
                <div class="offer-meta-item">
                  <span class="label">Debut</span>
                  <span class="value">{{ offer.dateDebutPrevue || '-' }}</span>
                </div>
                <div class="offer-meta-item">
                  <span class="label">Duree</span>
                  <span class="value">{{ offer.duree ? offer.duree + ' mois' : '-' }}</span>
                </div>
              </div>

              <div class="offer-card-foot">
                <span class="status-pill status-warning" *ngIf="isOfferLockedByTerminatedStage(offer)">
                  Offre verrouillée (stage terminé)
                </span>
                <span class="status-pill status-warning" *ngIf="offer.statut === 'EN_ATTENTE'">Validation en attente</span>
                <span class="status-pill status-VALIDEE" *ngIf="offer.statut === 'VALIDEE'">Deja validee</span>
              </div>

              <div class="inline-actions" *ngIf="offer.statut === 'EN_ATTENTE'">
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
                  (click)="selectOffer(offer); approveSelectedOffer(); $event.stopPropagation()"
                  [disabled]="isActing || isOfferLockedByTerminatedStage(offer)"
                  [title]="getApproveButtonTooltip(offer)"
                >
                  Approuver
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  (click)="selectOffer(offer); rejectSelectedOffer(); $event.stopPropagation()"
                  [disabled]="isActing || isOfferLockedByTerminatedStage(offer)"
                  [title]="getRejectButtonTooltip(offer)"
                >
                  Refuser la demande
                </button>
              </div>
              <div class="inline-actions" *ngIf="canShowOfferCardActions(offer)">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="selectOffer(offer); $event.stopPropagation()"
                >
                  Voir details
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="openEditModal(offer); $event.stopPropagation()"
                  [disabled]="!canEditOffer(offer)"
                  [title]="getOfferLockTooltip(offer) || 'Modifier les informations de cette offre'"
                >
                  Modifier
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
                class="btn btn-primary"
                *ngIf="selectedOffer && canShowOfferCardActions(selectedOffer)"
                (click)="openEditModal(selectedOffer); closeOfferDetails()"
                [disabled]="!canEditOffer(selectedOffer)"
                [title]="getOfferLockTooltip(selectedOffer) || 'Modifier les informations de cette offre'"
              >
                Modifier
              </button>
              <button
                type="button"
                class="btn btn-success"
                *ngIf="selectedOffer.statut === 'EN_ATTENTE'"
                (click)="approveSelectedOffer()"
                [disabled]="isActing || !canApproveSelectedOffer()"
              >
                {{ isActing && pendingAction === 'approve' ? 'Approbation...' : "Approuver l'offre" }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                *ngIf="selectedOffer.statut === 'EN_ATTENTE'"
                (click)="rejectSelectedOffer()"
                [disabled]="isActing"
              >
                {{ isActing && pendingAction === 'reject' ? 'Refus en cours...' : 'Refuser la demande' }}
              </button>
            </div>
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
          <input class="input" type="number" [(ngModel)]="editDraft.duree" min="1" max="3" />

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

          <label for="duree">Duree (mois : 1-3 periode 1, 1-2 periode 2)</label>
          <input id="duree" class="input" type="number" [(ngModel)]="draftOffer.duree" name="duree" min="1" max="3" />

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
  isSavingEdit = false;
  showEditModal = false;
  editTargetOffer: FacultyOffer | null = null;
  editDraft: OfferEditDraft = this.emptyEditDraft();
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
    if (this.showEditModal) {
      this.closeEditModal();
      return;
    }
    if (this.showDetailsModal) {
      this.closeOfferDetails();
    }
  }

  createOffer(): void {
    if (!this.isDraftValid()) {
      this.errorMessage = "Veuillez renseigner l'entreprise, le titre, la description et la date de debut.";
      return;
    }

    const periodCheck = validateStagePeriod(this.draftOffer.dateDebutPrevue, this.draftOffer.duree);
    if (!periodCheck.valid) {
      this.errorMessage = periodCheck.message ?? 'Période de stage invalide.';
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
        this.successMessage = `L'offre "${offer.titre}" a ete creee par le responsable universitaire et validee automatiquement.`;
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
      this.errorMessage = "Impossible d'identifier le responsable universitaire connecte.";
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

  isOfferLockedByTerminatedStage(offer: FacultyOffer): boolean {
    return offer.stageTermine === true;
  }

  canShowOfferCardActions(offer: FacultyOffer): boolean {
    return canShowFacultyOfferEditActions(offer);
  }

  canEditOffer(offer: FacultyOffer): boolean {
    return canFacultyEditOffer(offer);
  }

  isLockedOffer(offer: FacultyOffer): boolean {
    return isFacultyOfferLockedForEdit(offer);
  }

  getOfferLockMessage(offer: FacultyOffer): string {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return 'Modification impossible : stage terminé';
    }
    if (offer.stageCree || offer.statut === 'AFFECTEE') {
      return "Cette offre ne peut plus être modifiée car elle est déjà affectée ou liée à un stage.";
    }
    return '';
  }

  getOfferLockTooltip(offer: FacultyOffer): string {
    return this.getOfferLockMessage(offer);
  }

  getApproveButtonTooltip(offer: FacultyOffer): string {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return this.getOfferLockTooltip(offer);
    }
    return "Approuver l'offre";
  }

  getRejectButtonTooltip(offer: FacultyOffer): string {
    if (this.isOfferLockedByTerminatedStage(offer)) {
      return this.getOfferLockTooltip(offer);
    }
    return "Refuser la demande d'offre de stage";
  }

  openEditModal(offer: FacultyOffer): void {
    if (!this.canShowOfferCardActions(offer)) {
      this.errorMessage = 'Seules les offres approuvées peuvent être modifiées.';
      return;
    }
    if (!this.canEditOffer(offer)) {
      this.errorMessage = this.getOfferLockMessage(offer);
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
    this.editDraft = this.emptyEditDraft();
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

    const periodCheck = validateStagePeriod(this.editDraft.dateDebutPrevue, this.editDraft.duree);
    if (!periodCheck.valid) {
      this.errorMessage = periodCheck.message ?? 'Période de stage invalide.';
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

  private emptyEditDraft(): OfferEditDraft {
    return { titre: '', descriptionMissions: '', duree: null, profilRecherche: '', dateDebutPrevue: '' };
  }

  private isDraftValid(): boolean {
    return !!this.draftOffer.entrepriseId
      && this.draftOffer.titre.trim().length >= 3
      && this.draftOffer.descriptionMissions.trim().length >= 10
      && this.draftOffer.dateDebutPrevue.trim().length > 0
      && Number.isFinite(Number(this.draftOffer.duree))
      && Number(this.draftOffer.duree) >= 1;
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
