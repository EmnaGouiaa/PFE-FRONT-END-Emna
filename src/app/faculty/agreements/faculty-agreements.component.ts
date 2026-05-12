import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAgreement } from '../../services/faculty/faculty.models';

@Component({
  selector: 'app-faculty-agreements-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Conventions de stage</h1>
          <p>Suivi des conventions, detail des signatures et signature du responsable des stages.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadAgreements()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Conventions</div>
          <span class="stat-value">{{ agreements.length }}</span>
          <div class="stat-subtitle">Total disponible</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Signatures en attente</div>
          <span class="stat-value">{{ pendingSignaturesCount }}</span>
          <div class="stat-subtitle">Convention incomplete ou signature responsable manquante</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des conventions...</div>

      <section class="content-grid" *ngIf="!isLoading">
        <article class="panel">
          <div *ngIf="agreements.length === 0" class="empty-card">Aucune convention renvoyee par l'API.</div>

          <div class="table-wrap" *ngIf="agreements.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>Convention</th>
                  <th>Stage</th>
                  <th>Periode</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let agreement of agreements" (click)="selectAgreement(agreement)">
                  <td>#{{ agreement.id }}{{ agreement.numConv ? (' · ' + agreement.numConv) : '' }}</td>
                  <td>{{ agreement.stageTitre || ('Stage #' + agreement.stageId) }}</td>
                  <td>{{ agreement.dateDebut || '-' }} → {{ agreement.dateFin || '-' }}</td>
                  <td>
                    <span class="status-pill" [ngClass]="agreement.statutSignatures ? 'status-positive' : 'status-warning'">
                      {{ agreement.statutSignatures ? 'Complete' : 'Incomplete' }}
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
              <h2>Details de la convention</h2>
              <div class="panel-subtitle">Etat des signatures pour la convention selectionnee.</div>
            </div>
          </div>

          <div *ngIf="!selectedAgreement" class="empty-card">Selectionnez une convention.</div>

          <div *ngIf="selectedAgreement" class="stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Stagiaire</span>
                <span class="value">{{ selectedAgreement.signeeStagiaire ? 'Signe' : 'En attente' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Encadrant academique</span>
                <span class="value">{{ selectedAgreement.signeeEncAca ? 'Signe' : 'En attente' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Encadrant professionnel</span>
                <span class="value">{{ selectedAgreement.signeeEncPro ? 'Signe' : 'En attente' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedAgreement.signeeEntreprise ? 'Signe' : 'En attente' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Responsable des stages</span>
                <span class="value">{{ selectedAgreement.signeeResp ? 'Signe' : 'En attente' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Date signature responsable</span>
                <span class="value">{{ selectedAgreement.dateSignatureResponsableUniversitaire || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Signature globale</span>
                <span class="value">{{ selectedAgreement.statutSignatures ? 'Complete' : 'Incomplete' }}</span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Signature du responsable des stages</div>
              <div class="info-meta" *ngIf="selectedAgreement.signeeResp">
                Signee par le responsable des stages{{ selectedAgreement.dateSignatureResponsableUniversitaire ? (' le ' + selectedAgreement.dateSignatureResponsableUniversitaire) : '' }}.
              </div>
              <div class="info-meta" *ngIf="!selectedAgreement.signeeResp">
                La convention attend encore la signature du responsable des stages.
              </div>
            </div>

            <div class="inline-actions">
              <a class="btn btn-secondary" [routerLink]="['/stages/convention', selectedAgreement.id]">Afficher la convention</a>
              <button class="btn btn-primary" (click)="signSelectedAgreement()" [disabled]="!selectedAgreement || selectedAgreement.signeeResp || isLoading">
                {{ selectedAgreement.signeeResp ? 'Deja signee' : 'Signer la convention' }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyAgreementsPageComponent implements OnInit {
  agreements: FacultyAgreement[] = [];
  selectedAgreement: FacultyAgreement | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private facultyPortalService: FacultyPortalService) {}

  get pendingSignaturesCount(): number {
    return this.agreements.filter((item) => !item.statutSignatures || !item.signeeResp).length;
  }

  ngOnInit(): void {
    this.loadAgreements();
  }

  loadAgreements(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.listAgreements().subscribe({
      next: (items) => {
        this.agreements = items;
        this.selectedAgreement = items[0] ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les conventions.');
        this.isLoading = false;
      }
    });
  }

  selectAgreement(agreement: FacultyAgreement): void {
    this.selectedAgreement = agreement;
  }

  signSelectedAgreement(): void {
    if (!this.selectedAgreement) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.signAgreementAsResponsable(this.selectedAgreement.id).subscribe({
      next: (updatedAgreement) => {
        this.agreements = this.agreements.map((item) => item.id === updatedAgreement.id ? updatedAgreement : item);
        this.selectedAgreement = updatedAgreement;
        this.successMessage = `Convention #${updatedAgreement.id} signee cote responsable des stages.`;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'La signature de la convention a echoue.');
        this.isLoading = false;
      }
    });
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
