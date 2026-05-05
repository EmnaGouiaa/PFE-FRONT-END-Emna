import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AcademicValidationService } from '../services/academic-validation.service';
import { AcademicValidationRequest } from '../models/academic-validation.model';

@Component({
  selector: 'app-academic-validation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>
        <span *ngIf="isViewMode">Internship Request Details</span>
        <span *ngIf="isApproveMode">Approve Internship Request</span>
        <span *ngIf="isRejectMode">Reject Internship Request</span>
      </h2>

      <mat-dialog-content>
        <div class="request-details">
          <div class="detail-row">
            <span class="label">Student:</span>
            <span class="value">{{ data.request.studentName }} ({{ data.request.studentEmail }})</span>
          </div>

          <div class="detail-row">
            <span class="label">Subject:</span>
            <span class="value">{{ data.request.internshipSubject }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Company:</span>
            <span class="value">{{ data.request.companyName }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Duration:</span>
            <span class="value">
              {{ data.request.startDate | date: 'short' }} to {{ data.request.endDate | date: 'short' }}
            </span>
          </div>

          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value" [ngClass]="'status-' + data.request.academicValidationStatus.toLowerCase()">
              {{ data.request.academicValidationStatus }}
            </span>
          </div>

          <div class="divider" *ngIf="!isViewMode"></div>

          <!-- Comment Field (only for approve/reject) -->
          <mat-form-field appearance="outline" *ngIf="!isViewMode" class="full-width">
            <mat-label>
              <span *ngIf="isApproveMode">Optional Comment</span>
              <span *ngIf="isRejectMode">Rejection Reason (required)</span>
            </mat-label>
            <textarea matInput [(ngModel)]="comment" rows="4"
              [required]="isRejectMode"
              placeholder="Enter your comment...">
            </textarea>
          </mat-form-field>

          <!-- Display comment if already validated -->
          <div *ngIf="isViewMode && data.request.academicComments" class="comment-section">
            <span class="label">Comments:</span>
            <p class="comment-text">{{ data.request.academicComments }}</p>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" *ngIf="isApproveMode" (click)="onApprove()">
          <mat-icon>check</mat-icon> Approve
        </button>
        <button mat-raised-button color="warn" *ngIf="isRejectMode" (click)="onReject()">
          <mat-icon>close</mat-icon> Reject
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 0;
    }

    h2 {
      margin: 0;
      padding: 20px;
      color: var(--primary);
      border-bottom: 1px solid var(--border);
    }

    mat-dialog-content {
      padding: 20px;
      max-height: 600px;
      overflow-y: auto;
    }

    .request-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      background: var(--muted);
      border-radius: 4px;
    }

    .label {
      font-weight: 600;
      color: var(--primary);
      min-width: 120px;
    }

    .value {
      flex: 1;
      color: var(--foreground);
    }

    .status-pending {
      color: #f59e0b;
      font-weight: 600;
    }

    .status-approved {
      color: #10b981;
      font-weight: 600;
    }

    .status-rejected {
      color: #ef4444;
      font-weight: 600;
    }

    .divider {
      border-top: 1px solid var(--border);
      margin: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .comment-section {
      padding: 12px;
      background: var(--muted);
      border-radius: 4px;
    }

    .comment-text {
      margin: 8px 0 0 0;
      color: var(--foreground);
      font-style: italic;
    }

    mat-dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      gap: 12px;
    }

    button mat-icon {
      margin-right: 8px;
    }
  `]
})
export class AcademicValidationDialogComponent {
  comment = '';
  isViewMode = false;
  isApproveMode = false;
  isRejectMode = false;

  data = inject(MAT_DIALOG_DATA) as { request: AcademicValidationRequest, mode: string };
  private dialogRef = inject(MatDialogRef<AcademicValidationDialogComponent>);
  private academicValidationService = inject(AcademicValidationService);

  constructor() {
    this.isViewMode = this.data.mode === 'view';
    this.isApproveMode = this.data.mode === 'approve';
    this.isRejectMode = this.data.mode === 'reject';
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onApprove() {
    this.academicValidationService.approveRequest(this.data.request.id, this.comment).subscribe({
      next: (response: any) => {
        console.log('Request approved:', response);
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error('Error approving request:', err);
        alert('Error approving request');
      }
    });
  }

  onReject() {
    if (!this.comment.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    this.academicValidationService.rejectRequest(this.data.request.id, this.comment).subscribe({
      next: (response: any) => {
        console.log('Request rejected:', response);
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error('Error rejecting request:', err);
        alert('Error rejecting request');
      }
    });
  }
}
