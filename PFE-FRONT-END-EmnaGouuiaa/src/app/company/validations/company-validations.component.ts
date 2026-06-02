import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CompanyAgreement, CompanyContext, CompanyEvaluation, CompanyInternship, CompanyValidationItem } from '../../services/company/company.models';
import { CompanyValidationsService } from '../../services/company/company-validations.service';
import { filterInternshipsForStageDocuments } from '../../shared/stage-documents/stage-documents-eligibility.util';
import {
  EVALUATION_SIGN_INCOMPLETE_MESSAGE,
  isResponsableEntreprisePartReadyForSign,
} from '../../utils/evaluation-criteria.util';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyAgreementsService } from '../../services/company/company-agreements.service';
import { CompanyEvaluationsService } from '../../services/company/company-evaluations.service';
import { PdfWindowService } from '../../services/pdf-window.service';
import { readApiErrorMessage } from '../../services/http-error.util';
import {
  isStageEndDateReached,
} from '../../shared/stage-documents/stage-document-signature-eligibility.util';
import {
  StageDocumentSignButtonContext,
  isStageDocumentSignButtonDisabled,
} from '../../shared/stage-documents/stage-document-sign-button.util';
import {
  canAccessFinalStagePdf,
  canAccessStageDocumentPdf,
  getConventionPdfBlockReason,
  getFinalPdfBlockReason,
  getLogbookPdfBlockReason,
} from '../../services/final-stage-document-access.util';
import {
  StageSignatureBundle,
  StageSignatureSyncService,
} from '../../services/stage-signature-sync.service';
import { StageDocumentSignaturesBlockComponent } from '../../shared/stage-documents/stage-document-signatures-block.component';
import { StageDocumentSignActionComponent } from '../../shared/stage-documents/stage-document-sign-action.component';
import {
  DocumentSignatoryApi,
  StageSignatureActorView,
  normalizeDocumentSignatoriesApi,
  signatoriesFromDocumentStatus,
  stageSignatureCardSummary,
} from '../../shared/stage-documents/stage-document-signatures.util';

interface SignatureChip {
  label: string;
  done: boolean;
}

interface DocumentPdfStatusView {
  disponible?: boolean;
  raisonAbsence?: string;
  documentId?: number | null;
  genere?: boolean;
  generationAutorisee?: boolean;
  signataires?: DocumentSignatoryApi[];
}

