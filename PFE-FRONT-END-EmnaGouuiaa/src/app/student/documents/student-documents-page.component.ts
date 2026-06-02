import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';
import {
  StudentAgreement,
  StudentEvaluation,
  StudentInternship,
  StudentMeeting,
  StudentReport,
  StudentStageDocumentStatus,
  StudentStageDocumentsOverview,
  StudentTrelloSummary
} from '../../services/student/student.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { readApiErrorMessage } from '../../services/http-error.util';
import { StudentPortalService } from '../../services/student/student-portal.service';
import { StageSignatureSyncService } from '../../services/stage-signature-sync.service';
import { StageDocumentSignaturesBlockComponent } from '../../shared/stage-documents/stage-document-signatures-block.component';
import { StageDocumentSignActionComponent } from '../../shared/stage-documents/stage-document-sign-action.component';
import { filterInternshipsForStageDocuments } from '../../shared/stage-documents/stage-documents-eligibility.util';
import {
  StageDocumentSignButtonContext,
  isStageDocumentSignButtonDisabled,
  resolveConventionDocumentId,
} from '../../shared/stage-documents/stage-document-sign-button.util';
import {
  StageSignatureActorView,
  signatoriesFromDocumentStatus,
  stageSignatureCardSummary,
} from '../../shared/stage-documents/stage-document-signatures.util';

type StudentDocumentType = 'convention' | 'fiche-evaluation' | 'cahier-stage';
type DocEntry = { type: StudentDocumentType; status: StudentStageDocumentStatus };

