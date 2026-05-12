import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { ProfessionalSupervisor, ProfessionalSupervisorPayload } from './company.models';

@Injectable({ providedIn: 'root' })
export class ProfessionalSupervisorsService {
  private readonly apiUrl = `${API_BASE_URL}/encadrants-professionnels`;

  constructor(private http: HttpClient) {}

  private unwrapAny(response: any): any {
    return response && typeof response === 'object' && 'data' in response ? response.data : response;
  }

  private unwrapList<T>(response: any): T[] {
    const raw = this.unwrapAny(response);
    if (Array.isArray(raw)) return raw as T[];

    if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).content)) return (raw as any).content as T[];
      if (Array.isArray((raw as any).items)) return (raw as any).items as T[];
      if (Array.isArray((raw as any).results)) return (raw as any).results as T[];
      if (Array.isArray((raw as any).encadrants)) return (raw as any).encadrants as T[];
    }

    return [];
  }

  private unwrapObject<T>(response: any): T {
    return this.unwrapAny(response) as T;
  }

  listByEntreprise(entrepriseId: number): Observable<ProfessionalSupervisor[]> {
    return this.http
      .get<any>(`${this.apiUrl}/entreprise/${entrepriseId}`)
      .pipe(map((response) => this.unwrapList<any>(response).map((item) => this.normalizeSupervisor(item))));
  }

  createByResponsable(
    responsableId: number,
    payload: ProfessionalSupervisorPayload
  ): Observable<ProfessionalSupervisor> {
    return this.http
      .post<any>(`${this.apiUrl}/responsable/${responsableId}`, this.toPayload(payload))
      .pipe(map((response) => this.normalizeSupervisor(this.unwrapObject<any>(response))));
  }

  createForEntreprise(payload: ProfessionalSupervisorPayload): Observable<ProfessionalSupervisor> {
    return this.http
      .post<any>(this.apiUrl, this.toPayload(payload))
      .pipe(map((response) => this.normalizeSupervisor(this.unwrapObject<any>(response))));
  }

  update(id: number, payload: ProfessionalSupervisorPayload): Observable<ProfessionalSupervisor> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, this.toPayload(payload))
      .pipe(map((response) => this.normalizeSupervisor(this.unwrapObject<any>(response))));
  }

  private normalizeSupervisor(raw: any): ProfessionalSupervisor {
    return {
      id: Number(raw?.id ?? 0),
      nom: String(raw?.nom ?? ''),
      prenom: String(raw?.prenom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      poste: String(raw?.poste ?? ''),
      service: String(raw?.service ?? ''),
      entrepriseId: raw?.entrepriseId ?? raw?.entreprise?.id ?? null,
      entrepriseNom: String(raw?.entrepriseNom ?? raw?.entreprise?.nom ?? '')
    };
  }

  private toPayload(payload: ProfessionalSupervisorPayload): ProfessionalSupervisorPayload {
    return {
      nom: payload.nom.trim(),
      prenom: payload.prenom.trim(),
      email: payload.email.trim(),
      telephone: payload.telephone.trim(),
      poste: payload.poste?.trim() || undefined,
      service: payload.service?.trim() || undefined,
      entrepriseId: payload.entrepriseId ?? null
    };
  }
}
