import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyValidationItem } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyValidationsService {
  private readonly apiUrl = `${API_BASE_URL}/entreprise-validations`;

  constructor(private http: HttpClient) {}

  list(): Observable<CompanyValidationItem[]> {
    return this.http
      .get<any[]>(this.apiUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeItem(item))));
  }

  approve(item: CompanyValidationItem): Observable<CompanyValidationItem> {
    return this.http
      .patch<any>(`${this.apiUrl}/${item.type}/${item.itemId}/valider`, {})
      .pipe(map((response) => this.normalizeItem(response)));
  }

  reject(item: CompanyValidationItem, commentaire: string): Observable<CompanyValidationItem> {
    return this.http
      .patch<any>(`${this.apiUrl}/${item.type}/${item.itemId}/refuser`, {
        commentaire: commentaire.trim()
      })
      .pipe(map((response) => this.normalizeItem(response)));
  }

  private normalizeItem(raw: any): CompanyValidationItem {
    return {
      key: String(raw?.key ?? ''),
      type: String(raw?.type ?? ''),
      title: String(raw?.title ?? ''),
      description: String(raw?.description ?? ''),
      status: String(raw?.status ?? 'EN_ATTENTE'),
      pending: Boolean(raw?.pending),
      itemId: Number(raw?.itemId ?? 0),
      stageId: Number(raw?.stageId ?? 0),
      relatedEntityId: raw?.relatedEntityId != null ? Number(raw.relatedEntityId) : null,
      stageTitle: String(raw?.stageTitle ?? ''),
      studentName: String(raw?.studentName ?? ''),
      companyName: String(raw?.companyName ?? ''),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? '')
    };
  }
}
