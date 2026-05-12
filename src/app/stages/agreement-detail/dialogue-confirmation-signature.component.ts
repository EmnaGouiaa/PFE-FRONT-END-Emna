import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { SignatureConvention } from '../../models/convention-stage.model';

@Component({
  selector: 'app-dialogue-confirmation-signature',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Signer la Convention</h2>
    <mat-dialog-content>
      <p>Vous êtes sur le point de signer cette convention de stage en tant que <strong>{{data.signature.utilisateurSignataire.prenom}} {{data.signature.utilisateurSignataire.nom}}</strong>.</p>
      <p>Rôle : <strong>{{data.signature.roleSignataire }}</strong></p>
      
      <mat-checkbox [(ngModel)]="estConfirme">
        Je confirme avoir lu et accepté cette convention
      </mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="annuler()">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!estConfirme" (click)="confirmer()">
        Signer Électroniquement
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { padding-top: 10px; }
    mat-checkbox { margin-top: 20px; display: block; }
  `]
})
export class DialogueConfirmationSignatureComponent {
  estConfirme = false;

  constructor(
    public dialogRef: MatDialogRef<DialogueConfirmationSignatureComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { signature: SignatureConvention }
  ) {}

  confirmer(): void {
    this.dialogRef.close(true);
  }

  annuler(): void {
    this.dialogRef.close(false);
  }
}
