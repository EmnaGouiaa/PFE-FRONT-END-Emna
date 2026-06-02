import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';
import {
  canAccessFinalStagePdf,
  FinalStageDocumentStatus,
  getFinalPdfBlockReason,
} from '../../services/final-stage-document-access.util';
import { StageSignatureSyncService } from '../../services/stage-signature-sync.service';
import {
  EVALUATION_UNAVAILABLE_MESSAGE,
  isEvaluationAccessible,
} from '../../services/stage-period.utils';

@Component({
  selector: 'app-evaluation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './evaluation.html',
  styleUrls: ['./evaluation.css', '../../company/company-shared.css'],
})
export class Evaluation implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);
  private liveSyncStageId: number | null = null;

  stageId: number | null = null;
  stageStatut = '';
  evaluation: any | null = null;
  evaluationAccessible = false;
  chargement = true;
  messageErreur = '';
  readonly evaluationUnavailableMessage = EVALUATION_UNAVAILABLE_MESSAGE;
  telechargementEnCours = false;
  pdfEvaluationStatus: FinalStageDocumentStatus | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.stageId = Number.isFinite(id) && id > 0 ? id : null;

    if (!this.stageId) {
      this.messageErreur = 'Identifiant de stage invalide.';
      this.chargement = false;
      return;
    }

    this.chargerEvaluation();
  }

  recharger(): void {
    this.chargerEvaluation();
  }

  canDownloadEvaluationPdf(): boolean {
    return canAccessFinalStagePdf(this.pdfEvaluationStatus);
  }

  get evaluationPdfBlockReason(): string {
    return getFinalPdfBlockReason(this.pdfEvaluationStatus);
  }

  telechargerPdf(): void {
    if (!this.stageId || this.telechargementEnCours || !this.canDownloadEvaluationPdf()) {
      return;
    }

    this.telechargementEnCours = true;

    this.http
      .get(`${API_BASE_URL}/stages/${this.stageId}/documents/fiche-evaluation/pdf`, {
        responseType: 'blob',
      })
      .pipe(
        catchError(() => {
          this.telechargementEnCours = false;
          return of(null);
        })
      )
      .subscribe((blob) => {
        this.telechargementEnCours = false;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fiche-evaluation-stage-${this.stageId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  private chargerEvaluation(): void {
    if (!this.stageId) return;

    this.chargement = true;
    this.messageErreur = '';
    this.evaluation = null;
    this.pdfEvaluationStatus = null;

    forkJoin({
      stage: this.http.get<any>(`${API_BASE_URL}/stages/${this.stageId}`).pipe(catchError(() => of(null))),
      evaluation: this.http.get<any>(`${API_BASE_URL}/fiches-evaluation/stage/${this.stageId}`).pipe(
        catchError((error) => {
          if (error?.status === 400 || error?.status === 204 || error?.status === 404) {
            return of(null);
          }
          this.messageErreur = error?.error?.message ?? "Impossible de charger la fiche d'évaluation.";
          return of(null);
        })
      ),
      documents: this.http.get<any>(`${API_BASE_URL}/stages/${this.stageId}/documents`).pipe(
        catchError(() => of(null))
      ),
    }).subscribe(({ stage, evaluation, documents }) => {
      this.stageStatut = String(stage?.statut ?? '');
      const dateFin = stage?.dateFin ?? evaluation?.stageDateFin;
      this.evaluationAccessible = isEvaluationAccessible(stage?.statut, dateFin);
      this.evaluation =
        this.evaluationAccessible && evaluation?.evaluationAccessible !== false ? evaluation : null;
      this.pdfEvaluationStatus = documents?.ficheEvaluation ?? null;
      this.chargement = false;
      if (this.stageId) {
        this.startLiveSignatureSync(this.stageId);
      }
    });
  }

  private startLiveSignatureSync(stageId: number): void {
    if (this.liveSyncStageId === stageId) {
      return;
    }
    this.liveSyncStageId = stageId;

    this.signatureSync
      .watchSignatureBundle(stageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bundle) => {
        if (bundle.documents?.ficheEvaluation) {
          this.pdfEvaluationStatus = bundle.documents.ficheEvaluation;
        }
        if (bundle.evaluation) {
          this.evaluation = bundle.evaluation;
        }
      });
  }

  formatDateTime(value: any): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('fr-FR');
  }

  formatDate(value: any): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('fr-FR');
  }
}