@Component({
  selector: 'app-company-validations-page',
  standalone: true,
  imports: [CommonModule, RouterModule, StageDocumentSignaturesBlockComponent, StageDocumentSignActionComponent],
  templateUrl: './company-validations.component.html',
  styleUrls: ['../company-shared.css'],
  styles: [`
    .doc-internship-group {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(16, 71, 120, 0.08);
    }
    .doc-internship-group:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .doc-internship-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .doc-student-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, #1a3a6e, #2980b9);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 900;
    }
    .doc-internship-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .doc-internship-sub {
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
    }
    /* doc-mini-card styles définis dans company-shared.css */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .detail-item {
      padding: 12px 14px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      background: rgba(248, 250, 252, 0.9);
    }
    .detail-item .label {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 4px;
    }
    .detail-item .value {
      font-weight: 700;
      color: #0f172a;
    }
    .alert-info {
      color: #0369a1;
      background: rgba(3, 105, 161, 0.08);
      border-color: rgba(3, 105, 161, 0.18);
    }
    .evaluation-nudge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn-small {
      padding: 6px 14px;
      font-size: 0.85rem;
      border-radius: 10px;
    }
    .doc-card-signatures {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 6px;
    }
    .sig-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #f8fafc;
    }
    .sig-chip--done {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .sig-chip--wait {
      color: #9a3412;
      background: #fff7ed;
      border-color: #fed7aa;
    }
    .doc-card-pdf-hint {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0 0 8px;
      line-height: 1.4;
    }
    .doc-card-pdf-hint--ok {
      color: #166534;
    }
    .doc-pdf-action-block {
      margin-top: 14px;
      padding: 12px 16px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .doc-pdf-action-block--available {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .doc-pdf-action-block__message {
      color: #9a3412;
      font-size: 0.9rem;
      flex: 1;
      min-width: 200px;
    }
    .doc-pdf-action-block--available .doc-pdf-action-block__message {
      color: #166534;
      font-weight: 600;
    }
    .doc-card-link {
      margin-left: 6px;
      font-weight: 700;
      color: #1d4ed8;
      text-decoration: none;
    }
    .doc-card-link:hover {
      text-decoration: underline;
    }
    @media (max-width: 640px) {
      .doc-cards-row { flex-direction: column; }
      .doc-mini-card { max-width: 100%; }
    }
  `]
})
export class CompanyValidationsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  agreementsByStageId = new Map<number, CompanyAgreement>();
  evaluationsByStageId = new Map<number, CompanyEvaluation>();
  /** Statuts PDF par stage (GET /stages/{id}/documents). */
  documentsByStageId = new Map<number, {
    convention?: DocumentPdfStatusView;
    ficheEvaluation?: DocumentPdfStatusView;
    cahierStage?: DocumentPdfStatusView;
  }>();

  /** Signatures cahier (API cahiers-stage), alimenté par la synchro temps réel. */
  cahiersByStageId = new Map<number, Record<string, unknown>>();

  items: CompanyValidationItem[] = [];

  isLoading = false;
  isActing = false;
  isSigning = false;
  errorMessage = '';
  successMessage = '';
  showEvaluationLink = false;
  private liveSyncStarted = false;

  // ── Modale de détails document ─────────────────────────────────────────
  showDocModal = false;
  selectedDocStageId: number | null = null;
  selectedDocType: 'convention' | 'fiche-evaluation' | 'cahier-stage' | null = null;

  constructor(
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyAgreementsService: CompanyAgreementsService,
    private companyEvaluationsService: CompanyEvaluationsService,
    private companyValidationsService: CompanyValidationsService,
    private pdfWindowService: PdfWindowService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }


  //Charge tous les stages de l'entreprise au démarrage

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showEvaluationLink = false;

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;
        const entrepriseId = context.responsable.entrepriseId;
        if (!entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachée à ce compte.";
          this.isLoading = false;
          return;
        }

        forkJoin({
          internships: this.companyInternshipsService.listByEntreprise(entrepriseId).pipe(catchError(() => of([] as CompanyInternship[]))),
          validationItems: this.companyValidationsService.list().pipe(catchError(() => of([] as CompanyValidationItem[])))
        }).pipe(timeout(15000)).subscribe({
          next: ({ internships, validationItems }) => {
            this.internships = filterInternshipsForStageDocuments(internships);
            this.items = validationItems;
            this.loadDocumentData(this.internships);
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les données.');
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger le contexte entreprise.');
        this.isLoading = false;
      }
    });
  }

  private loadDocumentData(internships: CompanyInternship[]): void {
    if (!internships.length) {
      this.isLoading = false;
      return;
    }

    forkJoin({
      agreements: forkJoin(
        internships.map((i) =>
          this.companyAgreementsService.getByStageId(i.id).pipe(catchError(() => of(null)))
        )
      ),
      evaluations: forkJoin(
        internships.map((i) =>
          this.companyEvaluationsService.getByStageId(i.id).pipe(catchError(() => of(null)))
        )
      ),
      documents: forkJoin(
        internships.map((i) =>
          this.companyAgreementsService.getStageDocuments(i.id).pipe(catchError(() => of(null)))
        )
      ),
    }).pipe(timeout(15000)).subscribe({
      next: ({ agreements, evaluations, documents }) => {
        this.agreementsByStageId = new Map(
          agreements
            .filter((a): a is CompanyAgreement => !!a && a.stageId > 0)
            .map((a) => [a.stageId, a])
        );
        this.evaluationsByStageId = new Map(
          evaluations
            .filter((e): e is CompanyEvaluation => !!e && e.stageId > 0)
            .map((e) => [e.stageId, e])
        );
        this.documentsByStageId = new Map(
          internships.map((internship, index) => {
            const overview = documents[index];
            return [
              internship.id,
              {
                convention: this.normalizeDocStatus(overview?.convention),
                ficheEvaluation: this.normalizeDocStatus(overview?.ficheEvaluation),
                cahierStage: this.normalizeDocStatus(overview?.cahierStage),
              },
            ];
          })
        );
        this.isLoading = false;
        this.primeSignatureBundles(internships);
        this.startLiveSignatureSync();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private primeSignatureBundles(internships: CompanyInternship[]): void {
    if (!internships.length) {
      return;
    }
    forkJoin(
      internships.map((internship) =>
        this.signatureSync.fetchSignatureBundle(internship.id).pipe(catchError(() => of(null)))
      )
    )
      .pipe(timeout(20000))
      .subscribe((bundles) => {
        for (const bundle of bundles) {
          if (bundle) {
            this.applySignatureBundle(bundle);
          }
        }
      });
  }

  private startLiveSignatureSync(): void {
    if (this.liveSyncStarted || !this.internships.length) {
      return;
    }
    this.liveSyncStarted = true;
    const stageIds = this.internships.map((item) => item.id);

    this.signatureSync
      .watchMultipleSignatureBundles(stageIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bundles) => {
        for (const bundle of bundles) {
          this.applySignatureBundle(bundle);
        }
      });
  }

  private applySignatureBundle(bundle: StageSignatureBundle): void {
    if (bundle.documents) {
      const existing = this.documentsByStageId.get(bundle.stageId);
      this.documentsByStageId.set(bundle.stageId, {
        convention: this.normalizeDocStatus(bundle.documents.convention, existing?.convention),
        ficheEvaluation: this.normalizeDocStatus(bundle.documents.ficheEvaluation, existing?.ficheEvaluation),
        cahierStage: this.normalizeDocStatus(bundle.documents.cahierStage, existing?.cahierStage),
      });
    }

    if (bundle.cahier) {
      this.cahiersByStageId.set(bundle.stageId, bundle.cahier);
    }

    if (bundle.convention) {
      const raw = bundle.convention;
      const existing = this.agreementsByStageId.get(bundle.stageId);
      this.agreementsByStageId.set(bundle.stageId, {
        id: Number(raw['id'] ?? existing?.id ?? 0),
        numConv: this.readNullableNumber(raw['numConv'], existing?.numConv ?? null),
        dateDebut: String(raw['dateDebut'] ?? existing?.dateDebut ?? ''),
        dateFin: String(raw['dateFin'] ?? existing?.dateFin ?? ''),
        anneeUniversitaire: existing?.anneeUniversitaire ?? '',
        signeeEncAca: Boolean(raw['signeeEncAca']),
        signeeEncPro: Boolean(raw['signeeEncPro']),
        signeeEntreprise: Boolean(raw['signeeEntreprise']),
        signeeResp: Boolean(raw['signeeResp']),
        signeeStagiaire: Boolean(raw['signeeStagiaire']),
        statutSignatures: Boolean(raw['statutSignatures']),
        stageId: bundle.stageId,
        stageTitre: String(raw['stageTitre'] ?? existing?.stageTitre ?? ''),
        demandeStageId: this.readNullableNumber(raw['demandeStageId'], existing?.demandeStageId ?? null),
      });
    }

    if (bundle.evaluation) {
      const raw = bundle.evaluation;
      const existing = this.evaluationsByStageId.get(bundle.stageId);
      this.evaluationsByStageId.set(bundle.stageId, {
        id: Number(raw['id'] ?? existing?.id ?? 0),
        stageId: bundle.stageId,
        stageTitre: String(raw['stageTitre'] ?? existing?.stageTitre ?? ''),
        reunionFinaleId: this.readNullableNumber(raw['reunionFinaleId'], existing?.reunionFinaleId ?? null),
        pointFortEncadrantPro: String(raw['pointFortEncadrantPro'] ?? existing?.pointFortEncadrantPro ?? ''),
        axeAmeliorationEncadrantPro: String(raw['axeAmeliorationEncadrantPro'] ?? existing?.axeAmeliorationEncadrantPro ?? ''),
        pointFortResponsableEntreprise: String(raw['pointFortResponsableEntreprise'] ?? existing?.pointFortResponsableEntreprise ?? ''),
        axeAmeliorationResponsableEntreprise: String(raw['axeAmeliorationResponsableEntreprise'] ?? existing?.axeAmeliorationResponsableEntreprise ?? ''),
        signatureEncadrantProfessionnel: String(raw['signatureEncadrantProfessionnel'] ?? existing?.signatureEncadrantProfessionnel ?? ''),
        signatureRepresentantEntreprise: String(raw['signatureRepresentantEntreprise'] ?? existing?.signatureRepresentantEntreprise ?? ''),
        dateSignatureEncadrantProfessionnel: String(raw['dateSignatureEncadrantProfessionnel'] ?? existing?.dateSignatureEncadrantProfessionnel ?? ''),
        dateSignatureRepresentantEntreprise: String(raw['dateSignatureRepresentantEntreprise'] ?? existing?.dateSignatureRepresentantEntreprise ?? ''),
        noteFinale: this.readNullableNumber(raw['noteFinale'], existing?.noteFinale ?? null),
        donneesCompletes: Boolean(raw['donneesCompletes'] ?? existing?.donneesCompletes),
        pretSignatureResponsableEntreprise: Boolean(
          raw['pretSignatureResponsableEntreprise'] ?? existing?.pretSignatureResponsableEntreprise
        ),
        signaturesCompletes: Boolean(raw['signaturesCompletes'] ?? existing?.signaturesCompletes),
        complete: Boolean(raw['complete'] ?? existing?.complete),
        verrouillee: Boolean(raw['verrouillee'] ?? existing?.verrouillee),
        evaluationAccessible: raw['evaluationAccessible'] !== false,
        evaluationIndisponibleMessage: String(
          raw['evaluationIndisponibleMessage'] ?? existing?.evaluationIndisponibleMessage ?? ''
        ),
        notesAttribuees: Array.isArray(raw['notesAttribuees'])
          ? (raw['notesAttribuees'] as CompanyEvaluation['notesAttribuees'])
          : (existing?.notesAttribuees ?? []),
      });
    }
  }

  getAgreement(stageId: number): CompanyAgreement | null {
    return this.agreementsByStageId.get(stageId) ?? null;
  }

  getEvaluation(stageId: number): CompanyEvaluation | null {
    return this.evaluationsByStageId.get(stageId) ?? null;
  }

  isConventionSignedByCompany(agreement: CompanyAgreement): boolean {
    return agreement.signeeEntreprise;
  }

  isEvaluationSignedByCompany(evaluation: CompanyEvaluation): boolean {
    return !!evaluation.dateSignatureRepresentantEntreprise;
  }

  signConvention(agreement: CompanyAgreement): void {
    if (agreement.signeeEntreprise) return;
    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyAgreementsService.signByEntreprise(agreement.id).pipe(timeout(15000)).subscribe({
      next: (updated) => {
        this.agreementsByStageId.set(updated.stageId, updated);
        this.signatureSync.notifyStageUpdated(updated.stageId);
        this.successMessage = 'Convention signée avec succès.';
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de signer cette convention.');
        this.isSigning = false;
      }
    });
  }

  signEvaluation(evaluation: CompanyEvaluation): void {
    if (this.isEvaluationSignedByCompany(evaluation)) return;
    if (!this.canSignEvaluation(evaluation)) {
      this.errorMessage = EVALUATION_SIGN_INCOMPLETE_MESSAGE;
      return;
    }
    const userId = this.context?.userId;
    if (!userId) {
      this.errorMessage = 'Identifiant utilisateur introuvable.';
      return;
    }
    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyEvaluationsService.sign(evaluation.id, userId).pipe(timeout(15000)).subscribe({
      next: (updated) => {
        this.evaluationsByStageId.set(updated.stageId, updated);
        this.signatureSync.notifyStageUpdated(updated.stageId);
        this.successMessage = "Fiche d'évaluation signée avec succès.";
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de signer la fiche d'évaluation.");
        this.isSigning = false;
      }
    });
  }

  getConventionStatusLabel(agreement: CompanyAgreement): string {
    if (agreement.statutSignatures) return 'Toutes signatures';
    if (agreement.signeeEntreprise) return 'Signé par vous';
    return 'En attente de votre signature';
  }

  getEvaluationStatusLabel(evaluation: CompanyEvaluation): string {
    if (evaluation.signaturesCompletes) return 'Toutes signatures';
    if (this.isEvaluationSignedByCompany(evaluation)) return 'Signé par vous';
    if (evaluation.donneesCompletes) return 'Données complètes';
    return 'En attente';
  }

  getEvaluationStatusClass(evaluation: CompanyEvaluation): string {
    if (evaluation.signaturesCompletes) return 'status-pill active';
    if (this.isEvaluationSignedByCompany(evaluation)) return 'status-pill status-info';
    if (evaluation.donneesCompletes) return 'status-pill status-warning';
    return 'status-pill status-neutral';
  }

  approveSelected(item: CompanyValidationItem): void {
    if (!item) return;
    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyValidationsService.approve(item).subscribe({
      next: (updated) => {
        this.upsertItem(updated);
        this.successMessage = `${updated.title} validé avec succès.`;
        this.showEvaluationLink = updated.type === 'CAHIER_STAGE';
        this.isActing = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de valider cet élément.');
        this.isActing = false;
      }
    });
  }

  getCahierItem(stageId: number): CompanyValidationItem | null {
    return this.items.find((item) => item.type === 'CAHIER_STAGE' && item.stageId === stageId) ?? null;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'VALIDEE': return 'Validé';
      case 'REFUSEE': return 'Refusé';
      default: return 'En attente';
    }
  }

  isStageEnded(internship: CompanyInternship): boolean {
    if (internship.statut === 'TERMINE') return true;
    if (!internship.dateFin) return false;
    return new Date(internship.dateFin) <= new Date();
  }
//Vérifie si le bouton PDF doit être actif ou grisé
  canAccessPdf(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): boolean {
    const status = this.getDocumentPdfStatus(stageId, type);
    if (type === 'convention') {
      return canAccessStageDocumentPdf(status);
    }
    return canAccessFinalStagePdf(status);
  }

  /**
   * true → bouton PDF actif ; false → bouton visible mais désactivé.
   * Nécessite l'autorisation backend et toutes les signatures obligatoires.
   */
  isPdfAvailable(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement?: CompanyAgreement | null,
    evaluation?: CompanyEvaluation | null
  ): boolean {
    if (!this.canAccessPdf(stageId, type)) {
      return false;
    }
    if (type === 'convention') {
      return agreement ? this.isConventionSignaturesComplete(agreement) : false;
    }
    if (type === 'fiche-evaluation') {
      return evaluation ? Boolean(evaluation.signaturesCompletes) : false;
    }
    return this.isCahierSignaturesComplete(stageId);
  }

  /** @deprecated Préférer {@link isPdfAvailable} */
  canShowPdf(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement?: CompanyAgreement | null,
    evaluation?: CompanyEvaluation | null
  ): boolean {
    return this.isPdfAvailable(stageId, type, agreement, evaluation);
  }

  getPdfButtonTitle(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement?: CompanyAgreement | null,
    evaluation?: CompanyEvaluation | null
  ): string {
    if (this.isPdfAvailable(stageId, type, agreement, evaluation)) {
      if (type === 'convention') {
        return 'Télécharger la convention en PDF';
      }
      if (type === 'fiche-evaluation') {
        return "Télécharger la fiche d'évaluation en PDF";
      }
      return 'Télécharger le cahier de stage en PDF';
    }
    return this.getPdfHint(stageId, type, agreement, evaluation);
  }

  canShowDetail(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): boolean {
    return this.hasDocument(stageId, type);
  }

  getSignatureActorsForDoc(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): StageSignatureActorView[] {
    return signatoriesFromDocumentStatus(this.getDocumentPdfStatus(stageId, type));
  }

  isConventionSignaturesComplete(agreement: CompanyAgreement): boolean {
    return (
      Boolean(agreement.statutSignatures) ||
      (agreement.signeeStagiaire &&
        agreement.signeeEncAca &&
        agreement.signeeEncPro &&
        agreement.signeeEntreprise &&
        agreement.signeeResp)
    );
  }

  isCahierSignaturesComplete(stageId: number): boolean {
    const cahier = this.cahiersByStageId.get(stageId);
    if (cahier?.['statutSignatures'] === true) {
      return true;
    }
    const actors = signatoriesFromDocumentStatus(this.getDocumentPdfStatus(stageId, 'cahier-stage'));
    return actors.length > 0 && actors.every((actor) => actor.signed);
  }

  getPdfBlockReason(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): string {
    const status = this.getDocumentPdfStatus(stageId, type);
    if (type === 'convention') {
      return getConventionPdfBlockReason(status);
    }
    if (type === 'fiche-evaluation') {
      return getFinalPdfBlockReason(status);
    }
    return getLogbookPdfBlockReason(status);
  }

  hasDocument(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): boolean {
    if (type === 'convention') {
      const agreement = this.getAgreement(stageId);
      return !!agreement?.id;
    }
    if (type === 'fiche-evaluation') {
      const evaluation = this.getEvaluation(stageId);
      return !!evaluation?.id;
    }
    if (this.getCahierItem(stageId)) {
      return true;
    }
    const status = this.getDocumentPdfStatus(stageId, 'cahier-stage');
    return !!(status?.documentId && status.documentId > 0) || Boolean(status?.genere);
  }

  /** Signataire entreprise : convention — document existant, règles métier convention, pas encore signé. */
  canSignConvention(
    agreement: CompanyAgreement | null | undefined,
    internship?: CompanyInternship | null
  ): boolean {
    if (!agreement?.id || this.isConventionSignedByCompany(agreement) || !internship) {
      return false;
    }
    return !isStageDocumentSignButtonDisabled(
      this.buildConventionSignContext(internship, agreement)
    );
  }

  /** Signataire entreprise : fiche complète et pas encore signée. */
  canSignEvaluation(evaluation: CompanyEvaluation | null | undefined): boolean {
    if (!evaluation?.id || this.isEvaluationSignedByCompany(evaluation)) {
      return false;
    }
    return isResponsableEntreprisePartReadyForSign(evaluation);
  }

  private buildConventionSignContext(
    internship: CompanyInternship,
    agreement: CompanyAgreement | null | undefined
  ): StageDocumentSignButtonContext {
    const status = this.getDocumentPdfStatus(internship.id, 'convention');
    const conventionId = agreement?.id ?? status?.documentId ?? null;
    return {
      documentType: 'convention',
      userRole: 'RESPONSABLE_ENTREPRISE',
      status,
      documentId: conventionId,
      conventionId,
      alreadySignedByMe: agreement ? this.isConventionSignedByCompany(agreement) : false,
      dateFin: internship.dateFin,
      dateDebut: internship.dateDebut,
      dureeMonths: internship.duree ?? null,
      stageStatut: internship.statut ?? null,
      generationAutorisee: status?.generationAutorisee,
      isActing: this.isSigning,
    };
  }

  initializeConvention(internship: CompanyInternship): void {
    this.isSigning = true;
    this.errorMessage = '';
    this.companyAgreementsService.generateConvention(internship.id).subscribe({
      next: () => {
        forkJoin({
          agreement: this.companyAgreementsService.getByStageId(internship.id).pipe(catchError(() => of(null))),
          documents: this.companyAgreementsService.getStageDocuments(internship.id).pipe(catchError(() => of(null))),
        }).subscribe(({ agreement, documents }) => {
          if (agreement) {
            this.agreementsByStageId.set(internship.id, agreement);
          }
          if (documents) {
            const existing = this.documentsByStageId.get(internship.id);
            this.documentsByStageId.set(internship.id, {
              convention: this.normalizeDocStatus(documents?.convention, existing?.convention),
              ficheEvaluation: this.normalizeDocStatus(
                documents?.ficheEvaluation,
                existing?.ficheEvaluation
              ),
              cahierStage: this.normalizeDocStatus(documents?.cahierStage, existing?.cahierStage),
            });
          }
          this.isSigning = false;
          this.successMessage = 'Convention initialisee.';
        });
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible d initialiser la convention.');
        this.isSigning = false;
      },
    });
  }

  private buildEvaluationSignContext(
    internship: CompanyInternship,
    evaluation: CompanyEvaluation | null | undefined
  ): StageDocumentSignButtonContext {
    const status = this.getDocumentPdfStatus(internship.id, 'fiche-evaluation');
    return {
      documentType: 'fiche-evaluation',
      userRole: 'RESPONSABLE_ENTREPRISE',
      status,
      documentId: evaluation?.id ?? status?.documentId ?? null,
      alreadySignedByMe: evaluation ? this.isEvaluationSignedByCompany(evaluation) : false,
      dateFin: internship.dateFin,
      dateDebut: internship.dateDebut,
      dureeMonths: internship.duree ?? null,
      evaluationReadyForSign: evaluation
        ? isResponsableEntreprisePartReadyForSign(evaluation)
        : false,
      isActing: this.isSigning,
    };
  }

  private buildCahierSignContext(internship: CompanyInternship): StageDocumentSignButtonContext {
    const status = this.getDocumentPdfStatus(internship.id, 'cahier-stage');
    const cahier = this.cahiersByStageId.get(internship.id);
    const alreadySigned = Boolean(cahier?.['signeeEntreprise'] ?? cahier?.['signeeResp']);
    const canShow = this.canShowCahierSignButton(internship.id) || alreadySigned;
    return {
      documentType: 'cahier-stage',
      userRole: 'RESPONSABLE_ENTREPRISE',
      status,
      documentId: status?.documentId ?? null,
      alreadySignedByMe: alreadySigned,
      dateFin: internship.dateFin,
      dateDebut: internship.dateDebut,
      dureeMonths: internship.duree ?? null,
      signActionVisible: canShow,
      isActing: this.isActing,
    };
  }

  buildConventionSignContextPublic(
    internship: CompanyInternship,
    agreement: CompanyAgreement | null | undefined
  ): StageDocumentSignButtonContext {
    return this.buildConventionSignContext(internship, agreement);
  }

  buildEvaluationSignContextPublic(
    internship: CompanyInternship,
    evaluation: CompanyEvaluation | null | undefined
  ): StageDocumentSignButtonContext {
    return this.buildEvaluationSignContext(internship, evaluation);
  }

  buildCahierSignContextPublic(internship: CompanyInternship): StageDocumentSignButtonContext {
    return this.buildCahierSignContext(internship);
  }

  isConventionSignDisabled(internship: CompanyInternship, agreement: CompanyAgreement | null | undefined): boolean {
    return isStageDocumentSignButtonDisabled(this.buildConventionSignContext(internship, agreement));
  }

  isEvaluationSignDisabled(internship: CompanyInternship, evaluation: CompanyEvaluation | null | undefined): boolean {
    return isStageDocumentSignButtonDisabled(this.buildEvaluationSignContext(internship, evaluation));
  }

  isCahierSignDisabled(internship: CompanyInternship): boolean {
    const ctx = this.buildCahierSignContext(internship);
    if (isStageDocumentSignButtonDisabled(ctx)) {
      return true;
    }
    return !this.canSignCahier(internship.id);
  }

  canShowEvaluationSignButton(evaluation: CompanyEvaluation | null | undefined): boolean {
    return !!evaluation?.id;
  }

  /** Bouton cahier : document présent et validation entreprise en attente. */
  canShowCahierSignButton(stageId: number): boolean {
    const item = this.getCahierItem(stageId);
    return !!item?.pending && this.hasDocument(stageId, 'cahier-stage');
  }

  /** Signataire entreprise : cahier — après la date de fin et en attente de validation. */
  canSignCahier(stageId: number): boolean {
    if (!this.canShowCahierSignButton(stageId)) {
      return false;
    }
    const internship = this.internships.find((item) => item.id === stageId);
    if (!internship) {
      return false;
    }
    return isStageEndDateReached(internship.dateFin, internship.dateDebut, internship.duree);
  }

  needsEvaluationInputBeforeSign(evaluation: CompanyEvaluation | null | undefined): boolean {
    return this.canShowEvaluationSignButton(evaluation) && !this.canSignEvaluation(evaluation);
  }

  readonly evaluationSignIncompleteMessage = EVALUATION_SIGN_INCOMPLETE_MESSAGE;

  getConventionSignatureChips(agreement: CompanyAgreement): SignatureChip[] {
    return [
      { label: 'Stagiaire', done: agreement.signeeStagiaire },
      { label: 'Enc. académique', done: agreement.signeeEncAca },
      { label: 'Enc. professionnel', done: agreement.signeeEncPro },
      { label: 'Resp. entreprise', done: agreement.signeeEntreprise },
      { label: 'Resp. universitaire', done: agreement.signeeResp },
    ];
  }

  getEvaluationSignatureChips(evaluation: CompanyEvaluation): SignatureChip[] {
    return [
      { label: 'Enc. professionnel', done: !!evaluation.dateSignatureEncadrantProfessionnel },
      { label: 'Resp. entreprise', done: !!evaluation.dateSignatureRepresentantEntreprise },
    ];
  }

  getCahierSignatureChips(stageId: number): SignatureChip[] {
    const cahier = this.cahiersByStageId.get(stageId);
    if (!cahier) {
      return [];
    }
    return [
      { label: 'Stagiaire', done: Boolean(cahier['signeeStagiaire']) },
      { label: 'Enc. académique', done: Boolean(cahier['signeeEncAca']) },
      { label: 'Enc. professionnel', done: Boolean(cahier['signeeEncPro']) },
      {
        label: 'Resp. entreprise',
        done: Boolean(cahier['signeeEntreprise'] ?? cahier['signeeResp']),
      },
    ];
  }

  getSignatureSummary(chips: SignatureChip[]): string {
    if (!chips.length) {
      return 'État des signatures en cours de chargement…';
    }
    const signed = chips.filter((chip) => chip.done).length;
    const total = chips.length;
    if (signed === total) {
      return `${signed}/${total} signatures complètes`;
    }
    const remaining = total - signed;
    return `${signed}/${total} signé(s) — ${remaining} signature(s) en attente`;
  }

  getPdfHint(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement?: CompanyAgreement | null,
    evaluation?: CompanyEvaluation | null
  ): string {
    if (this.isPdfAvailable(stageId, type, agreement, evaluation)) {
      return 'PDF disponible : toutes les signatures sont complètes.';
    }
    if (!this.areDocumentSignaturesComplete(type, agreement, stageId, evaluation)) {
      return 'PDF indisponible : toutes les signatures obligatoires ne sont pas encore complètes.';
    }
    return this.getPdfBlockReason(stageId, type);
  }

  private areDocumentSignaturesComplete(
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement: CompanyAgreement | null | undefined,
    stageId: number,
    evaluation: CompanyEvaluation | null | undefined
  ): boolean {
    const actors = signatoriesFromDocumentStatus(this.getDocumentPdfStatus(stageId, type));
    if (actors.length > 0) {
      return actors.every((actor) => actor.signed);
    }
    if (type === 'convention') {
      return agreement ? this.isConventionSignaturesComplete(agreement) : false;
    }
    if (type === 'fiche-evaluation') {
      return evaluation ? Boolean(evaluation.signaturesCompletes) : false;
    }
    return this.isCahierSignaturesComplete(stageId);
  }

  private getDocumentPdfStatus(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): DocumentPdfStatusView | undefined {
    const docs = this.documentsByStageId.get(stageId);
    if (!docs) {
      return undefined;
    }
    if (type === 'convention') {
      return docs.convention;
    }
    if (type === 'fiche-evaluation') {
      return docs.ficheEvaluation;
    }
    return docs.cahierStage;
  }

  /** Mappe la réponse API (objet brut ou déjà normalisé) vers le format attendu par l'UI. */
  private normalizeDocStatus(
    raw: Record<string, unknown> | DocumentPdfStatusView | null | undefined,
    fallback?: DocumentPdfStatusView
  ): DocumentPdfStatusView | undefined {
    if (!raw) {
      return fallback;
    }
    if (typeof raw === 'object' && 'disponible' in raw && typeof raw.disponible === 'boolean') {
      const view = raw as DocumentPdfStatusView;
      return this.mergeDocStatusView(view, fallback);
    }
    const disponible = raw['disponible'];
    const documentId = raw['documentId'];
    return this.mergeDocStatusView(
      {
        disponible: disponible === true || disponible === 'true',
        raisonAbsence: String(raw['raisonAbsence'] ?? ''),
        documentId:
          documentId != null && documentId !== '' && Number.isFinite(Number(documentId))
            ? Number(documentId)
            : fallback?.documentId ?? null,
        genere: raw['genere'] === true || raw['genere'] === 'true' || fallback?.genere,
        generationAutorisee:
          raw['generationAutorisee'] === true ||
          raw['generationAutorisee'] === 'true' ||
          fallback?.generationAutorisee,
        signataires: normalizeDocumentSignatoriesApi(raw['signataires'] ?? fallback?.signataires),
      },
      fallback
    );
  }

  private mergeDocStatusView(
    view: DocumentPdfStatusView,
    fallback?: DocumentPdfStatusView
  ): DocumentPdfStatusView {
    return {
      disponible: view.disponible,
      raisonAbsence: view.raisonAbsence ?? '',
      documentId: view.documentId ?? fallback?.documentId ?? null,
      genere: view.genere ?? fallback?.genere,
      generationAutorisee: view.generationAutorisee ?? fallback?.generationAutorisee,
      signataires: view.signataires?.length
        ? view.signataires
        : fallback?.signataires ?? [],
    };
  }

  getPdfAvailableMessage(type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): string {
    if (type === 'convention') {
      return 'Toutes les signatures sont complètes. Ce document est disponible en PDF.';
    }
    if (type === 'fiche-evaluation') {
      return 'Toutes les signatures sont complètes et la date de fin du stage est atteinte. Ce document est disponible en PDF.';
    }
    return 'Toutes les signatures sont complètes et la date de fin du stage est atteinte. Ce document est disponible en PDF.';
  }

  downloadPdf(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage',
    agreement?: CompanyAgreement | null,
    evaluation?: CompanyEvaluation | null
  ): void {
    const resolvedAgreement = agreement ?? this.getAgreement(stageId);
    const resolvedEvaluation = evaluation ?? this.getEvaluation(stageId);
    if (!this.isPdfAvailable(stageId, type, resolvedAgreement, resolvedEvaluation)) {
      this.errorMessage = this.getPdfHint(stageId, type, resolvedAgreement, resolvedEvaluation);
      return;
    }
    this.openDocumentPdf(stageId, type);
  }
//Ouvre l'onglet + appelle l'API + affiche le PDF
  private openDocumentPdf(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): void {
    const title =
      type === 'convention'
        ? 'Convention de stage'
        : type === 'fiche-evaluation'
          ? "Fiche d'évaluation"
          : 'Cahier de stage';
    const pdfWindow = this.pdfWindowService.openPlaceholder(title);
    if (!pdfWindow) {
      this.errorMessage = "Impossible d'ouvrir une nouvelle fenêtre. Vérifiez les paramètres de votre navigateur.";
      return;
    }
    this.isActing = true;
    this.errorMessage = '';
    this.companyAgreementsService.downloadDocument(stageId, type).pipe(timeout(15000)).subscribe({
      next: (blob) => {
        this.isActing = false;
        this.pdfWindowService.showPdf(pdfWindow, blob, { title, autoPrint: true });
      },
      error: async (error) => {
        this.isActing = false;
        pdfWindow.close();
        this.errorMessage = await readApiErrorMessage(error, `Impossible d'ouvrir le PDF (${title}).`);
      }
    });
  }

  /** Modale : statut détaillé des signatures et conditions PDF. */
  openConventionDetails(stageId: number): void {
    if (!this.getAgreement(stageId) && !this.getDocumentPdfStatus(stageId, 'convention')) {
      this.errorMessage = 'Convention introuvable pour ce stage.';
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'convention';
    this.showDocModal = true;
  }

  getDocumentShortStatus(
    stageId: number,
    type: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): string {
    return stageSignatureCardSummary(this.getSignatureActorsForDoc(stageId, type));
  }

  hasDocStatusEntry(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): boolean {
    return !!this.getDocumentPdfStatus(stageId, type);
  }

  /** Ouvre la modale de détails pour la fiche d'évaluation. */
  openEvaluationDetails(stageId: number): void {
    if (!this.getEvaluation(stageId)) {
      this.errorMessage = "Fiche d'évaluation introuvable pour ce stage.";
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'fiche-evaluation';
    this.showDocModal = true;
  }

  /** Ouvre la modale de détails pour le cahier de stage. */
  openCahierDetails(stageId: number): void {
    if (!this.hasDocument(stageId, 'cahier-stage')) {
      this.errorMessage = 'Données du cahier de stage introuvables.';
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'cahier-stage';
    this.showDocModal = true;
  }

  closeDocDetails(): void {
    this.showDocModal = false;
    this.selectedDocStageId = null;
    this.selectedDocType = null;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDocModal) this.closeDocDetails();
  }

  getSelectedInternship(): CompanyInternship | null {
    if (!this.selectedDocStageId) return null;
    return this.internships.find((i) => i.id === this.selectedDocStageId) ?? null;
  }

  isSelectedStageEnded(): boolean {
    const internship = this.getSelectedInternship();
    return internship ? this.isStageEnded(internship) : false;
  }

  private upsertItem(updated: CompanyValidationItem): void {
    const index = this.items.findIndex((item) => item.key === updated.key);
    if (index >= 0) {
      const nextItems = [...this.items];
      nextItems[index] = updated;
      this.items = nextItems;
    } else {
      this.items = [updated, ...this.items];
    }
  }

  private readNullableNumber(value: unknown, fallback: number | null): number | null {
    if (value === null || value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}
