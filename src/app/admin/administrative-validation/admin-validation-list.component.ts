import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AdministrativeValidationService } from '../../services/administrative-validation.service';
import { InternshipRequest, InternshipStatus } from '../../models/internship-request.model';
import { AdminValidationDialogComponent } from './admin-validation-dialog.component';

@Component({
  selector: 'app-admin-validation-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-validation-list.component.html',
  styleUrls: ['./admin-validation-list.component.css']
})
export class AdminValidationListComponent implements OnInit {
  displayedColumns: string[] = ['studentName', 'company', 'supervisor', 'academicDate', 'status', 'actions'];
  dataSource: InternshipRequest[] = [];
  isLoading = true;

  constructor(
    private validationService: AdministrativeValidationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.validationService.getPendingRequests().subscribe({
      next: (requests) => {
        this.dataSource = requests;
        this.isLoading = false;
      },
<<<<<<< HEAD
      error: () => {
        this.snackBar.open('Erreur lors du chargement des demandes.', 'Fermer', { duration: 3000 });
=======
      error: (error) => {
        this.snackBar.open('Error loading requests', 'Close', { duration: 3000 });
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        this.isLoading = false;
      }
    });
  }

  openValidationDialog(request: InternshipRequest): void {
    const dialogRef = this.dialog.open(AdminValidationDialogComponent, {
      width: '600px',
      data: { request }
    });

<<<<<<< HEAD
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadRequests();
        if (result.status === InternshipStatus.OFFICIAL) {
          this.snackBar.open('Le stage a été officialisé avec succès.', 'Fermer', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
=======
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRequests();
        if (result.status === InternshipStatus.OFFICIAL) {
           this.snackBar.open('Internship is now official!', '🎉', { 
             duration: 5000,
             panelClass: ['success-snackbar']
           });
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        }
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
<<<<<<< HEAD
      case InternshipStatus.ACADEMICALLY_APPROVED:
        return 'status-approved-academic';
      case InternshipStatus.OFFICIAL:
        return 'status-official';
      case InternshipStatus.ADMIN_REJECTED:
        return 'status-rejected-admin';
      default:
        return 'status-pending';
=======
      case InternshipStatus.ACADEMICALLY_APPROVED: return 'status-approved-academic';
      case InternshipStatus.OFFICIAL: return 'status-official';
      case InternshipStatus.ADMIN_REJECTED: return 'status-rejected-admin';
      default: return 'status-pending';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    }
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }
}
