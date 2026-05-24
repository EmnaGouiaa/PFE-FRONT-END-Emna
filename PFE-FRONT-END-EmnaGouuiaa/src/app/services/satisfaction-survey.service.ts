import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface SatisfactionSurvey {
  titre: string;
  description: string;
  urlFormulaire: string;
  statut: string;
}

@Injectable({ providedIn: 'root' })
export class SatisfactionSurveyService {
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

  private normalizeSurvey(raw: any): SatisfactionSurvey {
    return {
      titre: String(raw?.titre ?? 'Enquête de satisfaction'),
      description: String(raw?.description ?? ''),
      urlFormulaire: String(raw?.urlFormulaire ?? ''),
      statut: String(raw?.statut ?? 'Non configurée')
    };
  }
}
