import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAgreement, FacultyInternship } from '../../services/faculty/faculty.models';
import {
  FacultyInternshipDetailDialogComponent,
  FacultyInternshipDetailDialogData
} from './faculty-internship-detail-dialog.component';
import {
  FACULTY_STAGE_STATUS_FILTERS,
  FacultyStageStatusFilter,
  facultyStageSuiviChipClass,
  facultyStageSuiviLabel,
  matchesFacultyStageStatusFilter
} from '../../services/faculty/faculty-stage-status.util';

@Component({
  selector: 'app-faculty-internships-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './faculty-internships.component.html',
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css', './faculty-internships.component.css']
})
export class FacultyInternshipsPageComponent implements OnInit {
  internships: FacultyInternship[] = [];
  filteredInternships: FacultyInternship[] = [];
  agreementsByStageId = new Map<number, FacultyAgreement>();

  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  statusFilter: FacultyStageStatusFilter = 'ALL';
  supervisorFilter = 'ALL';
  readonly stageStatusFilters = FACULTY_STAGE_STATUS_FILTERS;

  constructor(
    private facultyPortalService: FacultyPortalService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInternships();
  }

  get missingSupervisorCount(): number {
    return this.internships.filter((item) => !item.academicSupervisor.id).length;
  }

  loadInternships(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      internships: this.facultyPortalService
        .listInternships(this.statusFilter !== 'ALL' ? this.statusFilter : undefined)
        .pipe(catchError(() => of([] as FacultyInternship[]))),
      agreements: this.facultyPortalService.listAgreements().pipe(catchError(() => of([] as FacultyAgreement[])))
    }).subscribe({
      next: ({ internships, agreements }) => {
        this.internships = internships;
        this.filteredInternships = internships;
        this.agreementsByStageId = new Map(agreements.map((item) => [item.stageId, item]));
        this.applyFilters();
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

  openDetails(internship: FacultyInternship): void {
    const data: FacultyInternshipDetailDialogData = {
      internship,
      agreement: this.getAgreement(internship.id)
    };

    this.dialog.open(FacultyInternshipDetailDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'faculty-internship-detail-dialog',
      data
    });
  }

  trackByInternshipId(_index: number, internship: FacultyInternship): number {
    return internship.id;
  }

  statusClass(statutSuivi: string): string {
    return facultyStageSuiviChipClass(statutSuivi);
  }

  formatStatusLabel(statutSuivi: string): string {
    return facultyStageSuiviLabel(statutSuivi);
  }

  onStatusFilterChange(): void {
    this.loadInternships();
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
