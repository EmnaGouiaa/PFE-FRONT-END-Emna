import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export type SatisfactionSurveyStatus = 'Disponible' | 'Non disponible';

export interface SatisfactionSurvey {
  reunionFinaleId: number;
  enqueteId: number | null;
  stageId: number | null;
  stageTitre: string;
  titre: string;
  description: string;
  urlFormulaire: string;
  statut: SatisfactionSurveyStatus | string;
  disponible: boolean;
  dateAtteinte: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SatisfactionSurveyService {
  private readonly finalMeetingsUrl = `${API_BASE_URL}/reunions-finales`;
  private readonly surveysUrl = `${API_BASE_URL}/enquetes-satisfaction`;

  constructor(private http: HttpClient) {}

  getConfiguration(): Observable<SatisfactionSurvey> {
    return this.http
      .get<any>(`${this.surveysUrl}/configuration`)
      .pipe(map((item) => this.normalizeSurvey(item)));
  }

  saveConfiguration(payload: { titre: string; description: string; urlFormulaire: string }): Observable<SatisfactionSurvey> {
    return this.http
      .put<any>(`${this.surveysUrl}/configuration`, payload)
      .pipe(map((item) => this.normalizeSurvey(item)));
  }

  getAvailableForCurrentUser(): Observable<SatisfactionSurvey> {
    return this.http
      .get<any>(`${this.surveysUrl}/disponible`)
      .pipe(map((item) => this.normalizeSurvey(item)));
  }

  getForFinalMeeting(reunionFinaleId: number): Observable<SatisfactionSurvey> {
    return this.http
      .get<any>(`${this.finalMeetingsUrl}/${reunionFinaleId}/enquete-satisfaction`)
      .pipe(map((item) => this.normalizeSurvey(item)));
  }

  private normalizeSurvey(raw: any): SatisfactionSurvey {
    return {
      reunionFinaleId: Number(raw?.reunionFinaleId ?? 0),
      enqueteId: this.normalizeNullableNumber(raw?.enqueteId),
      stageId: this.normalizeNullableNumber(raw?.stageId),
      stageTitre: String(raw?.stageTitre ?? ''),
      titre: String(raw?.titre ?? 'Enquête de satisfaction'),
      description: String(raw?.description ?? ''),
      urlFormulaire: String(raw?.urlFormulaire ?? ''),
      statut: String(raw?.statut ?? 'Non disponible'),
      disponible: Boolean(raw?.disponible),
      dateAtteinte: Boolean(raw?.dateAtteinte),
      message: String(raw?.message ?? '')
    };
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
