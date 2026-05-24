import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAgreement, FacultyInternship } from '../../services/faculty/faculty.models';

@Component({
  selector: 'app-faculty-internships-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Suivi des stages</h1>
          <p>Liste complète des stages avec filtres, détails opérationnels et indicateurs de suivi.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadInternships()" [disabled]="isLoading">
            Actualiser
          </button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>

      <section class="toolbar">
        <input
          class="input"
          type="text"
          placeholder="Rechercher par étudiant, entreprise, sujet…"
          [(ngModel)]="searchQuery"
          (input)="applyFilters()"
        />

        <select class="select" [(ngModel)]="statusFilter" (change)="applyFilters()">
          <option value="ALL">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="VALIDE_PAR_ENTREPRISE">Validé par l'entreprise</option>
          <option value="VALIDE_PAR_RESPONSABLE">Validé par le responsable</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINE">Terminé</option>
          <option value="REFUSE">Refusé</option>
        </select>

        <select class="select" [(ngModel)]="supervisorFilter" (change)="applyFilters()">
          <option value="ALL">Tous les encadrants</option>
          <option value="MISSING">Sans encadrant académique</option>
          <option value="ASSIGNED">Avec encadrant académique</option>
        </select>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des stages...</div>

      <section class="content-grid" *ngIf="!isLoading">
        <article class="panel">
          <div *ngIf="filteredInternships.length === 0" class="empty-card">Aucun stage trouvé.</div>

          <div class="table-wrap" *ngIf="filteredInternships.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Étudiant</th>
                  <th>Entreprise</th>
                  <th>Encadrant académique</th>
                  <th>Convention</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let internship of filteredInternships" (click)="selectInternship(internship)">
                  <td>
                    <div class="cell-title">{{ internship.titre || ('Stage #' + internship.id) }}</div>
                    <div class="cell-sub">{{ internship.sujet || 'Sujet non renseigné' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ internship.student.fullName || '-' }}</div>
                    <div class="cell-sub">{{ internship.student.email || '-' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ internship.company.nom || '-' }}</div>
                    <div class="cell-sub">{{ internship.company.secteurActivite || internship.company.email || '-' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ internship.academicSupervisor.fullName || 'Non affecté' }}</div>
                    <div class="cell-sub">{{ internship.academicSupervisor.secondary || internship.academicSupervisor.email || '-' }}</div>
                  </td>
                  <td>
                    <ng-container *ngIf="getAgreement(internship.id) as agreement; else noAgreement">
                      <span class="status-pill" [ngClass]="agreement.statutSignatures ? 'status-positive' : 'status-warning'">
                        {{ agreement.statutSignatures ? 'Complète' : 'Incomplète' }}
                      </span>
                    </ng-container>
                    <ng-template #noAgreement>
                      <span class="status-pill status-neutral">Absente</span>
                    </ng-template>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="statusClass(internship.statut)">{{ internship.statut || 'N/D' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Détails du stage</h2>
              <div class="panel-subtitle">Vue détaillée du stage sélectionné.</div>
            </div>
          </div>

          <div *ngIf="!selectedInternship" class="empty-card">Sélectionnez un stage pour afficher ses détails.</div>

          <div *ngIf="selectedInternship" class="stack">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Étudiant</span>
                <span class="value">{{ selectedInternship.student.fullName || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Entreprise</span>
                <span class="value">{{ selectedInternship.company.nom || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Encadrant académique</span>
                <span class="value">{{ selectedInternship.academicSupervisor.fullName || 'Non affecté' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Encadrant professionnel</span>
                <span class="value">{{ selectedInternship.professionalSupervisor.fullName || 'Non renseigné' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Période</span>
                <span class="value">{{ selectedInternship.dateDebut || '-' }} → {{ selectedInternship.dateFin || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Statut sujet</span>
                <span class="value">{{ selectedInternship.statutSujet || 'N/D' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Convention de stage</span>
                <span class="value">
                  <ng-container *ngIf="selectedAgreement; else noSelectedAgreement">
                    #{{ selectedAgreement.numConv || selectedAgreement.id }}
                    <span class="status-pill" [ngClass]="selectedAgreement.statutSignatures ? 'status-positive' : 'status-warning'">
                      {{ selectedAgreement.statutSignatures ? 'Complète' : 'Incomplète' }}
                    </span>
                  </ng-container>
                  <ng-template #noSelectedAgreement>Aucune convention associée</ng-template>
                </span>
              </div>
            </div>

            <div class="detail-card">
              <div class="info-title">Suivi</div>
              <div class="info-meta" *ngIf="selectedInternship.trelloBoardUrl">
                Tableau Trello : <a class="link-button" [href]="selectedInternship.trelloBoardUrl" target="_blank" rel="noreferrer">ouvrir</a>
              </div>
              <div class="info-meta" *ngIf="!selectedInternship.trelloBoardUrl">
                Aucun tableau Trello lié à ce stage.
              </div>
            </div>

          </div>
        </article>
      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyInternshipsPageComponent implements OnInit {
  internships: FacultyInternship[] = [];
  filteredInternships: FacultyInternship[] = [];
  selectedInternship: FacultyInternship | null = null;
  agreementsByStageId = new Map<number, FacultyAgreement>();
  selectedAgreement: FacultyAgreement | null = null;

  isLoading = false;
  detailLoading = false;
  errorMessage = '';
  searchQuery = '';
  statusFilter = 'ALL';
  supervisorFilter = 'ALL';

  constructor(private facultyPortalService: FacultyPortalService) {}

  ngOnInit(): void {
    this.loadInternships();
  }

  loadInternships(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      internships: this.facultyPortalService.listInternships().pipe(catchError(() => of([] as FacultyInternship[]))),
      agreements: this.facultyPortalService.listAgreements().pipe(catchError(() => of([] as FacultyAgreement[])))
    }).subscribe({
      next: ({ internships, agreements }) => {
        this.internships = internships;
        this.filteredInternships = internships;
        this.agreementsByStageId = new Map(agreements.map((item) => [item.stageId, item]));
        this.selectedInternship = internships[0] ?? null;
        this.selectedAgreement = this.selectedInternship ? this.getAgreement(this.selectedInternship.id) : null;
        this.applyFilters();

        if (this.selectedInternship) {
          this.loadInternshipDetails(this.selectedInternship.id);
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les stages.');
        this.isLoading = false;
      }
    });
  }

  getAgreement(stageId: number): FacultyAgreement | null {
    return this.agreementsByStageId.get(stageId) ?? null;
  }

  applyFilters(): void {
    const search = this.searchQuery.trim().toLowerCase();

    this.filteredInternships = this.internships.filter((item) => {
      const searchable = [
        item.titre,
        item.sujet,
        item.student.fullName,
        item.student.email,
        item.company.nom,
        item.academicSupervisor.fullName
      ].join(' ').toLowerCase();

      const matchesSearch = !search || searchable.includes(search);
      const matchesStatus = this.statusFilter === 'ALL' || item.statut === this.statusFilter;
      const matchesSupervisor = this.supervisorFilter === 'ALL'
        || (this.supervisorFilter === 'MISSING' && !item.academicSupervisor.id)
        || (this.supervisorFilter === 'ASSIGNED' && !!item.academicSupervisor.id);

      return matchesSearch && matchesStatus && matchesSupervisor;
    });
  }

  selectInternship(internship: FacultyInternship): void {
    this.selectedInternship = internship;
    this.selectedAgreement = this.getAgreement(internship.id);
    this.loadInternshipDetails(internship.id);
  }

  statusClass(status: string): string {
    return `status-${status || 'neutral'}`;
  }

  private loadInternshipDetails(stageId: number): void {
    this.detailLoading = true;

    this.facultyPortalService.getInternshipById(stageId).subscribe({
      next: (item) => {
        this.selectedInternship = item;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
