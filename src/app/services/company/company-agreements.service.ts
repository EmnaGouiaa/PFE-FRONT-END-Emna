import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyAgreement } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyAgreementsService {
  private readonly apiUrl = `${API_BASE_URL}/conventions-stage`;

  constructor(private http: HttpClient) {}

  getByStageId(stageId: number): Observable<CompanyAgreement> {
    return this.http
      .get<any>(`${this.apiUrl}/stage/${stageId}`)
      .pipe(map((item) => this.normalizeAgreement(item)));
  }

  signByEntreprise(id: number): Observable<CompanyAgreement> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}/signer-entreprise`, {})
      .pipe(map((item) => this.normalizeAgreement(item)));
  }

  private normalizeAgreement(raw: any): CompanyAgreement {
    return {
      id: Number(raw?.id ?? 0),
      numConv: raw?.numConv ?? null,
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      signeeEncAca: Boolean(raw?.signeeEncAca),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeEntreprise: Boolean(raw?.signeeEntreprise),
      signeeResp: Boolean(raw?.signeeResp),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      statutSignatures: Boolean(raw?.statutSignatures),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      demandeStageId: raw?.demandeStageId ?? null
    };
  }
}
