import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface AdminCompanyAccount {
  entrepriseId: number;
  nomEntreprise: string;
  emailEntreprise: string;
  telephoneEntreprise: string;
  adresse: string;
  secteurActivite: string;
  representantId: number | null;
  nomResponsable: string;
  prenomResponsable: string;
  emailResponsable: string;
  telephoneResponsable: string;
  emailSent?: boolean | null;
  message?: string;
}

export interface AdminCompanyAccountRequest {
  representantId?: number | null;
  nomEntreprise: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  adresse?: string;
  secteurActivite?: string;
  nomResponsable: string;
  prenomResponsable: string;
  emailResponsable: string;
  telephoneResponsable?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCompanyAccountsService {
  private readonly apiUrl = `${API_BASE_URL}/admin/company-accounts`;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminCompanyAccount[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((items) => (items ?? []).map((item) => this.normalize(item)))
    );
  }

  create(payload: AdminCompanyAccountRequest): Observable<AdminCompanyAccount> {
    return this.http.post<any>(this.apiUrl, this.toApiPayload(payload)).pipe(
      map((item) => this.normalize(item))
    );
  }

  update(entrepriseId: number, payload: AdminCompanyAccountRequest): Observable<AdminCompanyAccount> {
    return this.http.put<any>(`${this.apiUrl}/${entrepriseId}`, this.toApiPayload(payload)).pipe(
      map((item) => this.normalize(item))
    );
  }

  private toApiPayload(payload: AdminCompanyAccountRequest): AdminCompanyAccountRequest {
    return {
      representantId: payload.representantId ?? null,
      nomEntreprise: payload.nomEntreprise.trim(),
      emailEntreprise: payload.emailEntreprise?.trim() || '',
      telephoneEntreprise: payload.telephoneEntreprise?.trim() || '',
      adresse: payload.adresse?.trim() || '',
      secteurActivite: payload.secteurActivite?.trim() || '',
      nomResponsable: payload.nomResponsable.trim(),
      prenomResponsable: payload.prenomResponsable.trim(),
      emailResponsable: payload.emailResponsable.trim(),
      telephoneResponsable: payload.telephoneResponsable?.trim() || ''
    };
  }

  private normalize(raw: any): AdminCompanyAccount {
    return {
      entrepriseId: Number(raw?.entrepriseId ?? 0),
      nomEntreprise: String(raw?.nomEntreprise ?? ''),
      emailEntreprise: String(raw?.emailEntreprise ?? ''),
      telephoneEntreprise: String(raw?.telephoneEntreprise ?? ''),
      adresse: String(raw?.adresse ?? ''),
      secteurActivite: String(raw?.secteurActivite ?? ''),
      representantId: raw?.representantId == null ? null : Number(raw.representantId),
      nomResponsable: String(raw?.nomResponsable ?? ''),
      prenomResponsable: String(raw?.prenomResponsable ?? ''),
      emailResponsable: String(raw?.emailResponsable ?? ''),
      telephoneResponsable: String(raw?.telephoneResponsable ?? ''),
      emailSent: typeof raw?.emailSent === 'boolean' ? raw.emailSent : null,
      message: typeof raw?.message === 'string' ? raw.message : ''
    };
  }
}
