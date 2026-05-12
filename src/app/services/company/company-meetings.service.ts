import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyMeeting } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyMeetingsService {
  private readonly apiUrl = `${API_BASE_URL}/reunions`;

  constructor(private http: HttpClient) {}

  listForCurrentCompany(): Observable<CompanyMeeting[]> {
    return this.http
      .get<any>(`${this.apiUrl}/entreprise-connectee`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item))),
        map((meetings) => meetings.sort((a, b) => `${b.date} ${b.heure}`.localeCompare(`${a.date} ${a.heure}`)))
      );
  }

  getById(id: number): Observable<CompanyMeeting> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map((item) => this.normalizeMeeting(item)));
  }

  private normalizeMeeting(raw: any): CompanyMeeting {
    return {
      id: Number(raw?.id ?? 0),
      source: this.resolveMeetingSource(raw),
      numReunion: String(raw?.numReunion ?? ''),
      date: String(raw?.date ?? ''),
      heure: String(raw?.heure ?? ''),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? raw?.stage?.id ?? 0),
      stageTitre: String(raw?.stageTitre ?? raw?.stage?.titre ?? ''),
      stagiaireNom: String(raw?.stagiaireNom ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map((item: unknown) => Number(item)) : [],
      note: this.normalizeNullableNumber(raw?.note),
      urlFormEvaluation: String(raw?.urlFormEvaluation ?? ''),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? '')
    };
  }

  private resolveMeetingSource(raw: any): 'HEBDOMADAIRE' | 'FINALE' {
    const candidates = [raw?.typeReunion, raw?.reunionType, raw?.discriminator, raw?.type];
    const normalized = candidates
      .map((value) => String(value ?? '').trim().toUpperCase())
      .find((value) => value.length > 0);

    if (normalized === 'FINALE' || normalized === 'FINAL') {
      return 'FINALE';
    }

    return 'HEBDOMADAIRE';
  }

  private extractCollection(raw: any): any[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (Array.isArray(raw?.content)) {
      return raw.content;
    }
    if (Array.isArray(raw?.data)) {
      return raw.data;
    }
    if (Array.isArray(raw?.items)) {
      return raw.items;
    }
    return [];
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
}
