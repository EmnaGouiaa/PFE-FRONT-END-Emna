import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  filter,
  forkJoin,
  interval,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Aperçu documents stage (GET /api/stages/{id}/documents). */
export interface StageDocumentsOverviewRaw {
  stageId?: number;
  convention?: Record<string, unknown> | null;
  ficheEvaluation?: Record<string, unknown> | null;
  cahierStage?: Record<string, unknown> | null;
}

/** Lot de données signatures pour un stage (documents + entités liées). */
export interface StageSignatureBundle {
  stageId: number;
  documents: StageDocumentsOverviewRaw | null;
  convention: Record<string, unknown> | null;
  evaluation: Record<string, unknown> | null;
  cahier: Record<string, unknown> | null;
}

/**
 * Synchronisation des signatures et statuts documents entre utilisateurs.
 * Polling léger lorsque l'onglet est visible + invalidation immédiate après signature locale.
 */
@Injectable({ providedIn: 'root' })
export class StageSignatureSyncService {
  private readonly stagesUrl = `${API_BASE_URL}/stages`;
  private readonly conventionsUrl = `${API_BASE_URL}/conventions-stage`;
  private readonly evaluationsUrl = `${API_BASE_URL}/fiches-evaluation`;
  private readonly cahiersUrl = `${API_BASE_URL}/cahiers-stage`;

  /** Intervalle par défaut entre deux synchronisations automatiques (ms). */
  readonly defaultPollIntervalMs = 6000;

  private readonly refreshRequest$ = new Subject<number>();

  constructor(private http: HttpClient) {}

  /** À appeler après chaque signature réussie pour forcer un rafraîchissement immédiat. */
  notifyStageUpdated(stageId: number): void {
    if (stageId > 0) {
      this.refreshRequest$.next(stageId);
    }
  }

  fetchDocumentsOverview(stageId: number): Observable<StageDocumentsOverviewRaw | null> {
    return this.http
      .get<StageDocumentsOverviewRaw>(`${this.stagesUrl}/${stageId}/documents`)
      .pipe(catchError(() => of(null)));
  }

  fetchSignatureBundle(stageId: number): Observable<StageSignatureBundle> {
    return forkJoin({
      documents: this.fetchDocumentsOverview(stageId),
      convention: this.http
        .get<Record<string, unknown>>(`${this.conventionsUrl}/stage/${stageId}`)
        .pipe(catchError(() => of(null))),
      evaluation: this.http
        .get<Record<string, unknown>>(`${this.evaluationsUrl}/stage/${stageId}`)
        .pipe(catchError(() => of(null))),
      cahier: this.http
        .get<Record<string, unknown>>(`${this.cahiersUrl}/stage/${stageId}`)
        .pipe(catchError(() => of(null))),
    }).pipe(map((payload) => ({ stageId, ...payload })));
  }

  /**
   * Flux continu : rafraîchit les statuts documents d'un stage (polling + événements manuels).
   * N'émet que lorsque le contenu change (évite les re-rendus inutiles).
   */
  watchDocumentsOverview(
    stageId: number,
    pollIntervalMs = this.defaultPollIntervalMs
  ): Observable<StageDocumentsOverviewRaw> {
    return this.createWatchTicker(stageId, pollIntervalMs).pipe(
      switchMap(() => this.fetchDocumentsOverview(stageId)),
      filter((doc): doc is StageDocumentsOverviewRaw => doc != null),
      distinctUntilChanged((prev, next) => fingerprintDocuments(prev) === fingerprintDocuments(next))
    );
  }

  /**
   * Flux continu incluant convention, fiche, cahier et statuts PDF.
   */
  watchSignatureBundle(
    stageId: number,
    pollIntervalMs = this.defaultPollIntervalMs
  ): Observable<StageSignatureBundle> {
    return this.createWatchTicker(stageId, pollIntervalMs).pipe(
      switchMap(() => this.fetchSignatureBundle(stageId)),
      distinctUntilChanged((prev, next) => fingerprintBundle(prev) === fingerprintBundle(next))
    );
  }

