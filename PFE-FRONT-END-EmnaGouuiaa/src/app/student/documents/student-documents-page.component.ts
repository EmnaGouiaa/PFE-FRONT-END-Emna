import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  StudentInternship,
  StudentStageDocumentStatus,
  StudentStageDocumentsOverview
} from '../../services/student/student.models';
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
          <p>Convention, evaluation et cahier de stage accessibles selon votre role.</p>
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
            <p class="panel-subtitle">Les documents affiches sont filtres par votre role.</p>
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
          <div class="panel-header">
            <div>
              <h2>{{ doc.status.libelle }}</h2>
              <p class="panel-subtitle">{{ doc.status.disponible ? 'PDF disponible' : (doc.status.raisonAbsence || 'Document non disponible') }}</p>
            </div>
            <span class="status-pill" [ngClass]="doc.status.disponible ? 'status-positive' : 'status-warning'">
              {{ doc.status.disponible ? 'Disponible' : doc.status.statut || 'En attente' }}
            </span>
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
              Generer le cahier
            </button>

            <button
              *ngIf="doc.type === 'convention' && doc.status.documentId"
              type="button"
              class="btn btn-primary"
              (click)="signConvention(doc.status)"
              [disabled]="isActing"
            >
              Signer la convention
            </button>

            <button
              *ngIf="doc.type === 'cahier-stage' && doc.status.documentId"
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

  constructor(private studentPortalService: StudentPortalService) {}

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

    this.studentPortalService.downloadStageDocumentPdf(this.selectedStageId, type).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.isActing = false;
      },
      error: (error) => {
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
}
