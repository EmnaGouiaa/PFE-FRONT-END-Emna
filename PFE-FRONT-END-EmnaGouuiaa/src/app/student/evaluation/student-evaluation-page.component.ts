import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentEvaluation, StudentInternship } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-evaluation-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-evaluation-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentEvaluationPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingData = false;
  errorMessage = '';
  infoMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  evaluation: StudentEvaluation | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.pickCurrentInternship(internships);
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        if (this.selectedInternship) {
          this.loadEvaluation(this.selectedInternship.id);
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
    if (this.selectedInternship) {
      this.loadEvaluation(this.selectedInternship.id);
    }
  }

  private loadEvaluation(stageId: number): void {
    this.isLoadingData = true;
    this.evaluation = null;
    this.errorMessage = '';
    this.infoMessage = '';

    this.studentPortalService.getEvaluationByStage(stageId).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.isLoadingData = false;
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.infoMessage = "La fiche d'évaluation n'est pas encore exposée au rôle stagiaire par l'API actuelle.";
        } else {
          this.errorMessage = this.studentPortalService.describeError(error, "Impossible de charger la fiche d'évaluation.");
        }
        this.isLoadingData = false;
      }
    });
  }
}
