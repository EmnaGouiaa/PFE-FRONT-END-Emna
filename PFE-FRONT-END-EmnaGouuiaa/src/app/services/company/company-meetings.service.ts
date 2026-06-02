import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyMeeting } from './company.models';
import {
  normalizeMeetingDate,
  normalizeMeetingHeure,
  resolveMeetingSourceFromApi
} from '../../utils/meeting-schedule.util';
import {
  normalizeParticipantNames,
  pickMeetingCompanySupervisorName,
  pickMeetingCreatorFields
} from '../../utils/meeting-display.util';

@Injectable({ providedIn: 'root' })
export class CompanyMeetingsService {
  private readonly apiUrl = `${API_BASE_URL}/reunions`;
  private readonly weeklyUrl = `${API_BASE_URL}/reunions-hebdomadaires`;
  private readonly finalUrl = `${API_BASE_URL}/reunions-finales`;

  constructor(private http: HttpClient) {}

  /** Fetches all meetings (weekly + final) for a specific stage, sorted by date. */
  listForStage(stageId: number): Observable<CompanyMeeting[]> {
    return forkJoin([
      this.http.get<any>(`${this.weeklyUrl}/stage/${stageId}`).pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item))),
        catchError(() => of([] as CompanyMeeting[]))
      ),
      this.http.get<any>(`${this.finalUrl}/stage/${stageId}`).pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item))),
        catchError(() => of([] as CompanyMeeting[]))
      )
    ]).pipe(
      map(([weekly, finale]) => [...weekly, ...finale].sort((a, b) => a.date.localeCompare(b.date)))
    );
  }

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
      source: resolveMeetingSourceFromApi(raw, 'HEBDOMADAIRE'),
      numReunion: String(raw?.numReunion ?? ''),
      date: normalizeMeetingDate(raw?.date),
      heure: normalizeMeetingHeure(raw?.heure),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? raw?.stage?.id ?? 0),
      stageTitre: String(raw?.stageTitre ?? raw?.stage?.titre ?? ''),
      stagiaireNom: String(raw?.stagiaireNom ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      ...pickMeetingCreatorFields(raw),
      companySupervisorName: pickMeetingCompanySupervisorName(raw),
      participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map((item: unknown) => Number(item)) : [],
      participantNames: normalizeParticipantNames(raw?.participantNoms ?? raw?.participantNames),
      note: this.normalizeNullableNumber(raw?.note),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? '')
    };
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
