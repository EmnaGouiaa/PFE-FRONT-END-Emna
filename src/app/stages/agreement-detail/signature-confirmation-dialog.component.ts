import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { AgreementSignature } from '../../models/agreement.model';

@Component({
  selector: 'app-signature-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Sign Agreement</h2>
    <mat-dialog-content>
      <p>You are about to sign this internship agreement as <strong>{{data.signature.signatoryUser.prenom}} {{data.signature.signatoryUser.nom}}</strong>.</p>
      <p>Role: <strong>{{data.signature.signatoryRole }}</strong></p>
      
      <mat-checkbox [(ngModel)]="isConfirmed">
        I confirm I have read and agree to this agreement
      </mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!isConfirmed" (click)="onConfirm()">
        Electronically Sign
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { padding-top: 10px; }
    mat-checkbox { margin-top: 20px; display: block; }
  `]
})
export class SignatureConfirmationDialogComponent {
  isConfirmed = false;

  constructor(
    public dialogRef: MatDialogRef<SignatureConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { signature: AgreementSignature }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
