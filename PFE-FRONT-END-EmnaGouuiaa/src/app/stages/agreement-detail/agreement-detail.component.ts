import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConventionStage } from '../../models/convention-stage.model';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { PdfWindowService } from '../../services/pdf-window.service';
import { ServiceConventionService } from '../../services/service-convention.service';
import {
  canAccessStageDocumentPdf,
  FinalStageDocumentStatus,
  getConventionPdfBlockReason,
} from '../../services/final-stage-document-access.util';
import { StageSignatureSyncService } from '../../services/stage-signature-sync.service';
import { isConventionSigningPermitted } from '../../shared/stage-documents/stage-document-signature-eligibility.util';

@Component({
  selector: 'app-agreement-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agreement-detail.component.html',
  styleUrls: ['./agreement-detail.component.css', '../../company/company-shared.css']
})
export class AgreementDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);

  convention: ConventionStage | null = null;
  stage: any | null = null;

  chargement = true;
  signatureEnCours = false;
  messageErreur = '';
  messageSucces = '';
  pdfConventionStatus: FinalStageDocumentStatus | null = null;
  private liveSyncStageId: number | null = null;

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

  // ── Getters ───────────────────────────────────────────────────────────────

  get conventionSignee(): boolean {
    return this.convention?.statutSignatures ?? false;
  }

  canDownloadConventionPdf(): boolean {
    return canAccessStageDocumentPdf(this.pdfConventionStatus);
  }

  get conventionPdfBlockReason(): string {
    return getConventionPdfBlockReason(this.pdfConventionStatus);
  }

  get titreConvention(): string {
    if (!this.convention) return '';
    return this.convention.stageTitre || `Stage #${this.convention.stageId}`;
  }

  get nomStagiaire(): string {
    const s = this.stage?.stagiaire;
    if (!s) return 'Non renseigné';
    return `${s.prenom ?? ''} ${s.nom ?? ''}`.trim() || 'Non renseigné';
  }

  get nomEncadrantAcademique(): string {
    const e = this.stage?.encadrantAcademique;
    if (!e) return 'Non renseigné';
    return `${e.prenom ?? ''} ${e.nom ?? ''}`.trim() || 'Non renseigné';
  }

  get nomEncadrantProfessionnel(): string {
    const e = this.stage?.encadrantProfessionnel;
    if (!e) return 'Non renseigné';
    return `${e.prenom ?? ''} ${e.nom ?? ''}`.trim() || 'Non renseigné';
  }

  get nomTuteurEntreprise(): string {
    const t = this.stage?.tuteurEntreprise;
    if (!t) return this.stage?.entreprise?.nom || 'Non renseigné';
    return `${t.prenom ?? ''} ${t.nom ?? ''}`.trim() || 'Non renseigné';
  }

  get nomEntreprise(): string {
    return this.stage?.entreprise?.nom || 'Non renseignée';
  }

  get nomResponsableUniversitaire(): string {
    return this.convention?.nomResponsableUniversitaireSignataire || 'Responsable universitaire des stages';
  }

  // ── Données stagiaire enrichies ───────────────────────────────────────────

  get filiereNom(): string {
    return this.stage?.stagiaire?.filiere?.nom || '-';
  }

  get niveauStagiaire(): string {
    const n = this.stage?.stagiaire?.niveau;
    return n != null ? `${n}` : '-';
  }

  get matriculeStagiaire(): string {
    return this.stage?.stagiaire?.matricule || '-';
  }

  get emailStagiaire(): string {
    return this.stage?.stagiaire?.email || '-';
  }

  get telephoneStagiaire(): string {
    return this.stage?.stagiaire?.telephone || '-';
  }

  // ── Signatures images ────────────────────────────────────────────────────

  get urlSignatureStagiaire(): string | null {
    return this.stage?.stagiaire?.urlSignature || null;
  }

  get urlSignatureEncAca(): string | null {
    return this.stage?.encadrantAcademique?.urlSignature || null;
  }

  get urlSignatureEncPro(): string | null {
    return this.stage?.encadrantProfessionnel?.urlSignature || null;
  }

  get urlSignatureTuteurEntreprise(): string | null {
    return this.stage?.tuteurEntreprise?.urlSignature || null;
  }

  // ── Données encadrement ───────────────────────────────────────────────────

  get emailEncadrantAcademique(): string {
    return this.stage?.encadrantAcademique?.email || '-';
  }

  get emailEncadrantProfessionnel(): string {
    return this.stage?.encadrantProfessionnel?.email || '-';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  imprimer(): void {
    if (!this.convention?.stageId || !this.canDownloadConventionPdf()) {
      this.messageErreur = this.conventionPdfBlockReason || "Impossible d'imprimer cette convention.";
      return;
    }
    const printWindow = this.pdfWindowService.openPlaceholder('Convention de stage');
    if (!printWindow) {
      this.messageErreur = "La fenêtre d'impression a été bloquée par le navigateur.";
      return;
    }

    this.http
      .get(`${API_BASE_URL}/stages/${this.convention.stageId}/documents/convention/pdf`, { responseType: 'blob' })
      .subscribe({
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

    if (
      !isConventionSigningPermitted({
        stageStatut: this.stage?.statut,
        dateDebut: this.stage?.dateDebut ?? this.convention.dateDebut,
        allSignaturesComplete: this.convention.statutSignatures,
      })
    ) {
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
      case RoleUtilisateur.RESPONSABLE_STAGE:
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
      case RoleUtilisateur.RESPONSABLE_STAGE:
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
        if (this.convention.stageId) {
          this.signatureSync.notifyStageUpdated(this.convention.stageId);
        }
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
    forkJoin({
      stage: this.http.get<any>(`${API_BASE_URL}/stages/${stageId}`).pipe(catchError(() => of(null))),
      documents: this.signatureSync.fetchDocumentsOverview(stageId),
    }).subscribe(({ stage, documents }) => {
      this.stage = stage;
      this.pdfConventionStatus = documents?.convention ?? null;
      this.chargement = false;
      this.startLiveSignatureSync(stageId);
    });
  }

  /** Polling + invalidation : reflète les signatures des autres utilisateurs en quasi temps réel. */
  private startLiveSignatureSync(stageId: number): void {
    if (this.liveSyncStageId === stageId) {
      return;
    }
    this.liveSyncStageId = stageId;

    this.signatureSync
      .watchSignatureBundle(stageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bundle) => {
        if (bundle.convention) {
          this.convention = this.normalizeConvention(bundle.convention);
        }
        if (bundle.documents) {
          this.pdfConventionStatus = bundle.documents.convention ?? null;
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