@Component({
  selector: 'app-student-documents-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StageDocumentSignaturesBlockComponent, StageDocumentSignActionComponent],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Documents de stage</h1>
          <p>Retrouvez les documents du stage, leur statut actuel et les actions autorisees pour votre profil.</p>
        </div>
        <button type="button" class="btn btn-secondary" (click)="reload()" [disabled]="isLoading || isActing">
          Actualiser
        </button>
      </section>

      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>

      <section class="panel" *ngIf="!isLoadingInternships && internships.length">
        <div class="panel-header">
          <div>
            <h2>Stage</h2>
            <p class="panel-subtitle">Les documents affiches refletent l'etat reel de votre convention, de la fiche d'evaluation et du cahier.</p>
          </div>
        </div>

        <!-- Le sélecteur n'apparaît que si le stagiaire a plusieurs stages affectés. -->
        <select
          *ngIf="internships.length > 1"
          class="select stage-selector"
          [ngModel]="selectedStageId"
          (ngModelChange)="onStageChange($event)"
        >
          <option *ngFor="let internship of internships" [ngValue]="internship.id">
            {{ internship.titre || internship.sujet || ('Stage #' + internship.id) }}
          </option>
        </select>
      </section>

      <div class="empty-card" *ngIf="isLoadingInternships || isLoading">Chargement des documents...</div>
      <div class="empty-card" *ngIf="!isLoadingInternships && !internships.length">Aucun stage ne vous a encore ete affecte.</div>
      <div class="empty-card" *ngIf="!isLoading && selectedDocuments && documentEntries.length === 0">
        Aucun document de stage n'est disponible pour votre role.
      </div>

      <div class="doc-cards-row student-docs-row" *ngIf="!isLoading && documentEntries.length">
        <article class="doc-mini-card" *ngFor="let doc of documentEntries">

          <div class="doc-card-eyebrow">{{ getDocumentTypeLabel(doc.type) }}</div>

          <div class="doc-card-top">
            <div class="doc-card-title">{{ doc.status.libelle }}</div>
            <span class="status-pill" [ngClass]="getStatusBadgeClass(doc.status)">
              {{ getStatusLabel(doc.status) }}
            </span>
          </div>

          <div class="doc-card-short-status">{{ getDocumentShortStatus(doc.type, doc.status) }}</div>

          <div class="doc-card-meta">
            <div class="doc-card-meta-item">
              <span class="label">Statut</span>
              <strong>{{ getStatusLabel(doc.status) }}</strong>
            </div>
            <div class="doc-card-meta-item" *ngIf="doc.type === 'convention'">
              <span class="label">Année univ.</span>
              <strong>{{ conventionAnneeUniversitaire || '—' }}</strong>
            </div>
            <div class="doc-card-meta-item">
              <span class="label">Accès PDF</span>
              <strong>{{ canAccessPdf(doc.type, doc.status) ? 'Autorisé' : 'Indisponible' }}</strong>
            </div>
          </div>

          <div class="doc-card-actions doc-card-actions--standard">
            <button type="button" class="btn btn-secondary btn-sm" (click)="openDocDetails(doc)">
              Détail
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              (click)="openPdf(doc.type, doc.status.libelle)"
              [disabled]="isActing || !canAccessPdf(doc.type, doc.status)"
              [title]="!canAccessPdf(doc.type, doc.status) ? getPdfBlockedTooltip(doc.type, doc.status) : 'Télécharger le PDF'"
            >
              PDF
            </button>
            <app-stage-document-sign-action
              [context]="buildSignContext(doc)"
              (sign)="onSignDocument(doc)"
              (initialize)="initializeConvention()"
            />
          </div>

        </article>
      </div>

      <!-- Detail modal -->
      <div class="modal-overlay" *ngIf="showDocModal && selectedDoc" (click)="closeDocDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div style="min-width:0">
              <h2 style="margin:0;font-size:1.15rem">{{ getDocumentTypeLabel(selectedDoc.type) }}</h2>
              <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.92rem">{{ selectedDoc.status.libelle }}</p>
            </div>
            <button type="button" class="btn-close" (click)="closeDocDetails()">x</button>
          </div>

          <div class="form">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">
                  <span class="status-pill" [ngClass]="getStatusBadgeClass(selectedDoc.status)">{{ getStatusLabel(selectedDoc.status) }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Acces PDF</span>
                <span class="value">{{ selectedDoc.status.disponible ? 'Consultation autorisee' : 'Non disponible' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Document genere</span>
                <span class="value">{{ selectedDoc.status.genere ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Generation autorisee</span>
                <span class="value">{{ selectedDoc.status.generationAutorisee ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedDoc.status.raisonAbsence">
                <span class="label">Raison de l'indisponibilite</span>
                <span class="value" style="white-space:pre-wrap;line-height:1.6;color:#92400e">{{ selectedDoc.status.raisonAbsence }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="!canAccessPdf(selectedDoc.type, selectedDoc.status)">
                <span class="label">Conditions d'acces</span>
                <span class="value">{{ getDocumentDescription(selectedDoc.type, selectedDoc.status) }}</span>
              </div>
            </div>

            <app-stage-document-signatures-block
              [actors]="getSignatureActors(selectedDoc.status)"
            />

            <div class="inline-actions doc-card-actions--standard">
              <button type="button" class="btn btn-secondary" (click)="closeDocDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="openPdf(selectedDoc.type, selectedDoc.status.libelle)"
                [disabled]="isActing || !canAccessPdf(selectedDoc.type, selectedDoc.status)"
                [title]="!canAccessPdf(selectedDoc.type, selectedDoc.status) ? getPdfBlockedTooltip(selectedDoc.type, selectedDoc.status) : 'Télécharger le PDF'"
              >
                PDF
              </button>
              <app-stage-document-sign-action
                buttonClass="btn btn-primary"
                [context]="buildSignContext(selectedDoc)"
                (sign)="onSignDocument(selectedDoc); closeDocDetails()"
                (initialize)="initializeConvention(); closeDocDetails()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .student-docs-row {
      /* Cartes légèrement plus larges pour la vue mono-stage du stagiaire */
      --doc-card-max: 380px;
    }
    .student-docs-row .doc-mini-card {
      max-width: var(--doc-card-max, 340px);
    }
  `],
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentDocumentsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);
  private documentsLiveSyncSub: Subscription | null = null;
  internships: StudentInternship[] = [];
  selectedStageId: number | null = null;
  selectedDocuments: StudentStageDocumentsOverview | null = null;
  selectedDoc: DocEntry | null = null;
  showDocModal = false;
  isLoadingInternships = true;
  isLoading = false;
  isActing = false;
  errorMessage = '';
  successMessage = '';
  private evaluationsByStageId = new Map<number, StudentEvaluation>();
  private reportsByStageId = new Map<number, StudentReport>();

  /** Vrai si le stagiaire connecté a déjà signé la convention / le cahier de stage. */
  conventionSigneeParStagiaire = false;
  cahierSigneeParStagiaire = false;
  private currentAgreement: StudentAgreement | null = null;
  /** Année universitaire de la convention courante (ex : 2024/2025). */
  conventionAnneeUniversitaire = '';

  constructor(
    private studentPortalService: StudentPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  get documentEntries(): DocEntry[] {
    if (!this.selectedDocuments) return [];
    return [
      { type: 'convention', status: this.selectedDocuments.convention },
      { type: 'fiche-evaluation', status: this.selectedDocuments.ficheEvaluation },
      { type: 'cahier-stage', status: this.selectedDocuments.cahierStage }
    ].filter((entry): entry is DocEntry => entry.status !== null);
  }

  get currentInternship(): StudentInternship | null {
    return this.internships.find((i) => i.id === this.selectedStageId) ?? null;
  }

  private canAccessDocument(status: StudentStageDocumentStatus): boolean {
    return Boolean(status?.disponible);
  }

  canAccessPdf(type: StudentDocumentType, status: StudentStageDocumentStatus): boolean {
    return this.canAccessDocument(status);
  }

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = filterInternshipsForStageDocuments(internships);
        // Sélection automatique et partagée entre les pages (stage persisté / courant / unique).
        const selected = this.studentPortalService.resolveSelectedInternship(this.internships);
        this.selectedStageId = selected?.id ?? null;
        this.isLoadingInternships = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    // Mémorise le choix pour que les autres pages chargent le même stage.
    this.studentPortalService.setSelectedStageId(this.selectedStageId);
    this.reload();
  }

  reload(): void {
    if (this.selectedStageId && !this.internships.some((i) => i.id === this.selectedStageId)) {
      this.selectedStageId = this.studentPortalService.resolveSelectedInternship(this.internships)?.id ?? null;
      this.studentPortalService.setSelectedStageId(this.selectedStageId);
    }
    if (!this.selectedStageId) {
      this.selectedDocuments = null;
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const stageId = this.selectedStageId;

    // On charge l'aperçu des documents + l'état de signature de la convention et du
    // cahier. La convention/le cahier peuvent ne pas encore exister (404) — dans ce
    // cas on retombe sur null et les drapeaux restent à false.
    forkJoin({
      documents: this.studentPortalService.getStageDocuments(stageId),
      agreement: this.studentPortalService.getAgreementByStage(stageId).pipe(catchError(() => of(null))),
      report: this.studentPortalService.getReportByStage(stageId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ documents, agreement, report }) => {
        this.selectedDocuments = documents;
        this.currentAgreement = agreement;
        this.conventionSigneeParStagiaire = Boolean(agreement?.signeeStagiaire);
        this.conventionAnneeUniversitaire = agreement?.anneeUniversitaire ?? '';
        this.cahierSigneeParStagiaire = Boolean(report?.signeeStagiaire);
        if (report) this.reportsByStageId.set(stageId, report);
        // Refresh modal reference after reload so it shows updated data
        if (this.selectedDoc) {
          const refreshed = this.documentEntries.find((e) => e.type === this.selectedDoc!.type);
          if (refreshed) this.selectedDoc = refreshed;
        }
        this.isLoading = false;
        this.bindLiveDocumentsSync(stageId);
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les documents.');
        this.isLoading = false;
      }
    });
  }

  private bindLiveDocumentsSync(stageId: number): void {
    this.documentsLiveSyncSub?.unsubscribe();
    this.documentsLiveSyncSub = this.signatureSync
      .watchDocumentsOverview(stageId)
      .pipe(
        switchMap(() =>
          forkJoin({
            documents: this.studentPortalService.getStageDocuments(stageId),
            agreement: this.studentPortalService.getAgreementByStage(stageId).pipe(catchError(() => of(null))),
            report: this.studentPortalService.getReportByStage(stageId).pipe(catchError(() => of(null))),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ documents, agreement, report }) => {
          this.selectedDocuments = documents;
          this.currentAgreement = agreement;
          this.conventionSigneeParStagiaire = Boolean(agreement?.signeeStagiaire);
          this.cahierSigneeParStagiaire = Boolean(report?.signeeStagiaire);
          if (report) {
            this.reportsByStageId.set(stageId, report);
          }
          if (this.selectedDoc) {
            const refreshed = this.documentEntries.find((entry) => entry.type === this.selectedDoc!.type);
            if (refreshed) {
              this.selectedDoc = refreshed;
            }
          }
        },
      });
  }

  openDocDetails(doc: DocEntry): void {
    this.selectedDoc = doc;
    this.showDocModal = true;
  }

  closeDocDetails(): void {
    this.showDocModal = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDocModal) this.closeDocDetails();
  }

  openPdf(type: StudentDocumentType, label: string): void {
    if (!this.selectedStageId) return;
    const entry = this.documentEntries.find((doc) => doc.type === type);
    if (!entry || !this.canAccessPdf(type, entry.status)) {
      this.errorMessage =
        entry?.status.raisonAbsence?.trim() ||
        this.getPdfBlockedTooltip(type, entry?.status ?? ({} as StudentStageDocumentStatus)) ||
        'Ce document PDF n\'est pas encore accessible.';
      return;
    }
    this.isActing = true;
    this.errorMessage = '';
    const pdfWindow = this.pdfWindowService.openPlaceholder(label);

    this.studentPortalService.downloadStageDocumentPdf(this.selectedStageId, type).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: label });
        this.isActing = false;
      },
      error: async (error) => {
        pdfWindow?.close();
        this.errorMessage = await readApiErrorMessage(error, `Impossible d'ouvrir ${label}.`);
        this.isActing = false;
      }
    });
  }

  buildSignContext(doc: DocEntry): StageDocumentSignButtonContext {
    const internship = this.currentInternship;
    const conventionId =
      doc.type === 'convention'
        ? this.currentAgreement?.id ?? doc.status.documentId
        : null;
    return {
      documentType: doc.type,
      userRole: 'STAGIAIRE',
      status: doc.status,
      documentId: doc.type === 'convention' ? conventionId : doc.status.documentId,
      conventionId,
      alreadySignedByMe:
        doc.type === 'convention'
          ? this.conventionSigneeParStagiaire
          : doc.type === 'cahier-stage'
            ? this.cahierSigneeParStagiaire
            : false,
      dateFin: internship?.dateFin,
      dateDebut: internship?.dateDebut,
      dureeMonths: internship?.duree ?? null,
      stageStatut: internship?.statut ?? this.selectedDocuments?.stageStatut ?? null,
      generationAutorisee: doc.status.generationAutorisee,
      evaluationReadyForSign: false,
      isActing: this.isActing,
    };
  }

  initializeConvention(): void {
    if (!this.selectedStageId) {
      return;
    }
    this.isActing = true;
    this.errorMessage = '';
    this.studentPortalService.generateStageDocument(this.selectedStageId, 'convention').subscribe({
      next: (overview) => {
        this.selectedDocuments = overview;
        this.isActing = false;
        this.successMessage = 'Convention initialisee. Vous pouvez maintenant la signer.';
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(
          error,
          'Impossible d initialiser la convention.'
        );
        this.isActing = false;
      },
    });
  }

  onSignDocument(doc: DocEntry): void {
    if (isStageDocumentSignButtonDisabled(this.buildSignContext(doc))) {
      return;
    }
    if (doc.type === 'convention') {
      this.signConvention(doc.status);
    } else if (doc.type === 'cahier-stage') {
      this.signLogbook(doc.status);
    }
  }

  signConvention(status: StudentStageDocumentStatus): void {
    const conventionId = resolveConventionDocumentId(
      this.buildSignContext({ type: 'convention', status })
    );
    if (!conventionId || this.conventionSigneeParStagiaire) return;
    if (!window.confirm('Confirmer la signature de la convention ?')) return;
    this.isActing = true;
    this.studentPortalService.signAgreementAsStudent(conventionId).subscribe({
      next: () => {
        if (this.selectedStageId) {
          this.signatureSync.notifyStageUpdated(this.selectedStageId);
        }
        this.successMessage = 'Convention signee.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer la convention.');
        this.isActing = false;
      }
    });
  }

  signLogbook(status: StudentStageDocumentStatus): void {
    if (!status.documentId || this.cahierSigneeParStagiaire) return;
    if (!window.confirm('Confirmer la signature du cahier ?')) return;
    this.isActing = true;
    this.studentPortalService.signReportAsStudent(status.documentId).subscribe({
      next: () => {
        if (this.selectedStageId) {
          this.signatureSync.notifyStageUpdated(this.selectedStageId);
        }
        this.successMessage = 'Cahier de stage signe.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer le cahier.');
        this.isActing = false;
      }
    });
  }

  getSignatureActors(status: StudentStageDocumentStatus): StageSignatureActorView[] {
    return signatoriesFromDocumentStatus(status);
  }

  getDocumentTypeLabel(type: StudentDocumentType): string {
    if (type === 'convention') return 'Convention';
    if (type === 'fiche-evaluation') return "Fiche d'evaluation";
    return 'Cahier de stage';
  }

  getStatusLabel(status: StudentStageDocumentStatus): string {
    const apiStatut = String(status.statut ?? '').trim();
    if (apiStatut === 'En préparation' || apiStatut === 'En preparation') return 'En preparation';
    if (status.disponible && status.genere) return 'Genere';
    if (status.disponible) return 'Signe';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'A remplir';
  }

  getStatusBadgeClass(status: StudentStageDocumentStatus): string {
    const label = this.getStatusLabel(status);
    if (label === 'Signe' || label === 'Genere') return 'status-positive';
    if (label === 'En preparation') return 'status-neutral';
    if (label === 'A remplir') return 'status-neutral';
    return 'status-warning';
  }

  private isSignaturesComplete(status: StudentStageDocumentStatus): boolean {
    return status.disponible
      || status.statutDocument === 'SIGNATURES_COMPLETES'
      || status.statutDocument === 'DISPONIBLE_IMPRESSION';
  }

  /** Résumé signatures sur la carte (détail complet dans la modale Détail). */
  getDocumentShortStatus(_type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    const actors = signatoriesFromDocumentStatus(status);
    if (actors.length) {
      return stageSignatureCardSummary(actors);
    }
    if (!status.genere) {
      return 'Document non encore généré';
    }
    return 'Signatures — chargement…';
  }

  /** Full description shown only inside the detail modal. */
  getDocumentDescription(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    if (this.canAccessPdf(type, status)) {
      return 'Le document final est disponible a la consultation et au telechargement.';
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    if (type === 'fiche-evaluation') {
      return "La fiche d'evaluation sera consultable apres sa signature complete et la fin du stage.";
    }
    if (type === 'cahier-stage') {
      return "Le cahier de stage sera consultable apres sa signature complete et la fin du stage.";
    }
    return 'Le document est encore en cours de preparation.';
  }

  getPdfBlockedTooltip(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    return 'Toutes les signatures obligatoires ne sont pas encore complètes.';
  }
}
