import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConventionStage } from '../../models/convention-stage.model';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { PdfWindowService } from '../../services/pdf-window.service';
import { ServiceConventionService } from '../../services/service-convention.service';

@Component({
  selector: 'app-agreement-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agreement-detail.component.html',
  styleUrls: ['./agreement-detail.component.css', '../../company/company-shared.css']
})
export class AgreementDetailComponent implements OnInit {
  convention: ConventionStage | null = null;
  stage: any | null = null;

  chargement = true;
  signatureEnCours = false;
  messageErreur = '';
  messageSucces = '';

  constructor(
    private route: ActivatedRoute,
    private conventions: ServiceConventionService,
    private auth: AuthentificationService,
    private http: HttpClient,
    private pdfWindowService: PdfWindowService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    const jetonParam = this.route.snapshot.params['jeton'];

    if (jetonParam && !idParam) {
      // TODO(backend): l'API actuelle n'expose pas de signature via jeton pour `/api/conventions-stage`.
      this.messageErreur = 'La signature via lien n est pas disponible avec l API actuelle.';
      this.chargement = false;
      return;
    }

    const id = Number(idParam);
    if (!Number.isFinite(id) || id <= 0) {
      this.messageErreur = 'Identifiant de convention invalide.';
      this.chargement = false;
      return;
    }

    this.chargerConvention(id);
  }

  imprimer(): void {
    if (!this.convention?.id) {
      this.messageErreur = "Impossible d'imprimer cette convention.";
      return;
    }

    const printWindow = this.pdfWindowService.openPlaceholder('Convention de stage');
    if (!printWindow) {
      this.messageErreur = "La fenêtre d'impression a été bloquée par le navigateur.";
      return;
    }

    this.http.get(`${API_BASE_URL}/conventions-stage/${this.convention.id}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(printWindow, blob, {
          title: 'Convention de stage',
          autoPrint: true
        });
      },
      error: () => {
        printWindow.close();
        this.messageErreur = "Impossible d'ouvrir la fenêtre d'impression du PDF.";
      }
    });
  }

  get role(): RoleUtilisateur | null {
    return this.auth.getRoleUtilisateur();
  }

  get peutSigner(): boolean {
    if (!this.convention || !this.role) {
      return false;
    }

    switch (this.role) {
      case RoleUtilisateur.STAGIAIRE:
        return !this.convention.signeeStagiaire;
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return !this.convention.signeeEncAca;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return !this.convention.signeeEncPro;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return !this.convention.signeeEntreprise;
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        return !this.convention.signeeResp;
      default:
        return false;
    }
  }

  signer(): void {
    if (!this.convention || !this.peutSigner || !this.role) {
      return;
    }

    this.signatureEnCours = true;
    this.messageErreur = '';
    this.messageSucces = '';

    const id = this.convention.id;
    let request$;

    switch (this.role) {
      case RoleUtilisateur.STAGIAIRE:
        request$ = this.conventions.signerParStagiaire(id);
        break;
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        request$ = this.conventions.signerParEncadrantAcademique(id);
        break;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        request$ = this.conventions.signerParEncadrantProfessionnel(id);
        break;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        request$ = this.conventions.signerParEntreprise(id);
        break;
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        request$ = this.conventions.signerParResponsable(id);
        break;
      default:
        this.messageErreur = 'Votre role ne permet pas de signer cette convention.';
        this.signatureEnCours = false;
        return;
    }

    request$.subscribe({
      next: (updated) => {
        this.convention = this.normalizeConvention(updated);
        this.messageSucces = 'Convention signee avec succes.';
        this.signatureEnCours = false;
      },
      error: (error) => {
        this.messageErreur = error?.error?.message ?? 'La signature a echoue.';
        this.signatureEnCours = false;
      }
    });
  }

  private chargerConvention(id: number): void {
    this.chargement = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.conventions.getConventionParId(id).subscribe({
      next: (convention) => {
        this.convention = this.normalizeConvention(convention);
        this.chargerStage(this.convention.stageId);
      },
      error: (error) => {
        this.messageErreur = error?.error?.message ?? 'Convention introuvable.';
        this.chargement = false;
      }
    });
  }

  private chargerStage(stageId: number): void {
    // Le backend expose deja `GET /api/stages/{id}` et la page peut rendre la convention meme sans ces details.
    this.http.get<any>(`${API_BASE_URL}/stages/${stageId}`).subscribe({
      next: (stage) => {
        this.stage = stage;
        this.chargement = false;
      },
      error: () => {
        this.stage = null;
        this.chargement = false;
      }
    });
  }

  private normalizeConvention(raw: any): ConventionStage {
    return {
      id: Number(raw?.id ?? 0),
      numConv: raw?.numConv ?? null,
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      signeeEncAca: Boolean(raw?.signeeEncAca),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeEntreprise: Boolean(raw?.signeeEntreprise),
      signeeResp: Boolean(raw?.signeeResp),
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? ''),
      nomResponsableUniversitaireSignataire: String(raw?.nomResponsableUniversitaireSignataire ?? ''),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      statutSignatures: Boolean(raw?.statutSignatures),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      demandeStageId: raw?.demandeStageId ?? null
    };
  }
}
