import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyAgreement } from './company.models';
import { getJsonOptional$ } from '../http-optional-body';

@Injectable({ providedIn: 'root' })
export class CompanyAgreementsService {
  private readonly apiUrl = `${API_BASE_URL}/conventions-stage`;
  private readonly stagesUrl = `${API_BASE_URL}/stages`;

  constructor(private http: HttpClient) {}

  getByStageId(stageId: number): Observable<CompanyAgreement | null> {
    return getJsonOptional$<any>(this.http, `${this.apiUrl}/stage/${stageId}`).pipe(
      map((item) => (item ? this.normalizeAgreement(item) : null))
    );
  }

  downloadDocument(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<Blob> {
    return this.http.get(`${this.stagesUrl}/${stageId}/documents/${type}/pdf`, { responseType: 'blob' });
  }

  signByEntreprise(id: number): Observable<CompanyAgreement> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}/signer-entreprise`, {})
      .pipe(map((item) => this.normalizeAgreement(item)));
  }

  private normalizeAgreement(raw: any): CompanyAgreement {
    const dateDebut = String(raw?.dateDebut ?? '');
    return {
      id: Number(raw?.id ?? 0),
      numConv: raw?.numConv ?? null,
      dateDebut,
      dateFin: String(raw?.dateFin ?? ''),
      anneeUniversitaire: this.computeAnneeUniversitaire(dateDebut),
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

  private computeAnneeUniversitaire(dateDebut: string): string {
    if (!dateDebut) return '';
    const d = new Date(dateDebut);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }
}
