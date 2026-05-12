import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicValidationService } from '../services/academic-validation.service';
import { AcademicValidationRequest } from '../models/academic-validation.model';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AcademicValidationDialogComponent } from './academic-validation-dialog.component';

@Component({
  selector: 'app-academic-validation-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="validation-container">
<<<<<<< HEAD
      <h2>Validation académique des demandes de stage</h2>
=======
      <h2>Academic Validation - Internship Requests</h2>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

      <div *ngIf="isLoading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!isLoading" class="table-wrapper">
        <table mat-table [dataSource]="requests" class="validation-table">
          <!-- Student Name -->
          <ng-container matColumnDef="studentName">
<<<<<<< HEAD
            <th mat-header-cell *matHeaderCellDef>Étudiant</th>
=======
            <th mat-header-cell *matHeaderCellDef>Student Name</th>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            <td mat-cell *matCellDef="let element">{{ element.studentName }}</td>
          </ng-container>

          <!-- Subject -->
          <ng-container matColumnDef="subject">
<<<<<<< HEAD
            <th mat-header-cell *matHeaderCellDef>Sujet du stage</th>
=======
            <th mat-header-cell *matHeaderCellDef>Internship Subject</th>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            <td mat-cell *matCellDef="let element">{{ element.internshipSubject }}</td>
          </ng-container>

          <!-- Company -->
          <ng-container matColumnDef="company">
<<<<<<< HEAD
            <th mat-header-cell *matHeaderCellDef>Entreprise</th>
=======
            <th mat-header-cell *matHeaderCellDef>Company</th>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            <td mat-cell *matCellDef="let element">{{ element.companyName }}</td>
          </ng-container>

          <!-- Submitted Date -->
          <ng-container matColumnDef="submittedDate">
<<<<<<< HEAD
            <th mat-header-cell *matHeaderCellDef>Date de soumission</th>
=======
            <th mat-header-cell *matHeaderCellDef>Submitted Date</th>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            <td mat-cell *matCellDef="let element">{{ element.submittedDate | date: 'short' }}</td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="status">
<<<<<<< HEAD
            <th mat-header-cell *matHeaderCellDef>Statut</th>
=======
            <th mat-header-cell *matHeaderCellDef>Status</th>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            <td mat-cell *matCellDef="let element">
              <span [ngClass]="'status-badge ' + element.academicValidationStatus.toLowerCase()">
                {{ element.academicValidationStatus }}
              </span>
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let element">
<<<<<<< HEAD
              <button mat-raised-button color="primary" (click)="onView(element)">Voir</button>
              <button mat-raised-button color="accent" (click)="onApprove(element)"
                *ngIf="element.academicValidationStatus === 'PENDING'">Approuver</button>
              <button mat-raised-button color="warn" (click)="onReject(element)"
                *ngIf="element.academicValidationStatus === 'PENDING'">Refuser</button>
=======
              <button mat-raised-button color="primary" (click)="onView(element)">View</button>
              <button mat-raised-button color="accent" (click)="onApprove(element)"
                *ngIf="element.academicValidationStatus === 'PENDING'">Approve</button>
              <button mat-raised-button color="warn" (click)="onReject(element)"
                *ngIf="element.academicValidationStatus === 'PENDING'">Reject</button>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <div *ngIf="!isLoading && requests.length === 0" class="no-data">
<<<<<<< HEAD
        <p>Aucune validation académique en attente.</p>
=======
        <p>No pending academic validations</p>
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      </div>
    </div>
  `,
  styles: [`
    .validation-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      color: var(--primary);
      margin-bottom: 20px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
    }

    .validation-table {
      width: 100%;
      border-collapse: collapse;
    }

    .validation-table th {
      background: var(--muted);
      color: var(--foreground);
      padding: 16px;
      text-align: left;
      font-weight: 600;
    }

    .validation-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .validation-table tr:hover {
      background: var(--accent);
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending {
      background: #fbbf24;
      color: #78350f;
    }

    .status-badge.approved {
      background: #10b981;
      color: white;
    }

    .status-badge.rejected {
      background: #ef4444;
      color: white;
    }

    button {
      margin-right: 8px;
      margin-bottom: 8px;
      min-width: 80px;
    }

    .no-data {
      padding: 40px;
      text-align: center;
      color: var(--muted-foreground);
    }
  `]
})
export class AcademicValidationListComponent implements OnInit {
  requests: AcademicValidationRequest[] = [];
  isLoading = true;
  displayedColumns = ['studentName', 'subject', 'company', 'submittedDate', 'status', 'actions'];

  private academicValidationService = inject(AcademicValidationService);
  private dialog = inject(MatDialog) as MatDialog;

  ngOnInit() {
    this.loadPendingValidations();
  }

  loadPendingValidations() {
    this.isLoading = true;
    this.academicValidationService.getPendingValidations().subscribe({
      next: (data: AcademicValidationRequest[]) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading validations:', err);
        this.isLoading = false;
      }
    });
  }

  onView(request: AcademicValidationRequest) {
    (this.dialog as MatDialog).open(AcademicValidationDialogComponent, {
      width: '600px',
      data: { request, mode: 'view' }
    });
  }

  onApprove(request: AcademicValidationRequest) {
    const dialogRef = (this.dialog as MatDialog).open(AcademicValidationDialogComponent, {
      width: '500px',
      data: { request, mode: 'approve' }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadPendingValidations();
      }
    });
  }

  onReject(request: AcademicValidationRequest) {
    const dialogRef = (this.dialog as MatDialog).open(AcademicValidationDialogComponent, {
      width: '500px',
      data: { request, mode: 'reject' }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadPendingValidations();
      }
    });
  }
}
