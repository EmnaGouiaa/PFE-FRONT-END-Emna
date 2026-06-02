import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAgreement, FacultyEvaluation, FacultyReport } from '../../services/faculty/faculty.models';

@Component({
  selector: 'app-faculty-evaluations-reports-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Évaluations et rapports</h1>
          <p>Visualisation des fiches d'évaluation (selon vos droits) et suivi des cahiers / rapports déjà soumis.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadData()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="warningMessage" class="support-banner warning-banner">{{ warningMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Rapports</div>
          <span class="stat-value">{{ reports.length }}</span>
          <div class="stat-subtitle">Source : /api/cahiers-stage</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Evaluations visibles</div>
          <span class="stat-value">{{ evaluations.length }}</span>
          <div class="stat-subtitle">Source : /api/fiches-evaluation</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Dossiers incomplets</div>
          <span class="stat-value">{{ incompleteFilesCount }}</span>
          <div class="stat-subtitle">Basé sur rapports + conventions + évaluations disponibles</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des évaluations et rapports...</div>

      <section class="content-grid" *ngIf="!isLoading">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Rapports soumis</h2>
              <div class="panel-subtitle">Cahiers de stage existants par stage.</div>
            </div>
          </div>

          <div *ngIf="reports.length === 0" class="empty-card">Aucun rapport/cahier renvoyé par le backend.</div>

          <div class="table-wrap" *ngIf="reports.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Généré le</th>
                  <th>Signatures</th>
                  <th>File status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let report of reports" (click)="selectReport(report)">
                  <td>{{ report.stageTitre || ('Stage #' + report.stageId) }}</td>
                  <td>{{ report.dateGeneration || '-' }}</td>
                  <td>{{ signedCount(report) }}/4</td>
                  <td>
                    <span class="status-pill" [ngClass]="report.estSigne ? 'status-positive' : 'status-warning'">
                      {{ report.estSigne ? 'Complet' : 'Incomplet' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Dossier du stage</h2>
              <div class="panel-subtitle">Synthèse du dossier pour le stage sélectionné.</div>
            </div>
          </div>

          <div *ngIf="!selectedReport" class="empty-card">Sélectionnez un rapport pour analyser le dossier académique.</div>

          <div *ngIf="selectedReport" class="stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Stage</span>
                <span class="value">{{ selectedReport.stageTitre || ('Stage #' + selectedReport.stageId) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Report signatures</span>
                <span class="value">{{ signedCount(selectedReport) }}/4</span>
              </div>
              <div class="detail-item">
                <span class="label">Agreement</span>
                <span class="value">{{ selectedAgreement?.statutSignatures ? 'Complet' : 'En attente / absent' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Evaluation</span>
                <span class="value">{{ selectedEvaluation ? (selectedEvaluation.complete ? 'Complète' : 'Incomplète') : 'Non accessible / absente' }}</span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Détails de l'évaluation</div>
              <div class="info-meta" *ngIf="selectedEvaluation">Note finale : {{ selectedEvaluation.noteFinale != null ? (selectedEvaluation.noteFinale | number:'1.1-1') + ' / 5' : 'N/D' }}</div>
              <div class="info-meta" *ngIf="selectedEvaluation">Commentaire encadrant pro : {{ selectedEvaluation.pointFortEncadrantPro || 'Aucun' }}</div>
              <div class="info-meta" *ngIf="!selectedEvaluation">Aucune fiche d'évaluation accessible pour ce stage.</div>
            </div>

            <div class="detail-card">
              <div class="info-title">Résumé du rapport généré</div>
              <div class="info-meta" *ngIf="reportSummaryEntries.length === 0">Aucun résumé exploitable renvoyé par /api/stages/:id/generer-rapport.</div>
              <div class="info-meta" *ngFor="let entry of reportSummaryEntries">{{ entry.key }}: {{ entry.value }}</div>
            </div>
          </div>
        </article>
      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyEvaluationsReportsPageComponent implements OnInit {
  reports: FacultyReport[] = [];
  evaluations: FacultyEvaluation[] = [];
  agreements: FacultyAgreement[] = [];
  selectedReport: FacultyReport | null = null;
  selectedAgreement: FacultyAgreement | null = null;
  selectedEvaluation: FacultyEvaluation | null = null;
  reportSummaryEntries: Array<{ key: string; value: string }> = [];

  isLoading = false;
  errorMessage = '';
  warningMessage = '';

  constructor(private facultyPortalService: FacultyPortalService) {}

  get incompleteFilesCount(): number {
    return this.reports.filter((report) => !report.estSigne || !this.findAgreement(report.stageId)?.statutSignatures).length;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.warningMessage = '';

    forkJoin({
      reports: this.facultyPortalService.listReports().pipe(catchError(() => of([] as FacultyReport[]))),
      agreements: this.facultyPortalService.listAgreements().pipe(catchError(() => of([] as FacultyAgreement[]))),
      evaluations: this.facultyPortalService.listEvaluations().pipe(catchError((error) => {
        if (error?.status === 403) {
          this.warningMessage = "Accès restreint : le backend refuse la liste des fiches d'évaluation pour ce rôle.";
        }
        return of([] as FacultyEvaluation[]);
      }))
    }).subscribe({
      next: ({ reports, agreements, evaluations }) => {
        this.reports = reports;
        this.agreements = agreements;
        this.evaluations = evaluations;
        this.isLoading = false;

        if (reports.length > 0) {
          this.selectReport(reports[0]);
        }
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les rapports ou évaluations.');
        this.isLoading = false;
      }
    });
  }

  selectReport(report: FacultyReport): void {
    this.selectedReport = report;
    this.selectedAgreement = this.findAgreement(report.stageId);
    this.selectedEvaluation = this.evaluations.find((item) => item.stageId === report.stageId) ?? null;
    this.reportSummaryEntries = [];

    this.facultyPortalService.getStageReportSummary(report.stageId).pipe(
      catchError(() => of({}))
    ).subscribe((summary) => {
      this.reportSummaryEntries = Object.entries(summary ?? {}).map(([key, value]) => ({
        key,
        value: Array.isArray(value) ? value.join(', ') : String(value)
      }));
    });
  }

  signedCount(report: FacultyReport): number {
    return [report.signeeEncAcad, report.signeeEncPro, report.signeeRespEntreprise, report.signeeStagiaire]
      .filter(Boolean)
      .length;
  }

  private findAgreement(stageId: number): FacultyAgreement | null {
    return this.agreements.find((item) => item.stageId === stageId) ?? null;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
