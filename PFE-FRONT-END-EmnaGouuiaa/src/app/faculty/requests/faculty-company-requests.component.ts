import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeStage, StatutValidation } from '../../models/demande-stage.model';
import { ServiceDemandeStageService } from '../../services/service-demande-stage.service';

type ValidationFilter = 'ALL' | 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';

@Component({
  selector: 'app-faculty-company-requests-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Demandes de creation d'entreprise</h1>
          <p>Le responsable universitaire valide les demandes. Des que la double validation est atteinte, l'entreprise est creee automatiquement.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="loadRequests()" [disabled]="isLoading">Rafraichir</button>
        </div>
      </header>

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
          <div class="stat-label">Validation admin OK</div>
          <div class="stat-value">{{ countByAdminStatus(StatutValidation.APPROUVEE) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Double validation</div>
          <div class="stat-value">{{ fullyValidatedCount }}</div>
        </div>
      </section>

      <section class="filters">
        <input
          class="input"
          type="text"
          placeholder="Rechercher par entreprise, etudiant, sujet..."
          [(ngModel)]="searchQuery"
          (input)="applyFilters()"
        />

        <select class="select" [(ngModel)]="adminFilter" (change)="applyFilters()">
          <option value="ALL">Admin: tous</option>
          <option value="EN_ATTENTE">Admin: en attente</option>
          <option value="APPROUVEE">Admin: approuvee</option>
          <option value="REJETEE">Admin: rejetee</option>
        </select>

        <select class="select" [(ngModel)]="responsibleFilter" (change)="applyFilters()">
          <option value="ALL">Responsable: tous</option>
          <option value="EN_ATTENTE">Responsable: en attente</option>
          <option value="APPROUVEE">Responsable: approuvee</option>
          <option value="REJETEE">Responsable: rejetee</option>
        </select>
      </section>

      <div class="support-banner">
        Regle metier: l'entreprise est creee automatiquement en base des que l'administrateur et le responsable universitaire approuvent la demande.
      </div>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div *ngIf="isLoading" class="loading">Chargement des demandes...</div>

      <section class="content-grid" *ngIf="!isLoading">
        <article class="panel">
          <div *ngIf="filteredRequests.length === 0" class="empty-card">Aucune demande ne correspond aux filtres.</div>

          <div class="table-wrap" *ngIf="filteredRequests.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entreprise</th>
                  <th>Etudiant</th>
                  <th>Statut global</th>
                  <th>Admin</th>
                  <th>Responsable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let request of filteredRequests" (click)="selectRequest(request)">
                  <td>{{ request.id }}</td>
                  <td>
                    <div class="cell-title">{{ request.nomEntreprise }}</div>
                    <div class="cell-sub">{{ request.emailEntreprise || '-' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ request.etudiant?.prenom || '-' }} {{ request.etudiant?.nom || '' }}</div>
                    <div class="cell-sub">{{ request.etudiant?.email || '-' }}</div>
                  </td>
                  <td>
                    <span [class]="demandeBadgeClass(request)">{{ getDemandeStatusLabel(request) }}</span>
                  </td>
                  <td>
                    <span [class]="badgeClass(request.statutValidationAdmin)">{{ request.statutValidationAdmin }}</span>
                  </td>
                  <td>
                    <span [class]="badgeClass(request.statutValidationResponsableStages || StatutValidation.EN_ATTENTE)">
                      {{ request.statutValidationResponsableStages || StatutValidation.EN_ATTENTE }}
                    </span>
                  </td>
                  <td class="actions">
                    <button class="btn btn-success" (click)="approve(request, $event)" [disabled]="!canAct(request) || isLoading">
                      Approuver
                    </button>
                    <button class="btn btn-danger" (click)="reject(request, $event)" [disabled]="!canAct(request) || isLoading">
                      Refuser
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

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
                <span class="label">Etudiant</span>
                <span class="value">{{ selectedRequest.etudiant?.prenom || '-' }} {{ selectedRequest.etudiant?.nom || '' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Sujet</span>
                <span class="value">{{ selectedRequest.sujetStage || 'Non renseigne' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Validation Admin</span>
                <span class="value">{{ selectedRequest.statutValidationAdmin }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Validation Responsable</span>
                <span class="value">{{ selectedRequest.statutValidationResponsableStages || StatutValidation.EN_ATTENTE }}</span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Commentaires disponibles</div>
              <div class="info-meta">Admin: {{ selectedRequest.commentaireAdmin || 'Aucun commentaire' }}</div>
              <div class="info-meta">Responsable: {{ selectedRequest.commentaireResponsableStages || 'Aucun commentaire' }}</div>
            </div>

            <div class="detail-card">
              <div class="info-title">Statut global</div>
              <div class="info-meta" *ngIf="isFullyValidated(selectedRequest)">Demande entierement validee. L'entreprise a ete creee automatiquement.</div>
              <div class="info-meta" *ngIf="!isFullyValidated(selectedRequest)">La demande reste en attente tant que les deux validations ne sont pas approuvees.</div>
            </div>
          </div>
        </article>
      </section>

      <div class="refusal-modal-backdrop" *ngIf="rejectModalOpen" (click)="closeRejectModal()">
        <section class="refusal-modal" (click)="$event.stopPropagation()">
          <div class="refusal-hero">
            <div class="refusal-icon" aria-hidden="true">!</div>
            <div>
              <div class="refusal-kicker">Refus responsable</div>
              <h2>Motif du refus</h2>
              <p>Le motif sera enregistré et affiché au stagiaire dans le détail de sa demande.</p>
            </div>
          </div>

          <div class="refusal-context" *ngIf="requestBeingRejected">
            <div><strong>Entreprise :</strong> {{ requestBeingRejected.nomEntreprise }}</div>
            <div><strong>Étudiant :</strong> {{ requestBeingRejected.etudiant?.prenom || '-' }} {{ requestBeingRejected.etudiant?.nom || '' }}</div>
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
            <button type="button" class="btn btn-secondary" (click)="closeRejectModal()">Annuler</button>
            <button type="button" class="btn btn-danger" (click)="confirmReject()" [disabled]="isLoading">
              Confirmer le refus
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

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  rejectModalOpen = false;
  rejectComment = '';
  rejectValidationMessage = '';
  requestBeingRejected: DemandeStage | null = null;
  searchQuery = '';
  adminFilter: ValidationFilter = 'ALL';
  responsibleFilter: ValidationFilter = 'ALL';

  constructor(private demandeStageService: ServiceDemandeStageService) {}

  get fullyValidatedCount(): number {
    return this.requests.filter((item) => this.isFullyValidated(item)).length;
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.demandeStageService.getToutesDemandes().subscribe({
      next: (items) => {
        this.requests = [...items].sort((a, b) => b.id - a.id);
        this.selectedRequest = this.requests[0] ?? null;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les demandes entreprise.');
        this.isLoading = false;
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

      const adminStatus = item.statutValidationAdmin;
      const responsibleStatus = item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;

      return (!search || searchableText.includes(search))
        && this.matchesValidationFilter(this.adminFilter, adminStatus)
        && this.matchesValidationFilter(this.responsibleFilter, responsibleStatus);
    });
  }

  selectRequest(request: DemandeStage): void {
    this.selectedRequest = request;
  }

  approve(request: DemandeStage, event: Event): void {
    event.stopPropagation();
    if (!this.canAct(request) || !confirm(`Approuver la demande #${request.id} cote responsable universitaire ?`)) return;

    this.isLoading = true;
    this.demandeStageService.validerResponsableStages(request.id).subscribe({
      next: (updatedRequest) => {
        this.successMessage = this.isFullyValidated(updatedRequest)
          ? `Demande #${request.id} completement validee. L'entreprise a ete creee automatiquement.`
          : `Demande #${request.id} approuvee cote responsable universitaire.`;
        this.syncUpdatedRequest(updatedRequest);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'La validation responsable a echoue.');
        this.isLoading = false;
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

    const comment = this.rejectComment.trim();
    if (!comment) {
      this.rejectValidationMessage = 'Veuillez saisir le motif du refus';
      return;
    }

    this.isLoading = true;
    this.demandeStageService.refuserResponsableStages(request.id, comment).subscribe({
      next: (updatedRequest) => {
        this.successMessage = 'La demande a été refusée avec succès';
        this.syncUpdatedRequest(updatedRequest);
        this.closeRejectModal();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Le refus responsable a echoue.');
        this.isLoading = false;
      }
    });
  }

  canAct(request: DemandeStage): boolean {
    return request.statut === 'EN_ATTENTE'
      && request.statutValidationAdmin !== StatutValidation.REJETEE
      && (request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.EN_ATTENTE;
  }

  isFullyValidated(request: DemandeStage): boolean {
    return request.statutValidationAdmin === StatutValidation.APPROUVEE
      && (request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE;
  }

  countByAdminStatus(status: StatutValidation): number {
    return this.requests.filter((item) => item.statutValidationAdmin === status).length;
  }

  countByResponsibleStatus(status: StatutValidation): number {
    return this.requests.filter((item) => (item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === status).length;
  }

  badgeClass(status: StatutValidation | undefined): string {
    switch (status) {
      case StatutValidation.APPROUVEE:
        return 'badge badge-approved';
      case StatutValidation.REJETEE:
        return 'badge badge-rejected';
      default:
        return 'badge badge-pending';
    }
  }

  getDemandeStatusLabel(request: DemandeStage): string {
    if (request.statut === 'REJETEE') return 'REFUSEE';
    if (this.isFullyValidated(request)) return 'VALIDEE';
    if (request.statutValidationAdmin === StatutValidation.APPROUVEE) return 'VALIDEE PAR ADMIN';
    if ((request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE) {
      return 'VALIDEE PAR RESPONSABLE';
    }
    return 'EN ATTENTE';
  }

  demandeBadgeClass(request: DemandeStage): string {
    const status = this.getDemandeStatusLabel(request);
    if (status === 'VALIDEE') return 'badge badge-approved';
    if (status === 'REFUSEE') return 'badge badge-rejected';
    return 'badge badge-pending';
  }

  private syncUpdatedRequest(updatedRequest: DemandeStage): void {
    const nextRequests = this.requests.map((item) => item.id === updatedRequest.id ? updatedRequest : item);
    this.requests = nextRequests;
    this.selectedRequest = updatedRequest;
    this.applyFilters();
  }

  private matchesValidationFilter(filter: ValidationFilter, status: StatutValidation): boolean {
    return filter === 'ALL' || filter === status;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
