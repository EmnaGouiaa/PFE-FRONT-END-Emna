import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import { FacultyAgreement, FacultyInternship } from '../../services/faculty/faculty.models';
import {
  facultyStageSuiviChipClass,
  facultyStageSuiviLabel
} from '../../services/faculty/faculty-stage-status.util';

export interface FacultyInternshipDetailDialogData {
  internship: FacultyInternship;
  agreement: FacultyAgreement | null;
}

@Component({
  selector: 'app-faculty-internship-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './faculty-internship-detail-dialog.component.html',
  styleUrls: ['./faculty-internship-detail-dialog.component.css']
})
export class FacultyInternshipDetailDialogComponent implements OnInit {
  internship: FacultyInternship;
  agreement: FacultyAgreement | null;
  detailLoading = false;

  constructor(
    private dialogRef: MatDialogRef<FacultyInternshipDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FacultyInternshipDetailDialogData,
    private facultyPortalService: FacultyPortalService
  ) {
    this.internship = data.internship;
    this.agreement = data.agreement;
  }

  ngOnInit(): void {
    this.loadInternshipDetails(this.internship.id);
  }

  close(): void {
    this.dialogRef.close();
  }

  statusClass(statutSuivi: string): string {
    return facultyStageSuiviChipClass(statutSuivi);
  }

  formatStatusLabel(statutSuivi: string): string {
    return facultyStageSuiviLabel(statutSuivi);
  }

  formatSubjectStatusLabel(status: string): string {
    if (!status?.trim()) {
      return 'N/D';
    }
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private loadInternshipDetails(stageId: number): void {
    this.detailLoading = true;

    this.facultyPortalService.getInternshipById(stageId).subscribe({
      next: (item) => {
        this.internship = item;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }
}
