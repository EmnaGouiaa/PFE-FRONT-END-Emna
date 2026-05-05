import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentInternship } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-internship-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Mon stage</h1>
          <p>Consultez le stage qui vous a ete affecte, ses details, ses encadrants et les informations utiles a votre suivi.</p>
        </div>
      </section>

      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="empty-card" *ngIf="isLoading">Chargement des stages...</div>

      <section class="panel" *ngIf="!isLoading && internships.length">
        <div class="panel-header">
          <div>
            <h2>Stage affecte</h2>
            <p class="panel-subtitle">Vous pouvez naviguer entre les stages reels rattaches a votre compte</p>
          </div>
        </div>

        <select class="select stage-selector" [ngModel]="selectedStageId" (ngModelChange)="onStageChange($event)">
          <option *ngFor="let internship of internships" [ngValue]="internship.id">
            {{ internship.titre || internship.sujet || ('Stage #' + internship.id) }}
          </option>
        </select>
      </section>

      <div class="empty-card" *ngIf="!isLoading && !internships.length">Aucun stage ne vous a encore ete affecte.</div>

      <div class="split-grid" *ngIf="selectedInternship">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Detail du stage</h2>
              <p class="panel-subtitle">Informations principales</p>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">Titre</span>
              <span class="value">{{ selectedInternship.titre || 'Non renseigne' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Sujet</span>
              <span class="value">{{ selectedInternship.sujet || 'Non renseigne' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Entreprise</span>
              <span class="value">{{ selectedInternship.company.nom || 'Non renseignee' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Statut</span>
              <span class="value">
                <span class="status-pill" [ngClass]="statusClass(selectedInternship.statut)">
                  {{ formatStatus(selectedInternship.statut) }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Periode</span>
              <span class="value">{{ formatDate(selectedInternship.dateDebut) }} -> {{ formatDate(selectedInternship.dateFin) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Validation du sujet</span>
              <span class="value">{{ formatStatus(selectedInternship.statutSujet || 'NON_RENSEIGNE') }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Duree</span>
              <span class="value">{{ selectedInternship.duree ? (selectedInternship.duree + ' mois') : 'Non renseignee' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Niveau souhaite</span>
              <span class="value">{{ selectedInternship.niveauSouhaite || 'Non renseigne' }}</span>
            </div>
          </div>

          <div class="detail-actions" style="margin-top: 18px;">
            <a routerLink="/etudiant/suivi-stage" class="btn btn-secondary">Voir le suivi</a>
            <a routerLink="/etudiant/documents-stage" class="btn btn-ghost">Ouvrir les documents</a>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Encadrement</h2>
              <p class="panel-subtitle">References de l'entreprise et des encadrants</p>
            </div>
          </div>

          <div class="kv-list">
            <div class="kv-item">
              <span class="label">Encadrant academique</span>
              <span class="value">{{ selectedInternship.academicSupervisor.fullName || 'Non affecte' }}</span>
            </div>
            <div class="kv-item">
              <span class="label">Encadrant professionnel</span>
              <span class="value">{{ selectedInternship.professionalSupervisor.fullName || 'Non affecte' }}</span>
            </div>
            <div class="kv-item">
              <span class="label">Tuteur entreprise</span>
              <span class="value">{{ selectedInternship.companySupervisor.fullName || 'Non renseigne' }}</span>
            </div>
            <div class="kv-item">
              <span class="label">Lien Trello</span>
              <span class="value">
                <a *ngIf="selectedInternship.trelloBoardUrl" [href]="selectedInternship.trelloBoardUrl" target="_blank" rel="noopener" class="link-button">Ouvrir le tableau Trello</a>
                <span *ngIf="!selectedInternship.trelloBoardUrl">Aucun lien Trello defini</span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentInternshipPageComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.pickCurrentInternship(internships);
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoading = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.selectedInternship = this.internships.find((item) => item.id === this.selectedStageId) ?? null;
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  formatStatus(value: string): string {
    return String(value || 'INCONNU').replace(/_/g, ' ');
  }

  statusClass(value: string): string {
    return `status-${String(value || '').toUpperCase()}`;
  }
}
