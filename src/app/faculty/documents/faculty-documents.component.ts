import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import {
  FacultyStageDocumentStatus,
  FacultyStageDocumentsOverview
} from '../../services/faculty/faculty.models';
import { PdfWindowService } from '../../services/pdf-window.service';

type DocumentType = 'convention' | 'fiche-evaluation' | 'cahier-stage';

@Component({
  selector: 'app-faculty-documents-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Documents de stage</h1>
          <p>Supervisez la convention, la fiche d'évaluation et le cahier de stage depuis une vue unifiée par stage.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadDocuments()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Stages suivis</div>
          <span class="stat-value">{{ stageDocuments.length }}</span>
          <div class="stat-subtitle">Tous les stages visibles par le responsable des stages</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Documents disponibles</div>
          <span class="stat-value">{{ availableDocumentsCount }}</span>
          <div class="stat-subtitle">Documents autorises deja disponibles</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Documents manquants</div>
          <span class="stat-value">{{ missingDocumentsCount }}</span>
          <div class="stat-subtitle">Elements encore a generer ou non encore crees</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des documents de stage...</div>

      <section *ngIf="!isLoading && stageDocuments.length === 0" class="panel">
        <div class="empty-card">Aucun stage n est actuellement disponible pour afficher ses documents.</div>
      </section>

      <section class="documents-grid" *ngIf="!isLoading && stageDocuments.length > 0">
        <article class="stage-card" *ngFor="let item of stageDocuments">
          <div class="stage-card__header">
            <div>
              <h2>{{ item.stageTitre || ('Stage #' + item.stageId) }}</h2>
              <div class="stage-card__meta">{{ item.stagiaireNom || 'Stagiaire non renseigne' }} · {{ item.entrepriseNom || 'Entreprise non renseignee' }}</div>
            </div>
            <span class="status-pill" [ngClass]="item.stageStatut ? 'status-positive' : 'status-neutral'">
              {{ item.stageStatut || 'Statut inconnu' }}
            </span>
          </div>

          <div class="stage-summary">
            <div class="detail-item">
              <span class="label">Encadrant academique</span>
              <span class="value">{{ item.encadrantAcademiqueNom || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Encadrant professionnel</span>
              <span class="value">{{ item.encadrantProfessionnelNom || '-' }}</span>
            </div>
          </div>

          <div class="document-cards">
            <section class="document-card" *ngFor="let doc of getDocumentEntries(item)">
              <div class="document-card__top">
                <div>
                  <div class="document-card__eyebrow">{{ getDocumentTypeLabel(doc.type) }}</div>
                  <div class="document-card__title">{{ doc.status.libelle }}</div>
                  <div class="document-card__hint">{{ getDocumentDescription(doc.type, doc.status) }}</div>
                </div>
                <span class="status-pill" [ngClass]="getStatusBadgeClass(doc.status)">
                  {{ getStatusLabel(doc.status) }}
                </span>
              </div>

              <div class="document-card__summary">
                <div class="summary-item">
                  <span class="label">Statut</span>
                  <strong>{{ getStatusLabel(doc.status) }}</strong>
                </div>
                <div class="summary-item">
                  <span class="label">Génération</span>
                  <strong>{{ doc.status.generationAutorisee ? 'Autorisée' : 'Bloquée' }}</strong>
                </div>
                <div class="summary-item" *ngIf="doc.status.raisonAbsence">
                  <span class="label">Cause</span>
                  <strong>{{ doc.status.raisonAbsence }}</strong>
                </div>
              </div>

              <div class="document-card__signing" *ngIf="doc.type === 'convention' && doc.status.disponible">
                <span class="status-pill" [ngClass]="doc.status.signeeParResponsableUniversitaire ? 'status-positive' : 'status-warning'">
                  {{ doc.status.signeeParResponsableUniversitaire ? 'Signee par le responsable des stages' : 'Signature responsable en attente' }}
                </span>
                <div class="document-card__hint" *ngIf="doc.status.dateSignatureResponsableUniversitaire">
                  Signee le {{ doc.status.dateSignatureResponsableUniversitaire }}
                </div>
              </div>

              <div class="inline-actions">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="generateDocument(item.stageId, doc.type, doc.status.libelle)"
                  [disabled]="isActionPending(item.stageId, doc.type) || !doc.status.generationAutorisee"
                >
                  {{ doc.status.disponible ? 'Regenerer PDF' : 'Generer PDF' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="openDocument(item.stageId, doc.type, doc.status.libelle)"
                  [disabled]="!doc.status.disponible || isActionPending(item.stageId, doc.type)"
                >
                  Voir PDF
                </button>
                <button
                  *ngIf="doc.type === 'convention'"
                  type="button"
                  class="btn btn-secondary"
                  (click)="signConvention(item.stageId, doc.status)"
                  [disabled]="!doc.status.documentId || doc.status.signeeParResponsableUniversitaire || isActionPending(item.stageId, doc.type)"
                >
                  {{ doc.status.signeeParResponsableUniversitaire ? 'Convention deja signee' : 'Signer la convention' }}
                </button>
              </div>
            </section>
          </div>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .documents-grid {
      display: grid;
      gap: 1.5rem;
    }

    .stage-card {
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 24px;
      padding: 1.5rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      display: grid;
      gap: 1.25rem;
    }

    .stage-card__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .stage-card__header h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .stage-card__meta {
      margin-top: 0.35rem;
      color: #64748b;
    }

    .stage-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem;
    }

    .document-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }

    .document-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 20px;
      padding: 1rem;
      background:
        linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 1));
      display: grid;
      gap: 0.9rem;
    }

    .document-card__top {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .document-card__title {
      font-weight: 700;
      color: #0f172a;
    }

    .document-card__eyebrow {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #1d4ed8;
      margin-bottom: 0.3rem;
      font-weight: 700;
    }

    .document-card__hint {
      margin-top: 0.35rem;
      color: #6b7280;
      font-size: 0.95rem;
      line-height: 1.45;
    }

    .document-card__summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    .summary-item {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.16);
      padding: 0.8rem 0.9rem;
    }

    .summary-item .label {
      display: block;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 0.3rem;
    }

    .document-card__signing {
      display: grid;
      gap: 0.45rem;
    }

    .status-neutral {
      background: rgba(148, 163, 184, 0.16);
      color: #475569;
    }

    .status-info {
      background: rgba(191, 219, 254, 0.55);
      color: #1d4ed8;
    }

    @media (max-width: 768px) {
      .stage-card__header,
      .document-card__top {
        flex-direction: column;
      }
    }
  `],
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyDocumentsPageComponent implements OnInit {
  stageDocuments: FacultyStageDocumentsOverview[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  pendingActionKey = '';

  constructor(
    private facultyPortalService: FacultyPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  get availableDocumentsCount(): number {
    return this.stageDocuments.reduce((total, item) => total + this.getDocumentEntries(item).filter((doc) => doc.status.disponible).length, 0);
  }

  get missingDocumentsCount(): number {
    return this.stageDocuments.reduce((total, item) => total + this.getDocumentEntries(item).filter((doc) => !doc.status.disponible).length, 0);
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.facultyPortalService.listStageDocuments().subscribe({
      next: (items) => {
        this.stageDocuments = items;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les documents de stage.');
        this.isLoading = false;
      }
    });
  }

  getDocumentEntries(item: FacultyStageDocumentsOverview): Array<{ type: DocumentType; status: FacultyStageDocumentStatus }> {
    return [
      { type: 'convention', status: item.convention },
      { type: 'fiche-evaluation', status: item.ficheEvaluation },
      { type: 'cahier-stage', status: item.cahierStage }
    ].filter((entry): entry is { type: DocumentType; status: FacultyStageDocumentStatus } => entry.status !== null);
  }

  generateDocument(stageId: number, type: DocumentType, label: string): void {
    this.pendingActionKey = this.buildActionKey(stageId, type);
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.generateStageDocument(stageId, type).subscribe({
      next: (response) => {
        this.stageDocuments = this.stageDocuments.map((item) =>
          item.stageId === response.stageDocuments.stageId ? response.stageDocuments : item
        );
        this.successMessage = response.message || `${label} genere avec succes.`;
        this.pendingActionKey = '';
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, `La generation du document ${label} a echoue.`);
        this.pendingActionKey = '';
      }
    });
  }

  openDocument(stageId: number, type: DocumentType, label: string): void {
    this.pendingActionKey = this.buildActionKey(stageId, type);
    this.errorMessage = '';
    this.successMessage = '';
    const pdfWindow = this.pdfWindowService.openPlaceholder(label);

    this.facultyPortalService.downloadStageDocumentPdf(stageId, type).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: label });
        this.pendingActionKey = '';
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = this.extractErrorMessage(error, `Impossible d'ouvrir le PDF ${label}.`);
        this.pendingActionKey = '';
      }
    });
  }

  isActionPending(stageId: number, type: DocumentType): boolean {
    return this.pendingActionKey === this.buildActionKey(stageId, type);
  }

  signConvention(stageId: number, status: FacultyStageDocumentStatus): void {
    if (!status.documentId) {
      this.errorMessage = 'La convention doit etre generee avant de pouvoir etre signee.';
      return;
    }

    this.pendingActionKey = this.buildActionKey(stageId, 'convention');
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.signAgreementAsResponsableUniversitaire(status.documentId).subscribe({
      next: () => {
        this.facultyPortalService.getStageDocuments(stageId).subscribe({
          next: (updatedStageDocuments) => {
            this.stageDocuments = this.stageDocuments.map((item) =>
              item.stageId === updatedStageDocuments.stageId ? updatedStageDocuments : item
            );
            this.successMessage = 'Convention signee avec succes.';
            this.pendingActionKey = '';
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'La convention a ete signee, mais le rafraichissement a echoue.');
            this.pendingActionKey = '';
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'La signature de la convention a echoue.');
        this.pendingActionKey = '';
      }
    });
  }

  private buildActionKey(stageId: number, type: DocumentType): string {
    return `${stageId}:${type}`;
  }

  getDocumentTypeLabel(type: DocumentType): string {
    if (type === 'convention') return 'Convention';
    if (type === 'fiche-evaluation') return "Fiche d'évaluation";
    return 'Cahier de stage';
  }

  getStatusLabel(status: FacultyStageDocumentStatus): string {
    if (status.disponible && status.genere) return 'Généré';
    if (status.disponible) return 'Signé';
    if (status.generationAutorisee && !status.genere) return 'Prêt à générer';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'À remplir';
  }

  getStatusBadgeClass(status: FacultyStageDocumentStatus): string {
    const label = this.getStatusLabel(status);
    if (label === 'Signé' || label === 'Généré') return 'status-positive';
    if (label === 'Prêt à générer') return 'status-info';
    if (label === 'À remplir') return 'status-neutral';
    return 'status-warning';
  }

  getDocumentDescription(type: DocumentType, status: FacultyStageDocumentStatus): string {
    if (status.disponible) {
      return 'Le document final est disponible pour vérification et consultation PDF.';
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    if (type === 'fiche-evaluation') {
      return "La fiche d'évaluation restera indisponible tant qu'elle n'est pas suffisamment complétée et signée.";
    }
    return 'Le document n’est pas encore prêt pour la consultation.';
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
