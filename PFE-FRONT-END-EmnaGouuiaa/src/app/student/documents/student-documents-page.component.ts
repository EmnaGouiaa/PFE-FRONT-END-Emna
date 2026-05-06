import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  StudentInternship,
  StudentStageDocumentStatus,
  StudentStageDocumentsOverview
} from '../../services/student/student.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { StudentPortalService } from '../../services/student/student-portal.service';

type StudentDocumentType = 'convention' | 'fiche-evaluation' | 'cahier-stage';

@Component({
  selector: 'app-student-documents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Documents de stage</h1>
          <p>Retrouvez les documents du stage, leur statut actuel et les actions autorisées pour votre profil.</p>
        </div>
        <button type="button" class="btn btn-secondary" (click)="reload()" [disabled]="isLoading || isActing">
          Actualiser
        </button>
      </section>

      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>

      <section class="panel" *ngIf="!isLoadingInternships && internships.length">
        <div class="panel-header">
          <div>
            <h2>Stage</h2>
            <p class="panel-subtitle">Les documents affichés reflètent l'état réel de votre convention, de la fiche d'évaluation et du cahier.</p>
          </div>
        </div>

        <select class="select stage-selector" [ngModel]="selectedStageId" (ngModelChange)="onStageChange($event)">
          <option *ngFor="let internship of internships" [ngValue]="internship.id">
            {{ internship.titre || internship.sujet || ('Stage #' + internship.id) }}
          </option>
        </select>
      </section>

      <div class="empty-card" *ngIf="isLoadingInternships || isLoading">Chargement des documents...</div>
      <div class="empty-card" *ngIf="!isLoadingInternships && !internships.length">Aucun stage ne vous a encore ete affecte.</div>
      <div class="empty-card" *ngIf="!isLoading && selectedDocuments && documentEntries.length === 0">
        Aucun document de stage n'est disponible pour votre role.
      </div>

      <section class="documents-grid" *ngIf="!isLoading && documentEntries.length">
        <article class="panel document-card" *ngFor="let doc of documentEntries">
          <div class="document-card__top">
            <div>
              <div class="document-card__eyebrow">{{ getDocumentTypeLabel(doc.type) }}</div>
              <h2>{{ doc.status.libelle }}</h2>
              <p class="panel-subtitle">{{ getDocumentDescription(doc.type, doc.status) }}</p>
            </div>
            <span class="status-pill" [ngClass]="getStatusBadgeClass(doc.status)">
              {{ getStatusLabel(doc.status) }}
            </span>
          </div>

          <div class="document-card__meta">
            <div class="meta-item">
              <span class="label">Statut</span>
              <strong>{{ getStatusLabel(doc.status) }}</strong>
            </div>
            <div class="meta-item">
              <span class="label">Accès</span>
              <strong>{{ doc.status.disponible ? 'Consultation autorisée' : 'En attente' }}</strong>
            </div>
            <div class="meta-item" *ngIf="doc.status.raisonAbsence">
              <span class="label">Détail</span>
              <strong>{{ doc.status.raisonAbsence }}</strong>
            </div>
          </div>

          <div class="document-card__progress" *ngIf="doc.type === 'fiche-evaluation'">
            <div class="progress-item" [ngClass]="selectedDocuments?.ficheEvaluation?.disponible ? 'progress-ok' : 'progress-pending'">
              Consultation du document final
            </div>
            <div class="progress-note">La fiche devient visible lorsqu'elle est suffisamment complétée et disponible au téléchargement.</div>
          </div>

          <div class="detail-actions">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="openPdf(doc.type, doc.status.libelle)"
              [disabled]="isActing || !doc.status.disponible"
            >
              Voir PDF
            </button>

            <button
              *ngIf="doc.type === 'cahier-stage' && !doc.status.genere"
              type="button"
              class="btn btn-primary"
              (click)="generateLogbook()"
              [disabled]="isActing || !doc.status.generationAutorisee"
            >
              Générer le cahier
            </button>

            <button
              *ngIf="doc.type === 'convention' && doc.status.documentId && !doc.status.disponible"
              type="button"
              class="btn btn-primary"
              (click)="signConvention(doc.status)"
              [disabled]="isActing"
            >
              Signer la convention
            </button>

            <button
              *ngIf="doc.type === 'cahier-stage' && doc.status.documentId && !doc.status.disponible"
              type="button"
              class="btn btn-primary"
              (click)="signLogbook(doc.status)"
              [disabled]="isActing"
            >
              Signer le cahier
            </button>
          </div>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .document-card {
      align-content: start;
      gap: 16px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 24px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
    }

    .document-card__top {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .document-card__eyebrow {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #b45309;
      margin-bottom: 0.35rem;
      font-weight: 700;
    }

    .document-card__meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    .meta-item {
      padding: 0.85rem 0.95rem;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid rgba(148, 163, 184, 0.18);
    }

    .meta-item .label {
      display: block;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 0.3rem;
    }

    .document-card__progress {
      border-radius: 18px;
      background: linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%);
      border: 1px solid rgba(251, 146, 60, 0.18);
      padding: 1rem;
      display: grid;
      gap: 0.55rem;
    }

    .progress-item {
      font-weight: 700;
    }

    .progress-ok {
      color: #166534;
    }

    .progress-pending {
      color: #b45309;
    }

    .progress-note {
      color: #6b7280;
      line-height: 1.45;
    }
  `],
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentDocumentsPageComponent implements OnInit {
  internships: StudentInternship[] = [];
  selectedStageId: number | null = null;
  selectedDocuments: StudentStageDocumentsOverview | null = null;
  isLoadingInternships = true;
  isLoading = false;
  isActing = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private studentPortalService: StudentPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  get documentEntries(): Array<{ type: StudentDocumentType; status: StudentStageDocumentStatus }> {
    if (!this.selectedDocuments) return [];
    return [
      { type: 'convention', status: this.selectedDocuments.convention },
      { type: 'fiche-evaluation', status: this.selectedDocuments.ficheEvaluation },
      { type: 'cahier-stage', status: this.selectedDocuments.cahierStage }
    ].filter((entry): entry is { type: StudentDocumentType; status: StudentStageDocumentStatus } => entry.status !== null);
  }

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        const selected = this.studentPortalService.pickCurrentInternship(internships) ?? internships[0] ?? null;
        this.selectedStageId = selected?.id ?? null;
        this.isLoadingInternships = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.reload();
  }

  reload(): void {
    if (!this.selectedStageId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.getStageDocuments(this.selectedStageId).subscribe({
      next: (documents) => {
        this.selectedDocuments = documents;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les documents.');
        this.isLoading = false;
      }
    });
  }

  openPdf(type: StudentDocumentType, label: string): void {
    if (!this.selectedStageId) return;
    this.isActing = true;
    this.errorMessage = '';
    const pdfWindow = this.pdfWindowService.openPlaceholder(label);

    this.studentPortalService.downloadStageDocumentPdf(this.selectedStageId, type).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: label });
        this.isActing = false;
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = this.studentPortalService.describeError(error, `Impossible d'ouvrir ${label}.`);
        this.isActing = false;
      }
    });
  }

  generateLogbook(): void {
    if (!this.selectedStageId) return;
    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.generateLogbook(this.selectedStageId).subscribe({
      next: () => {
        this.successMessage = 'Cahier de stage genere.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de generer le cahier.');
        this.isActing = false;
      }
    });
  }

  signConvention(status: StudentStageDocumentStatus): void {
    if (!status.documentId || !window.confirm('Confirmer la signature de la convention ?')) return;
    this.isActing = true;
    this.studentPortalService.signAgreementAsStudent(status.documentId).subscribe({
      next: () => {
        this.successMessage = 'Convention signee.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer la convention.');
        this.isActing = false;
      }
    });
  }

  signLogbook(status: StudentStageDocumentStatus): void {
    if (!status.documentId || !window.confirm('Confirmer la signature du cahier ?')) return;
    this.isActing = true;
    this.studentPortalService.signReportAsStudent(status.documentId).subscribe({
      next: () => {
        this.successMessage = 'Cahier de stage signe.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer le cahier.');
        this.isActing = false;
      }
    });
  }

  getDocumentTypeLabel(type: StudentDocumentType): string {
    if (type === 'convention') return 'Convention';
    if (type === 'fiche-evaluation') return "Fiche d'évaluation";
    return 'Cahier de stage';
  }

  getStatusLabel(status: StudentStageDocumentStatus): string {
    if (status.disponible && status.genere) return 'Généré';
    if (status.disponible) return 'Signé';
    if (status.generationAutorisee && !status.genere) return 'Prêt à générer';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'À remplir';
  }

  getStatusBadgeClass(status: StudentStageDocumentStatus): string {
    const label = this.getStatusLabel(status);
    if (label === 'Signé' || label === 'Généré') return 'status-positive';
    if (label === 'Prêt à générer') return 'status-info';
    if (label === 'À remplir') return 'status-neutral';
    return 'status-warning';
  }

  getDocumentDescription(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    if (status.disponible) {
      return 'Le document final est disponible à la consultation et au téléchargement.';
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    if (type === 'fiche-evaluation') {
      return "La fiche d'évaluation sera visible dès qu'elle sera suffisamment finalisée.";
    }
    return 'Le document est encore en cours de préparation.';
  }
}
