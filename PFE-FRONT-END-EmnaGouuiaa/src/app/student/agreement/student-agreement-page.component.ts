import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentAgreement, StudentInternship } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-agreement-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-agreement-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentAgreementPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingData = false;
  isSigning = false;
  errorMessage = '';
  successMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  agreement: StudentAgreement | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.resolveSelectedInternship(internships);
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        if (this.selectedInternship) {
          this.loadAgreement(this.selectedInternship.id);
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
      this.loadAgreement(this.selectedInternship.id);
    }
  }

  signAgreement(): void {
    if (!this.agreement || this.agreement.signeeStagiaire) return;
    if (!window.confirm('Confirmer la signature de la convention de stage ?')) return;

    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.signAgreementAsStudent(this.agreement.id).subscribe({
      next: (agreement) => {
        this.agreement = agreement;
        this.successMessage = 'La convention a été signée avec succès.';
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer la convention.');
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

  private loadAgreement(stageId: number): void {
    this.isLoadingData = true;
    this.agreement = null;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.getAgreementByStage(stageId).subscribe({
      next: (agreement) => {
        this.agreement = agreement;
        this.isLoadingData = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger la convention.');
        this.isLoadingData = false;
      }
    });
  }
}
