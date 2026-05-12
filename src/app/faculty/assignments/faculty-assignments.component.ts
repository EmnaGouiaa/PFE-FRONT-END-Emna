import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAcademicSupervisor, FacultyInternship, FacultyStudentAssignment } from '../../services/faculty/faculty.models';

type AssignmentTab = 'WITH_STAGE' | 'WITHOUT_STAGE';

@Component({
  selector: 'app-faculty-assignments-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Affectation des encadrants academiques</h1>
          <p>Gerez dans une meme section les stagiaires avec stage et les stagiaires sans stage, sans action separee inutile.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadData()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="panel search-panel">
        <div class="panel-header">
          <div>
            <h2>Recherche rapide</h2>
            <div class="panel-subtitle">Retrouvez un stagiaire par email pour l'affecter plus vite, avec ou sans stage.</div>
          </div>
        </div>

        <div class="search-row">
          <input
            type="email"
            class="search-input"
            placeholder="Rechercher un stagiaire par email"
            [(ngModel)]="searchEmail"
            (keyup.enter)="searchStudent()"
          />
          <button type="button" class="btn btn-primary" (click)="searchStudent()" [disabled]="isLoading || !searchEmail.trim()">
            Rechercher
          </button>
          <button type="button" class="btn btn-secondary" (click)="clearSearch()" [disabled]="isLoading || !searchEmail.trim()">
            Reinitialiser
          </button>
        </div>

        <div *ngIf="searchInfoMessage" class="search-feedback">{{ searchInfoMessage }}</div>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Avec stage</div>
          <span class="stat-value">{{ internships.length }}</span>
          <div class="stat-subtitle">Stagiaires rattaches a un stage</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Sans stage</div>
          <span class="stat-value">{{ studentsWithoutStage.length }}</span>
          <div class="stat-subtitle">Affectation anticipee possible</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Sans encadrant</div>
          <span class="stat-value">{{ internshipsWithoutSupervisor.length + studentsWithoutSupervisor.length }}</span>
          <div class="stat-subtitle">Dossiers a prioriser</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Encadrants academiques</div>
          <span class="stat-value">{{ supervisors.length }}</span>
          <div class="stat-subtitle">Liste des encadrants disponibles</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des affectations...</div>

      <section *ngIf="!isLoading" class="panel panel-shell">
        <div class="tabs-shell">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'WITH_STAGE'"
            (click)="activeTab = 'WITH_STAGE'"
          >
            Avec stage
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'WITHOUT_STAGE'"
            (click)="activeTab = 'WITHOUT_STAGE'"
          >
            Sans stage
          </button>
        </div>

        <div *ngIf="activeTab === 'WITH_STAGE'" class="tab-content">
          <div class="panel-header">
            <div>
              <h2>Stagiaires avec stage</h2>
              <div class="panel-subtitle">Affectez ou modifiez l'encadrant academique pour les stages deja existants.</div>
            </div>
          </div>

          <div *ngIf="displayedInternships.length === 0" class="empty-card">
            Aucun stagiaire avec stage n'est actuellement disponible pour cette section.
          </div>

          <div class="table-wrap" *ngIf="displayedInternships.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Stagiaire</th>
                  <th>Encadrant actuel</th>
                  <th>Nouvelle affectation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let internship of displayedInternships">
                  <td>
                    <div class="cell-title">{{ internship.titre || ('Stage #' + internship.id) }}</div>
                    <div class="cell-sub">{{ internship.company.nom || '-' }}</div>
                    <div class="cell-sub">{{ formatStageStatus(internship.statut) }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ internship.student.fullName || '-' }}</div>
                    <div class="cell-sub">{{ internship.student.email || '-' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ internship.academicSupervisor.fullName || 'Non affecte' }}</div>
                    <div class="cell-sub">{{ internship.academicSupervisor.secondary || internship.academicSupervisor.email || '-' }}</div>
                  </td>
                  <td>
                    <select class="select" [(ngModel)]="stageDraftAssignments[internship.id]">
                      <option value="">Choisir un encadrant</option>
                      <option *ngFor="let supervisor of supervisors" [value]="supervisor.id">
                        {{ supervisor.prenom }} {{ supervisor.nom }}{{ supervisor.grade ? (' - ' + supervisor.grade) : '' }}
                      </option>
                    </select>
                  </td>
                  <td class="actions">
                    <button
                      class="btn btn-primary"
                      (click)="assignInternship(internship)"
                      [disabled]="!stageDraftAssignments[internship.id] || isLoading"
                    >
                      {{ internship.academicSupervisor.id ? 'Modifier' : 'Affecter' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div *ngIf="activeTab === 'WITHOUT_STAGE'" class="tab-content">
          <div class="panel-header">
            <div>
              <h2>Stagiaires sans stage</h2>
              <div class="panel-subtitle">Affectation anticipee d'un encadrant academique avant la creation du stage.</div>
            </div>
          </div>

          <div *ngIf="displayedStudentsWithoutStage.length === 0" class="empty-card">
            Aucun stagiaire sans stage n'est actuellement disponible pour une affectation anticipee.
          </div>

          <div class="cards-grid" *ngIf="displayedStudentsWithoutStage.length > 0">
            <article class="detail-card student-card" *ngFor="let student of displayedStudentsWithoutStage">
              <div class="card-top">
                <div>
                  <div class="info-title">{{ student.fullName || '-' }}</div>
                  <div class="info-meta">{{ student.email || '-' }}</div>
                </div>
                <span class="status-chip">Sans stage</span>
              </div>

              <div class="card-meta">
                <div class="meta-row">
                  <span class="label">Filiere</span>
                  <span class="value">{{ student.filiereNom || 'Non renseignee' }}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Niveau</span>
                  <span class="value">{{ student.niveau ?? '-' }}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Encadrant actuel</span>
                  <span class="value">{{ student.academicSupervisor.fullName || 'Aucun' }}</span>
                </div>
              </div>

              <div class="card-actions">
                <select class="select" [(ngModel)]="studentDraftAssignments[student.id]">
                  <option value="">Choisir un encadrant</option>
                  <option *ngFor="let supervisor of supervisors" [value]="supervisor.id">
                    {{ supervisor.prenom }} {{ supervisor.nom }}{{ supervisor.grade ? (' - ' + supervisor.grade) : '' }}
                  </option>
                </select>

                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="assignStudentWithoutStage(student)"
                  [disabled]="!studentDraftAssignments[student.id] || isLoading"
                >
                  {{ student.academicSupervisor.id ? 'Modifier' : 'Affecter' }}
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css'],
  styles: [`
    .panel-shell {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .search-panel {
      margin-bottom: 1.5rem;
    }

    .search-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-input {
      flex: 1 1 320px;
      min-height: 48px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      padding: 0.85rem 1rem;
      font: inherit;
      background: #fff;
      color: #0f172a;
    }

    .search-input:focus {
      outline: none;
      border-color: #177362;
      box-shadow: 0 0 0 4px rgba(23, 115, 98, 0.12);
    }

    .search-feedback {
      margin-top: 0.85rem;
      color: #475569;
      font-weight: 600;
    }

    .tabs-shell {
      display: inline-flex;
      gap: 0.5rem;
      padding: 0.45rem;
      border-radius: 999px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      width: fit-content;
    }

    .tab-btn {
      border: none;
      border-radius: 999px;
      padding: 0.8rem 1.2rem;
      background: transparent;
      color: #475569;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .student-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .status-chip {
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      background: #fff7ed;
      color: #c2410c;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .meta-row .label {
      color: #64748b;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .meta-row .value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: auto;
    }
  `]
})
export class FacultyAssignmentsPageComponent implements OnInit {
  internships: FacultyInternship[] = [];
  studentsWithoutStage: FacultyStudentAssignment[] = [];
  supervisors: FacultyAcademicSupervisor[] = [];

  stageDraftAssignments: Record<number, string> = {};
  studentDraftAssignments: Record<number, string> = {};

  activeTab: AssignmentTab = 'WITH_STAGE';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchEmail = '';
  searchInfoMessage = '';
  searchedStudent: FacultyStudentAssignment | null = null;

  constructor(private facultyPortalService: FacultyPortalService) {}

  get internshipsWithoutSupervisor(): FacultyInternship[] {
    return this.internships.filter((item) => !item.academicSupervisor.id);
  }

  get studentsWithoutSupervisor(): FacultyStudentAssignment[] {
    return this.studentsWithoutStage.filter((item) => !item.academicSupervisor.id);
  }

  get displayedInternships(): FacultyInternship[] {
    if (!this.searchedStudent) {
      return this.internships;
    }

    if (!this.searchedStudent.hasActiveStage) {
      return [];
    }

    const searchedEmail = this.normalizeEmail(this.searchedStudent.email);
    return this.internships.filter((item) =>
      item.id === this.searchedStudent?.activeStageId
      || this.normalizeEmail(item.student.email) === searchedEmail
    );
  }

  get displayedStudentsWithoutStage(): FacultyStudentAssignment[] {
    if (!this.searchedStudent) {
      return this.studentsWithoutStage;
    }

    if (this.searchedStudent.hasActiveStage) {
      return [];
    }

    return this.studentsWithoutStage.filter((item) => item.id === this.searchedStudent?.id);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    forkJoin({
      internships: this.facultyPortalService.listInternships(),
      studentsWithoutStage: this.facultyPortalService.listStudentsWithoutStage(),
      supervisors: this.facultyPortalService.listAcademicSupervisors()
    }).subscribe({
      next: ({ internships, studentsWithoutStage, supervisors }) => {
        this.internships = this.sortInternships(internships);
        this.studentsWithoutStage = this.sortStudents(studentsWithoutStage);
        this.supervisors = supervisors;
        this.stageDraftAssignments = this.internships.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.academicSupervisor.id ? String(item.academicSupervisor.id) : '';
          return acc;
        }, {});
        this.studentDraftAssignments = this.studentsWithoutStage.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.academicSupervisor.id ? String(item.academicSupervisor.id) : '';
          return acc;
        }, {});
        this.reconcileSearchedStudent();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les donnees d affectation.');
        this.isLoading = false;
      }
    });
  }

  searchStudent(): void {
    const email = this.searchEmail.trim();
    if (!email) {
      this.clearSearch();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.searchInfoMessage = '';

    this.facultyPortalService.searchStudentByEmail(email).subscribe({
      next: (student) => {
        this.searchedStudent = student;
        this.activeTab = student.hasActiveStage ? 'WITH_STAGE' : 'WITHOUT_STAGE';
        this.searchInfoMessage = `Stagiaire trouve : ${student.fullName || student.email}`;
        this.isLoading = false;
      },
      error: (error) => {
        this.searchedStudent = null;
        this.searchInfoMessage = '';
        this.errorMessage = this.extractErrorMessage(error, 'Aucun stagiaire trouve avec cet email.');
        this.isLoading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchEmail = '';
    this.searchInfoMessage = '';
    this.searchedStudent = null;
    this.errorMessage = '';
  }

  assignInternship(internship: FacultyInternship): void {
    const encadrantId = Number(this.stageDraftAssignments[internship.id]);
    if (!Number.isFinite(encadrantId) || encadrantId <= 0) {
      this.errorMessage = 'Choisissez un encadrant academique avant de valider.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.assignAcademicSupervisor(internship.id, encadrantId).subscribe({
      next: (updatedInternship) => {
        this.internships = this.sortInternships(
          this.internships.map((item) => item.id === updatedInternship.id ? updatedInternship : item)
        );
        this.stageDraftAssignments[updatedInternship.id] = updatedInternship.academicSupervisor.id
          ? String(updatedInternship.academicSupervisor.id)
          : '';
        this.reconcileSearchedStudent();
        this.successMessage = `Encadrant academique mis a jour pour le stage #${updatedInternship.id}.`;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'L affectation du stage a echoue.');
        this.isLoading = false;
      }
    });
  }

  assignStudentWithoutStage(student: FacultyStudentAssignment): void {
    const encadrantId = Number(this.studentDraftAssignments[student.id]);
    if (!Number.isFinite(encadrantId) || encadrantId <= 0) {
      this.errorMessage = 'Choisissez un encadrant academique avant de valider.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.assignAcademicSupervisorToStudent(student.id, encadrantId).subscribe({
      next: (result) => {
        this.studentsWithoutStage = this.sortStudents(
          this.studentsWithoutStage.map((item) => item.id === result.student.id ? result.student : item)
        );
        this.studentDraftAssignments[result.student.id] = result.student.academicSupervisor.id
          ? String(result.student.academicSupervisor.id)
          : '';
        if (this.searchedStudent?.id === result.student.id) {
          this.searchedStudent = result.student;
        }
        this.successMessage = result.message;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'L affectation anticipee a echoue.');
        this.isLoading = false;
      }
    });
  }

  formatStageStatus(status: string): string {
    switch (status) {
      case 'EN_ATTENTE':
        return 'Stage en attente';
      case 'VALIDE_PAR_ENTREPRISE':
        return 'Valide par entreprise';
      case 'VALIDE_PAR_RESPONSABLE':
        return 'Valide par responsable';
      case 'EN_COURS':
        return 'Stage en cours';
      case 'TERMINE':
        return 'Stage termine';
      case 'REFUSE':
        return 'Stage refuse';
      default:
        return status || 'Statut indisponible';
    }
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }

  private reconcileSearchedStudent(): void {
    if (!this.searchedStudent) {
      return;
    }

    const searchedEmail = this.normalizeEmail(this.searchedStudent.email);

    const studentWithoutStage = this.studentsWithoutStage.find((item) => this.normalizeEmail(item.email) === searchedEmail);
    if (studentWithoutStage) {
      this.searchedStudent = studentWithoutStage;
      return;
    }

    const internship = this.internships.find((item) => this.normalizeEmail(item.student.email) === searchedEmail);
    if (internship) {
      this.searchedStudent = {
        id: internship.student.id ?? this.searchedStudent.id,
        fullName: internship.student.fullName,
        email: internship.student.email,
        matricule: '',
        filiereNom: '',
        niveau: null,
        academicSupervisor: internship.academicSupervisor,
        activeStageId: internship.id,
        activeStageTitle: internship.titre,
        activeStageStatus: internship.statut,
        hasActiveStage: true
      };
      return;
    }

    this.searchedStudent = null;
    this.searchInfoMessage = '';
  }

  private normalizeEmail(email: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private sortInternships(items: FacultyInternship[]): FacultyInternship[] {
    return [...items].sort((a, b) => {
      const missingComparison = Number(a.academicSupervisor.id ? 1 : 0) - Number(b.academicSupervisor.id ? 1 : 0);
      if (missingComparison !== 0) return missingComparison;

      return (a.titre || '').localeCompare(b.titre || '', 'fr', { sensitivity: 'base' });
    });
  }

  private sortStudents(items: FacultyStudentAssignment[]): FacultyStudentAssignment[] {
    return [...items].sort((a, b) => {
      const missingComparison = Number(a.academicSupervisor.id ? 1 : 0) - Number(b.academicSupervisor.id ? 1 : 0);
      if (missingComparison !== 0) return missingComparison;

      return a.fullName.localeCompare(b.fullName, 'fr', { sensitivity: 'base' });
    });
  }
}
