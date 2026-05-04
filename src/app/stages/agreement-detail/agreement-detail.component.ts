import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ServiceConventionService } from '../../services/service-convention.service';
import { AuthentificationService } from '../../services/authentification.service';
import { ConventionStage, StatutConvention, SignatureConvention } from '../../models/convention-stage.model';
import { DialogueConfirmationSignatureComponent } from './dialogue-confirmation-signature.component';
import { ReplacePipe } from '../../pipes/replace.pipe';

@Component({
  selector: 'app-agreement-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    ReplacePipe
  ],
  templateUrl: './agreement-detail.component.html',
  styleUrls: ['./agreement-detail.component.css']
})
export class AgreementDetailComponent implements OnInit {
  convention: ConventionStage | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  chargement = true;
  signatureUtilisateurActuel: SignatureConvention | null = null;

  constructor(
    private route: ActivatedRoute,
    private serviceConvention: ServiceConventionService,
    private serviceAuthentification: AuthentificationService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    const jeton = this.route.snapshot.params['jeton'];

    if (id) {
      this.chargerConvention(id);
    }
  }

  chargerConvention(id: number): void {
    this.chargement = true;
    this.serviceConvention.getConventionParId(id).subscribe({
      next: (convention) => {
        this.convention = convention;
        this.verifierSignatureUtilisateurActuel();
        this.chargerPdf(id);
        this.chargement = false;
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement de la convention', 'Fermer', { duration: 3000 });
        this.chargement = false;
      }
    });
  }

  chargerPdf(id: number): void {
    this.serviceConvention.telechargerPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });
  }

  verifierSignatureUtilisateurActuel(): void {
    const utilisateur = this.serviceAuthentification.getUtilisateurActuel();
    if (utilisateur && this.convention) {
      this.signatureUtilisateurActuel = this.convention.signatures.find(
        sig => sig.utilisateurSignataire.email === utilisateur.email && !sig.estSigne
      ) || null;
    }
  }

  getNombreSignaturesDone(): number {
    return this.convention?.signatures.filter(s => s.estSigne).length || 0;
  }

  getProgres(): number {
    return (this.getNombreSignaturesDone() / 5) * 100;
  }

  ouvrirDialogueSignature(): void {
    const dialogRef = this.dialog.open(DialogueConfirmationSignatureComponent, {
      width: '400px',
      data: { signature: this.signatureUtilisateurActuel }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.signatureUtilisateurActuel?.jetonSignature) {
        this.signer(this.signatureUtilisateurActuel.jetonSignature);
      }
    });
  }

  signer(jeton: string): void {
    this.serviceConvention.signerConvention(jeton).subscribe({
      next: () => {
        this.snackBar.open('Convention signée avec succès !', '🎉', { duration: 5000 });
        if (this.convention) this.chargerConvention(this.convention.id);
      },
      error: () => this.snackBar.open('La signature a échoué', 'Fermer', { duration: 3000 })
    });
  }

  telechargerManuel(): void {
    if (this.convention) {
      this.serviceConvention.telechargerPdf(this.convention.id).subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Convention_${this.convention?.id}.pdf`;
        a.click();
      });
    }
  }
}
