import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { AdministrativeValidationService } from '../../services/administrative-validation.service';
import { InternshipRequest, InternshipStatus } from '../../models/internship-request.model';

@Component({
  selector: 'app-admin-validation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatIconModule
  ],
  templateUrl: './admin-validation-dialog.component.html',
  styleUrls: ['./admin-validation-dialog.component.css']
})
export class AdminValidationDialogComponent implements OnInit {
  validationForm: FormGroup;
  isProcessing = false;
  request: InternshipRequest;

  constructor(
    private fb: FormBuilder,
    private validationService: AdministrativeValidationService,
    public dialogRef: MatDialogRef<AdminValidationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { request: InternshipRequest }
  ) {
    this.request = data.request;
    this.validationForm = this.fb.group({
      comment: ['']
    });
  }

  ngOnInit(): void {}

  onApprove(): void {
    this.isProcessing = true;
    const comment = this.validationForm.get('comment')?.value || 'Affectation officiellement confirmée.';

    this.validationService.approveRequest(this.request.id, comment).subscribe({
      next: (updatedRequest) => {
        this.isProcessing = false;
        this.dialogRef.close({ status: InternshipStatus.OFFICIAL, request: updatedRequest });
      },
      error: (error) => {
        console.error("Échec de l'approbation :", error);
        this.isProcessing = false;
      }
    });
  }

  onReject(): void {
    const comment = this.validationForm.get('comment')?.value;

    if (!comment || comment.trim().length < 5) {
      this.validationForm.get('comment')?.setErrors({ required: true });
      return;
    }

    this.isProcessing = true;
    this.validationService.rejectRequest(this.request.id, comment).subscribe({
      next: (updatedRequest) => {
        this.isProcessing = false;
        this.dialogRef.close({ status: InternshipStatus.ADMIN_REJECTED, request: updatedRequest });
      },
      error: (error) => {
        console.error('Échec du refus :', error);
        this.isProcessing = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
