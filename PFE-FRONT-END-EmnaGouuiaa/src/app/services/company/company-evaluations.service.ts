import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyEvaluation, CompanyEvaluationPayload, EvaluationNoteDto } from './company.models';
import { getJsonOptional$ } from '../http-optional-body';

@Injectable({ providedIn: 'root' })
export class CompanyEvaluationsService {
  private readonly apiUrl = `${API_BASE_URL}/fiches-evaluation`;

  constructor(private http: HttpClient) {}

  getByStageId(stageId: number): Observable<CompanyEvaluation | null> {
    return getJsonOptional$<any>(this.http, `${this.apiUrl}/stage/${stageId}`).pipe(
      map((item) => (item ? this.normalizeEvaluation(item) : null))
    );
  }

  create(payload: CompanyEvaluationPayload): Observable<CompanyEvaluation> {
    return this.http
      .post<any>(this.apiUrl, this.toPayload(payload))
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  update(id: number, payload: CompanyEvaluationPayload): Observable<CompanyEvaluation> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, this.toPayload(payload))
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  fillResponsableSection(
    id: number,
    userId: number,
    payload: CompanyEvaluationPayload
  ): Observable<CompanyEvaluation> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/responsable-entreprise/${userId}`, this.toPayload(payload))
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  sign(id: number, userId: number): Observable<CompanyEvaluation> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/signer/${userId}`, {})
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  enregistrerNotePonctualite(id: number, userId: number, notes: EvaluationNoteDto[]): Observable<CompanyEvaluation> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}/notes-re/${userId}`, notes)
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  private normalizeEvaluation(raw: any): CompanyEvaluation {
    return {
      id: Number(raw?.id ?? 0),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      reunionFinaleId: raw?.reunionFinaleId ?? null,
      pointFortEncadrantPro: String(raw?.pointFortEncadrantPro ?? ''),
      axeAmeliorationEncadrantPro: String(raw?.axeAmeliorationEncadrantPro ?? ''),
      pointFortResponsableEntreprise: String(raw?.pointFortResponsableEntreprise ?? ''),
      axeAmeliorationResponsableEntreprise: String(raw?.axeAmeliorationResponsableEntreprise ?? ''),
      signatureEncadrantProfessionnel: String(raw?.signatureEncadrantProfessionnel ?? ''),
      signatureRepresentantEntreprise: String(raw?.signatureRepresentantEntreprise ?? ''),
      dateSignatureEncadrantProfessionnel: String(raw?.dateSignatureEncadrantProfessionnel ?? ''),
      dateSignatureRepresentantEntreprise: String(raw?.dateSignatureRepresentantEntreprise ?? ''),
      noteFinale: raw?.noteFinale ?? null,
      donneesCompletes: Boolean(raw?.donneesCompletes),
      signaturesCompletes: Boolean(raw?.signaturesCompletes),
      complete: Boolean(raw?.complete),
      verrouillee: Boolean(raw?.verrouillee),
      notesAttribuees: Array.isArray(raw?.notesAttribuees)
        ? raw.notesAttribuees.map((n: any) => ({
            ficheEvaluationId: n?.ficheEvaluationId ?? null,
            critereEvaluationId: n?.critereEvaluationId ?? null,
            poids: Number(n?.poids ?? 0),
            bareme: Number(n?.bareme ?? 5),
            note: Number(n?.note ?? 0),
            commentaire: String(n?.commentaire ?? ''),
            critereLibelle: String(n?.critereLibelle ?? ''),
            scorePondere: n?.scorePondere != null ? Number(n.scorePondere) : null,
            evaluee: Boolean(n?.evaluee)
          }))
        : []
    };
  }

  private toPayload(payload: CompanyEvaluationPayload): CompanyEvaluationPayload {
    return {
      ...payload,
      pointFortEncadrantPro: payload.pointFortEncadrantPro?.trim() || '',
      axeAmeliorationEncadrantPro: payload.axeAmeliorationEncadrantPro?.trim() || '',
      pointFortResponsableEntreprise: payload.pointFortResponsableEntreprise?.trim() || '',
      axeAmeliorationResponsableEntreprise: payload.axeAmeliorationResponsableEntreprise?.trim() || ''
    };
  }
}
