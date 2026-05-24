import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface EncadrantProfessionnel {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste?: string;
  service?: string;
  entrepriseId?: number;
  entrepriseNom?: string;
  actif?: boolean;
}

export interface CreateEncadrantRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste?: string;
  service?: string;
}

export interface UpdateEncadrantRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste?: string;
  service?: string;
}

@Injectable({ providedIn: 'root' })
export class EncadrantsProfessionnelsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/company-accounts`;

  constructor(private http: HttpClient) {}

  listByEntreprise(entrepriseId: number): Observable<EncadrantProfessionnel[]> {
    if (!entrepriseId || entrepriseId <= 0) {
      console.error('[EncadrantsService] listByEntreprise: entrepriseId invalide', entrepriseId);
      return throwError(() => new Error('entrepriseId invalide ou manquant.'));
    }
    const url = `${this.baseUrl}/${entrepriseId}/encadrants`;
    return this.http.get<any[]>(url).pipe(
      map((items) => (items ?? []).map((item) => this.normalize(item))),
      catchError((err: HttpErrorResponse) => {
        console.error(
          `[EncadrantsService] GET ${url} → HTTP ${err.status} ${err.statusText}`,
          err.error ?? err.message
        );
        return throwError(() => err);
      })
    );
  }

  createForEntreprise(
    entrepriseId: number,
    dto: CreateEncadrantRequest
  ): Observable<EncadrantProfessionnel> {
    const url = `${this.baseUrl}/${entrepriseId}/encadrants`;
    return this.http.post<any>(url, this.toPayload(dto)).pipe(
      map((item) => this.normalize(item)),
      catchError((err: HttpErrorResponse) => {
        console.error(
          `[EncadrantsService] POST ${url} → HTTP ${err.status} ${err.statusText}`,
          err.error ?? err.message
        );
        return throwError(() => err);
      })
    );
  }

  updateForEntreprise(
    entrepriseId: number,
    encadrantId: number,
    dto: UpdateEncadrantRequest
  ): Observable<EncadrantProfessionnel> {
    const url = `${this.baseUrl}/${entrepriseId}/encadrants/${encadrantId}`;
    return this.http.put<any>(url, this.toPayload(dto)).pipe(
      map((item) => this.normalize(item)),
      catchError((err: HttpErrorResponse) => {
        console.error(
          `[EncadrantsService] PUT ${url} → HTTP ${err.status} ${err.statusText}`,
          err.error ?? err.message
        );
        return throwError(() => err);
      })
    );
  }

  private toPayload(dto: CreateEncadrantRequest | UpdateEncadrantRequest): any {
    return {
      nom: dto.nom?.trim(),
      prenom: dto.prenom?.trim(),
      email: dto.email?.trim(),
      telephone: dto.telephone?.trim(),
      poste: dto.poste?.trim() || '',
      service: dto.service?.trim() || ''
    };
  }

  private normalize(raw: any): EncadrantProfessionnel {
    const actifBrut = raw?.actif ?? raw?.active ?? raw?.enabled;
    return {
      id: Number(raw?.id ?? 0),
      nom: String(raw?.nom ?? ''),
      prenom: String(raw?.prenom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      poste: raw?.poste ?? '',
      service: raw?.service ?? '',
      entrepriseId: raw?.entrepriseId != null ? Number(raw.entrepriseId) : undefined,
      entrepriseNom: raw?.entrepriseNom ?? '',
      actif: typeof actifBrut === 'boolean' ? actifBrut : true
    };
  }
}
