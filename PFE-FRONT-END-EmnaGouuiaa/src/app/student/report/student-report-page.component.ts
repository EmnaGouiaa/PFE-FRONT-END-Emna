import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentInternship, StudentReport } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';
import {
  canSignLogbook,
  getLogbookSignBlockedReason,
} from '../../shared/stage-documents/stage-document-signature-eligibility.util';

@Component({
  selector: 'app-student-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-report-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentReportPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingData = false;
  isSigning = false;
  errorMessage = '';
  successMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  report: StudentReport | null = null;
  summaryEntries: Array<{ key: string; value: unknown }> = [];

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.resolveSelectedInternship(internships);
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        if (this.selectedInternship) {
          this.loadStageData(this.selectedInternship.id);
        }
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.selectedInternship = this.internships.find((item) => item.id === this.selectedStageId) ?? null;
    this.studentPortalService.setSelectedStageId(this.selectedStageId);
    if (this.selectedInternship) {
      this.loadStageData(this.selectedInternship.id);
    }
  }

  canSignReport(): boolean {
    const internship = this.selectedInternship;
    return canSignLogbook({
      dateFin: internship?.dateFin,
      dateDebut: internship?.dateDebut,
      dureeMonths: internship?.duree ?? null,
      alreadySigned: Boolean(this.report?.signeeStagiaire),
      hasDocument: Boolean(this.report?.id),
    });
  }

  getReportSignTooltip(): string {
    if (this.report?.signeeStagiaire) {
      return 'Vous avez déjà signé ce cahier';
    }
    const internship = this.selectedInternship;
    if (this.canSignReport()) {
      return 'Signer le cahier de stage';
    }
    return (
      getLogbookSignBlockedReason(internship?.dateFin, internship?.dateDebut, internship?.duree) ||
      'La signature du cahier de stage n\'est pas encore autorisee.'
    );
  }

  signReport(): void {
    if (!this.report || this.report.signeeStagiaire || !this.canSignReport()) return;
    if (!window.confirm('Confirmer la signature du cahier de stage ?')) return;

    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.signReportAsStudent(this.report.id).subscribe({
      next: (report) => {
        this.report = report;
        this.successMessage = 'Le cahier de stage a été signé avec succès.';
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer le cahier de stage.');
        this.isSigning = false;
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  formatUnknown(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private loadStageData(stageId: number): void {
    this.isLoadingData = true;
    this.report = null;
    this.summaryEntries = [];
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.getReportByStage(stageId).subscribe({
      next: (report) => {
        this.report = report;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger le cahier de stage.');
      }
    });

    this.studentPortalService.getStageReportSummary(stageId).subscribe({
      next: (summary) => {
        this.summaryEntries = Object.entries(summary ?? {}).map(([key, value]) => ({
          key: key.replace(/_/g, ' '),
          value
        }));
        this.isLoadingData = false;
      },
      error: () => {
        this.summaryEntries = [];
        this.isLoadingData = false;
      }
    });
  }
}