  /**
   * Polling multi-stages (validations entreprise, liste faculté, espace encadrant).
   */
  watchMultipleDocuments(
    stageIds: number[],
    pollIntervalMs = 8000
  ): Observable<Map<number, StageDocumentsOverviewRaw>> {
    const ids = [...new Set(stageIds.filter((id) => id > 0))];
    if (!ids.length) {
      return of(new Map());
    }

    const tick$ = merge(
      interval(pollIntervalMs).pipe(startWith(0)),
      this.refreshRequest$.pipe(filter((id) => ids.includes(id)))
    ).pipe(
      filter(() => isBrowserTabVisible()),
      switchMap(() =>
        forkJoin(
          ids.map((id) =>
            this.fetchDocumentsOverview(id).pipe(map((documents) => ({ id, documents })))
          )
        )
      ),
      map((rows) => {
        const mapResult = new Map<number, StageDocumentsOverviewRaw>();
        for (const row of rows) {
          if (row.documents) {
            mapResult.set(row.id, row.documents);
          }
        }
        return mapResult;
      }),
      distinctUntilChanged((prev, next) => fingerprintDocumentsMap(prev) === fingerprintDocumentsMap(next))
    );

    return tick$;
  }

  /** Polling multi-stages avec convention, fiche, cahier et statuts PDF. */
  watchMultipleSignatureBundles(
    stageIds: number[],
    pollIntervalMs = 8000
  ): Observable<StageSignatureBundle[]> {
    const ids = [...new Set(stageIds.filter((id) => id > 0))];
    if (!ids.length) {
      return of([]);
    }

    return merge(
      interval(pollIntervalMs).pipe(startWith(0)),
      this.refreshRequest$.pipe(filter((id) => ids.includes(id)))
    ).pipe(
      filter(() => isBrowserTabVisible()),
      switchMap(() => forkJoin(ids.map((id) => this.fetchSignatureBundle(id)))),
      distinctUntilChanged((prev, next) => fingerprintBundleList(prev) === fingerprintBundleList(next))
    );
  }

  private createWatchTicker(stageId: number, pollIntervalMs: number): Observable<void> {
    return merge(
      interval(pollIntervalMs).pipe(startWith(0)),
      this.refreshRequest$.pipe(filter((id) => id === stageId))
    ).pipe(
      filter(() => isBrowserTabVisible()),
      map(() => void 0)
    );
  }
}

function isBrowserTabVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function fingerprintDocuments(doc: StageDocumentsOverviewRaw): string {
  return JSON.stringify({
    convention: pickDoc(doc.convention),
    fiche: pickDoc(doc.ficheEvaluation),
    cahier: pickDoc(doc.cahierStage),
  });
}

function fingerprintDocumentsMap(map: Map<number, StageDocumentsOverviewRaw>): string {
  const entries = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, doc]) => [id, fingerprintDocuments(doc)]);
  return JSON.stringify(entries);
}

function pickDoc(raw: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  return {
    disponible: raw['disponible'],
    genere: raw['genere'],
    statut: raw['statut'],
    raisonAbsence: raw['raisonAbsence'],
    statutDocument: raw['statutDocument'],
    signeeParResponsableUniversitaire: raw['signeeParResponsableUniversitaire'],
    dateSignatureResponsableUniversitaire: raw['dateSignatureResponsableUniversitaire'],
    signataires: raw['signataires'],
  };
}

function fingerprintBundleList(bundles: StageSignatureBundle[]): string {
  return JSON.stringify(
    bundles
      .map((b) => [b.stageId, fingerprintBundle(b)])
      .sort(([a], [b]) => (a as number) - (b as number))
  );
}

function fingerprintBundle(bundle: StageSignatureBundle): string {
  return JSON.stringify({
    documents: bundle.documents ? fingerprintDocuments(bundle.documents) : null,
    convention: pickConvention(bundle.convention),
    evaluation: pickEvaluation(bundle.evaluation),
    cahier: pickCahier(bundle.cahier),
  });
}

function pickConvention(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  return {
    signeeEncAca: raw['signeeEncAca'],
    signeeEncPro: raw['signeeEncPro'],
    signeeEntreprise: raw['signeeEntreprise'],
    signeeResp: raw['signeeResp'],
    signeeStagiaire: raw['signeeStagiaire'],
    statutSignatures: raw['statutSignatures'],
  };
}

function pickEvaluation(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  return {
    signaturesCompletes: raw['signaturesCompletes'],
    verrouillee: raw['verrouillee'],
    dateSignatureEncadrantProfessionnel: raw['dateSignatureEncadrantProfessionnel'],
    dateSignatureRepresentantEntreprise: raw['dateSignatureRepresentantEntreprise'],
  };
}

function pickCahier(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  return {
    signeeEncAca: raw['signeeEncAca'],
    signeeEncPro: raw['signeeEncPro'],
    signeeStagiaire: raw['signeeStagiaire'],
    signeeResp: raw['signeeResp'],
    signeeEntreprise: raw['signeeEntreprise'],
    statutSignatures: raw['statutSignatures'],
  };
}
