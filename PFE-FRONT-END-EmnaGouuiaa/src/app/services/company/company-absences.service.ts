import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyAbsence, CompanyAbsencePayload } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyAbsencesService {
  private readonly apiUrl = `${API_BASE_URL}/absences`;

  constructor(private http: HttpClient) {}

  listByStage(stageId: number): Observable<CompanyAbsence[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/stage/${stageId}`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeAbsence(item))));
  }

  create(payload: CompanyAbsencePayload): Observable<CompanyAbsence> {
    return this.http
      .post<any>(this.apiUrl, this.toPayload(payload))
      .pipe(map((item) => this.normalizeAbsence(item)));
  }

  private normalizeAbsence(raw: any): CompanyAbsence {
    return {
      id: Number(raw?.id ?? 0),
      dateAbsence: String(raw?.dateAbsence ?? ''),
      nbAbsence: Number(raw?.nbAbsence ?? 1),
      justification: String(raw?.justification ?? ''),
      commentaire: String(raw?.commentaire ?? ''),
      statut: String(raw?.statut ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? '')
    };
  }

  private toPayload(payload: CompanyAbsencePayload): CompanyAbsencePayload {
    return {
      stageId: payload.stageId,
      dateAbsence: String(payload.dateAbsence ?? ''),
      nbAbsence: payload.nbAbsence ?? 1,
      justification: String(payload.justification ?? '').trim(),
      commentaire: String(payload.commentaire ?? '').trim(),
      statut: String(payload.statut ?? '').trim()
    };
  }
}
