import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs/operators';
import { DemandeStage, StatutValidation } from '../../models/demande-stage.model';
import { ServiceDemandeStageService } from '../../services/service-demande-stage.service';

type ValidationFilter = 'ALL' | 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';

/** Délai max (ms) pour les appels API simples (liste, détail). */
const API_TIMEOUT_MS = 20_000;
/** Délai max (ms) pour les actions métier lourdes (validation = BCrypt + DB + email). */
const API_TIMEOUT_VALIDATION_MS = 60_000;

@Component({
  selector: 'app-faculty-company-requests-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Demandes de creation d'entreprise</h1>
          <p>Suivi des demandes de creation d'entreprise. Seul le responsable des stages peut approuver ou refuser. L'entreprise est creee automatiquement apres approbation.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadRequests()" [disabled]="isLoadingList">
            Rafraichir
          </button>
        </div>
      </header>

      <!-- Stats -->
      <section class="stats">
        <div class="stat">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ requests.length }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">En attente responsable</div>
          <div class="stat-value">{{ countByResponsibleStatus(StatutValidation.EN_ATTENTE) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Approuvees</div>
          <div class="stat-value">{{ countByResponsibleStatus(StatutValidation.APPROUVEE) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Validees</div>
          <div class="stat-value">{{ fullyValidatedCount }}</div>
        </div>
      </section>

      <!-- Filtres -->
      <section class="filters">
        <input
          class="input"
          type="text"
          placeholder="Rechercher par entreprise, etudiant, sujet..."
          [(ngModel)]="searchQuery"
          (input)="applyFilters()"
        />
        <select class="select" [(ngModel)]="responsibleFilter" (change)="applyFilters()">
          <option value="ALL">Responsable : tous</option>
          <option value="EN_ATTENTE">Responsable : en attente</option>
          <option value="APPROUVEE">Responsable : approuvee</option>
          <option value="REJETEE">Responsable : rejetee</option>
        </select>
      </section>

      <!-- Messages -->
      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <!-- Chargement INITIAL de la liste uniquement -->
      <div *ngIf="isLoadingList" class="loading">Chargement des demandes...</div>

      <!-- Contenu — toujours visible, même pendant approve/reject -->
      <section class="content-grid" *ngIf="!isLoadingList">
        <article class="panel">
          <div *ngIf="filteredRequests.length === 0" class="empty-card">
            Aucune demande ne correspond aux filtres.
          </div>

          <div class="table-wrap" *ngIf="filteredRequests.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entreprise</th>
                  <th>Etudiant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of filteredRequests" (click)="selectRequest(r)">
                  <td>{{ r.id }}</td>
                  <td>
                    <div class="cell-title">{{ r.nomEntreprise }}</div>
                    <div class="cell-sub">{{ r.emailEntreprise || '-' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ r.etudiant?.prenom || '-' }} {{ r.etudiant?.nom || '' }}</div>
                    <div class="cell-sub">{{ r.etudiant?.email || '-' }}</div>
                  </td>
                  <td>
                    <span [class]="badgeClass(r.statutValidationResponsableStages || StatutValidation.EN_ATTENTE)">
                      {{ r.statutValidationResponsableStages || StatutValidation.EN_ATTENTE }}
                    </span>
                  </td>
                  <td class="actions">
                    <button
                      class="btn btn-success"
                      (click)="approve(r, $event)"
                      [disabled]="!canAct(r) || loadingApprove[r.id] || loadingReject[r.id]"
                    >
                      <span *ngIf="loadingApprove[r.id]">Traitement...</span>
                      <span *ngIf="!loadingApprove[r.id]">Approuver</span>
                    </button>
                    <button
                      class="btn btn-danger"
                      (click)="reject(r, $event)"
                      [disabled]="!canAct(r) || loadingApprove[r.id] || loadingReject[r.id]"
                    >
                      <span *ngIf="loadingReject[r.id]">Traitement...</span>
                      <span *ngIf="!loadingReject[r.id]">Refuser</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <!-- Panneau de détail -->
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Detail de la demande</h2>
              <div class="panel-subtitle">Selectionnez une ligne pour voir le contexte complet.</div>
            </div>
          </div>

          <div *ngIf="!selectedRequest" class="empty-card">Aucune demande selectionnee.</div>

          <div *ngIf="selectedRequest" class="stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedRequest.nomEntreprise }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Responsable entreprise</span>
                <span class="value">{{ selectedRequest.nomEncadrant || 'Non renseigne' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Email responsable</span>
                <span class="value">{{ selectedRequest.emailEncadrant || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Etudiant</span>
                <span class="value">{{ selectedRequest.etudiant?.prenom || '-' }} {{ selectedRequest.etudiant?.nom || '' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Email etudiant</span>
                <span class="value">{{ selectedRequest.etudiant?.email || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Telephone entreprise</span>
                <span class="value">{{ selectedRequest.telephoneEntreprise || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Validation responsable</span>
                <span [class]="badgeClass(selectedRequest.statutValidationResponsableStages || StatutValidation.EN_ATTENTE)">
                  {{ selectedRequest.statutValidationResponsableStages || StatutValidation.EN_ATTENTE }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Statut</span>
                <span [class]="badgeClass(selectedRequest.statutValidationResponsableStages || StatutValidation.EN_ATTENTE)">
                  {{ selectedRequest.statutValidationResponsableStages || StatutValidation.EN_ATTENTE }}
                </span>
              </div>
            </div>

            <div class="detail-card" *ngIf="selectedRequest.commentaireResponsableStages">
              <div class="info-title">Motif du refus</div>
              <div class="info-meta">{{ selectedRequest.commentaireResponsableStages }}</div>
            </div>

            <div class="detail-card">
              <div class="info-title">Statut global</div>
              <div class="info-meta" *ngIf="isFullyValidated(selectedRequest)">
                Demande validee. L'entreprise a ete creee automatiquement.
              </div>
              <div class="info-meta" *ngIf="!isFullyValidated(selectedRequest)">
                En attente de validation du responsable universitaire.
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- Modal de refus -->
      <div class="refusal-modal-backdrop" *ngIf="rejectModalOpen" (click)="closeRejectModal()">
        <section class="refusal-modal" (click)="$event.stopPropagation()">
          <div class="refusal-hero">
            <div class="refusal-icon" aria-hidden="true">!</div>
            <div>
              <div class="refusal-kicker">Refus responsable</div>
              <h2>Motif du refus</h2>
              <p>Le motif sera enregistre et affiche au stagiaire dans le detail de sa demande.</p>
            </div>
          </div>

          <div class="refusal-context" *ngIf="requestBeingRejected">
            <div><strong>Entreprise :</strong> {{ requestBeingRejected.nomEntreprise }}</div>
            <div><strong>Etudiant :</strong>
              {{ requestBeingRejected.etudiant?.prenom || '-' }} {{ requestBeingRejected.etudiant?.nom || '' }}
            </div>
          </div>

          <label class="refusal-label" for="faculty-refusal-comment">Motif du refus</label>
          <textarea
            id="faculty-refusal-comment"
            class="refusal-textarea"
            [(ngModel)]="rejectComment"
            [ngModelOptions]="{ standalone: true }"
            rows="7"
            maxlength="1000"
            placeholder="Saisissez ici la raison du refus..."
          ></textarea>

          <div class="refusal-help">
            <span>{{ rejectComment.trim().length }}/1000</span>
            <span *ngIf="rejectValidationMessage" class="refusal-error">{{ rejectValidationMessage }}</span>
          </div>

          <div class="refusal-actions">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="closeRejectModal()"
              [disabled]="requestBeingRejected !== null && loadingReject[requestBeingRejected.id]"
            >Annuler</button>
            <button
              type="button"
              class="btn btn-danger"
              (click)="confirmReject()"
              [disabled]="requestBeingRejected !== null && loadingReject[requestBeingRejected.id]"
            >
              <span *ngIf="requestBeingRejected !== null && loadingReject[requestBeingRejected.id]">Traitement...</span>
              <span *ngIf="requestBeingRejected === null || !loadingReject[requestBeingRejected.id]">Confirmer le refus</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrls: [
    '../../admin/demandes-stage/admin-demandes-stage.component.css',
    '../../company/company-shared.css',
    '../faculty-shared.css',
    './faculty-company-requests.component.css'
  ]
})
export class FacultyCompanyRequestsPageComponent implements OnInit {
  readonly StatutValidation = StatutValidation;

  requests: DemandeStage[] = [];
  filteredRequests: DemandeStage[] = [];
  selectedRequest: DemandeStage | null = null;

  /**
   * Flag de chargement UNIQUEMENT pour le chargement/rafraîchissement de la liste.
   * Ne bloque PAS les boutons approve/reject (ceux-ci utilisent loadingApprove / loadingReject).
   */
  isLoadingList = false;

  /**
   * Maps par id de demande pour les états de chargement individuels.
   * Cela évite que le clic sur "Approuver" de la ligne 3 bloque les boutons des lignes 1, 2, 4…
   */
  loadingApprove: Record<number, boolean> = {};
  loadingReject: Record<number, boolean> = {};

  errorMessage = '';
  successMessage = '';
  rejectModalOpen = false;
  rejectComment = '';
  rejectValidationMessage = '';
  requestBeingRejected: DemandeStage | null = null;
  searchQuery = '';
  responsibleFilter: ValidationFilter = 'ALL';

  constructor(
    private demandeStageService: ServiceDemandeStageService,
    private cdr: ChangeDetectorRef
  ) {}

  get fullyValidatedCount(): number {
    return this.requests.filter((item) => this.isFullyValidated(item)).length;
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  // ── Chargement de la liste ────────────────────────────────────────────────

  loadRequests(): void {
    this.isLoadingList = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.demandeStageService.getToutesDemandes().pipe(
      timeout(API_TIMEOUT_MS),
      finalize(() => { this.isLoadingList = false; })
    ).subscribe({
      next: (items) => {
        this.requests = [...items].sort((a, b) => b.id - a.id);
        this.selectedRequest = this.requests[0] ?? null;
        this.applyFilters();
      },
      error: (error) => {
        console.error('[FacultyRequests] loadRequests error:', error);
        this.errorMessage = this.extractErrorMessage(
          error,
          error?.name === 'TimeoutError'
            ? 'Le serveur met trop de temps a repondre. Veuillez reessayer.'
            : 'Impossible de charger les demandes entreprise.'
        );
      }
    });
  }

  applyFilters(): void {
    const search = this.searchQuery.trim().toLowerCase();

    this.filteredRequests = this.requests.filter((item) => {
      const searchableText = [
        item.nomEntreprise,
        item.emailEntreprise,
        item.etudiant?.nom,
        item.etudiant?.prenom,
        item.etudiant?.email,
        item.sujetStage
      ].filter(Boolean).join(' ').toLowerCase();

      const responsibleStatus = item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;

      return (!search || searchableText.includes(search))
        && this.matchesValidationFilter(this.responsibleFilter, responsibleStatus);
    });
  }

  selectRequest(request: DemandeStage): void {
    this.selectedRequest = request;
  }

  // ── Actions (per-row loading) ─────────────────────────────────────────────

  approve(request: DemandeStage, event: Event): void {
    event.stopPropagation();

    // Bloque le double-clic
    if (this.loadingApprove[request.id]) return;
    if (!this.canAct(request)) return;
    if (!confirm(`Approuver la demande #${request.id} en tant que responsable universitaire ?`)) return;

    // Nouvelle référence objet → Angular détecte le changement même hors zone
    this.loadingApprove = { ...this.loadingApprove, [request.id]: true };
    this.errorMessage = '';
    this.successMessage = '';

    this.demandeStageService.validerResponsableStages(request.id).pipe(
      timeout(API_TIMEOUT_VALIDATION_MS),
      // finalize() est appelé dans TOUS les cas : succès, erreur, timeout, désabonnement
      finalize(() => {
        this.loadingApprove = { ...this.loadingApprove, [request.id]: false };
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (updatedRequest) => {
        console.log('[FacultyRequests] approve success, id=', request.id, updatedRequest);
        this.successMessage = this.isFullyValidated(updatedRequest)
          ? `Demande #${request.id} validee. L'entreprise a ete creee automatiquement.`
          : `Demande #${request.id} approuvee par le responsable universitaire.`;
        this.syncUpdatedRequest(updatedRequest);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[FacultyRequests] approve error, id=', request.id, error);
        this.errorMessage = this.extractErrorMessage(
          error,
          error?.name === 'TimeoutError'
            ? 'Le serveur met trop de temps a repondre. Veuillez verifier et reessayer.'
            : 'La validation a echoue. Verifiez la console pour plus de details.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  reject(request: DemandeStage, event: Event): void {
    event.stopPropagation();
    if (!this.canAct(request)) return;

    this.requestBeingRejected = request;
    this.rejectComment = '';
    this.rejectValidationMessage = '';
    this.rejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.rejectModalOpen = false;
    this.rejectComment = '';
    this.rejectValidationMessage = '';
    this.requestBeingRejected = null;
  }

  confirmReject(): void {
    const request = this.requestBeingRejected;
    if (!request) return;

    // Bloque le double-clic
    if (this.loadingReject[request.id]) return;

    const comment = this.rejectComment.trim();
    if (!comment) {
      this.rejectValidationMessage = 'Veuillez saisir le motif du refus';
      return;
    }
    if (comment.length > 1000) {
      this.rejectValidationMessage = 'Le motif ne doit pas depasser 1000 caracteres';
      return;
    }

    // Nouvelle référence objet → Angular détecte le changement même hors zone
    this.loadingReject = { ...this.loadingReject, [request.id]: true };
    this.errorMessage = '';
    this.successMessage = '';
    this.rejectValidationMessage = '';

    this.demandeStageService.refuserResponsableStages(request.id, comment).pipe(
      timeout(API_TIMEOUT_MS),
      finalize(() => {
        this.loadingReject = { ...this.loadingReject, [request.id]: false };
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (updatedRequest) => {
        console.log('[FacultyRequests] reject success, id=', request.id);
        this.successMessage = `Demande #${request.id} refusee.`;
        this.syncUpdatedRequest(updatedRequest);
        this.closeRejectModal();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[FacultyRequests] reject error, id=', request.id, error);
        this.errorMessage = this.extractErrorMessage(
          error,
          error?.name === 'TimeoutError'
            ? 'Le serveur met trop de temps a repondre.'
            : 'Le refus a echoue. Verifiez la console pour plus de details.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  // ── Logique métier ────────────────────────────────────────────────────────

  canAct(request: DemandeStage): boolean {
    return request.statut === 'EN_ATTENTE'
      && (request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.EN_ATTENTE;
  }

  isFullyValidated(request: DemandeStage): boolean {
    return (request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE;
  }

  countByResponsibleStatus(status: StatutValidation): number {
    return this.requests.filter(
      (item) => (item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === status
    ).length;
  }

  badgeClass(status: StatutValidation | undefined): string {
    switch (status) {
      case StatutValidation.APPROUVEE: return 'badge badge-approved';
      case StatutValidation.REJETEE:   return 'badge badge-rejected';
      default:                          return 'badge badge-pending';
    }
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  /**
   * Met à jour une demande dans la liste locale SANS recharger toute la liste.
   * Garantit que l'interface se met à jour immédiatement après succès.
   */
  private syncUpdatedRequest(updatedRequest: DemandeStage | null | undefined): void {
    if (!updatedRequest || !Number.isFinite(updatedRequest.id) || updatedRequest.id <= 0) {
      // Réponse inattendue (id absent ou 0) : rechargement silencieux en arrière-plan.
      // On ne touche pas aux messages ni à isLoadingList pour éviter le clignotement
      // et la perte du message de succès déjà positionné.
      console.warn('[FacultyRequests] syncUpdatedRequest: réponse inattendue, rechargement silencieux', updatedRequest);
      this.silentReload();
      return;
    }

    const nextRequests = this.requests.map((item) =>
      item.id === updatedRequest.id ? updatedRequest : item
    );
    this.requests = nextRequests;
    this.selectedRequest = updatedRequest;
    this.applyFilters();
  }

  /**
   * Recharge la liste en arrière-plan sans modifier isLoadingList, errorMessage
   * ni successMessage. Utilisé après une action dont la réponse ne contient pas
   * un objet DemandeStage valide (ex. backend retourne null ou 204).
   */
  private silentReload(): void {
    this.demandeStageService.getToutesDemandes().pipe(
      timeout(API_TIMEOUT_MS)
    ).subscribe({
      next: (items) => {
        this.requests = [...items].sort((a, b) => b.id - a.id);
        // Mettre à jour selectedRequest si elle fait encore partie de la liste
        if (this.selectedRequest) {
          const refreshed = this.requests.find((r) => r.id === this.selectedRequest!.id);
          if (refreshed) this.selectedRequest = refreshed;
        }
        this.applyFilters();
        this.cdr.markForCheck();
      },
      error: (err) => {
        // Rechargement silencieux : on n'écrase pas un éventuel message de succès
        console.warn('[FacultyRequests] silentReload error (ignoré):', err);
      }
    });
  }

  private matchesValidationFilter(filter: ValidationFilter, status: StatutValidation): boolean {
    return filter === 'ALL' || filter === status;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }
}
