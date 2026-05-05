import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AgreementService } from '../services/agreement.service';
import { InternshipAgreement, AgreementSignature } from '../models/agreement.model';

@Component({
  selector: 'app-agreement-dashboard-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="widget-container mat-elevation-z2">
      <div class="widget-header">
        <h3>Electronic Signature Tracking</h3>
        <button mat-button color="primary" routerLink="/admin/agreements">View All</button>
      </div>

      <table mat-table [dataSource]="agreements">
        <ng-container matColumnDef="student">
          <th mat-header-cell *matHeaderCellDef> Student </th>
          <td mat-cell *matCellDef="let element"> 
            {{element.internshipRequest.student.prenom}} {{element.internshipRequest.student.nom}} 
          </td>
        </ng-container>

        <ng-container matColumnDef="progress">
          <th mat-header-cell *matHeaderCellDef> Progress </th>
          <td mat-cell *matCellDef="let element"> 
            {{getSignedCount(element)}}/5 signed 
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef> Status </th>
          <td mat-cell *matCellDef="let element">
            <span class="status-badge" [ngClass]="element.status.toLowerCase()">
              {{element.status}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Actions </th>
          <td mat-cell *matCellDef="let element">
            <button mat-icon-button [routerLink]="['/stages/agreement', element.id]">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .widget-container { background: white; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .widget-header h3 { margin: 0; font-weight: 600; color: #1e293b; }
    table { width: 100%; }
    .status-badge { font-size: 11px; padding: 4px 8px; border-radius: 12px; }
    .generated { background: #f1f5f9; color: #475569; }
    .partially_signed { background: #dbeafe; color: #1e40af; }
    .fully_signed { background: #dcfce7; color: #166534; }
  `]
})
export class AgreementDashboardWidgetComponent implements OnInit {
  agreements: InternshipAgreement[] = [];
  displayedColumns = ['student', 'progress', 'status', 'actions'];

  constructor(private agreementService: AgreementService) {}

  ngOnInit(): void {
    // For demo/widget purpose, we could fetch recent or specific ones
    this.agreementService.getPendingSignatures().subscribe((data: InternshipAgreement[]) => {
      this.agreements = data.slice(0, 5); 
    });
  }

  getSignedCount(agreement: InternshipAgreement): number {
    return agreement.signatures.filter((s: AgreementSignature) => s.signed).length;
  }
}
