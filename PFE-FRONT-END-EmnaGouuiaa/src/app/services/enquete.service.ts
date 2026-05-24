import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface EnqueteSatisfaction {
  id?: number;
  titre: string;
  description: string;
  urlFormulaire?: string | null;
  active: boolean;
  dateModification?: string;
}

export interface UpdateEnqueteRequest {
  titre: string;
  description: string;
  urlFormulaire?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EnqueteService {
  private readonly baseUrl = `${API_BASE_URL}/enquete`;

  constructor(private http: HttpClient) {}

  /** GET /api/enquete — récupère la configuration actuelle (RESPONSABLE_STAGE / ADMINISTRATEUR). */
  getEnquete(): Observable<EnqueteSatisfaction> {
    return this.http.get<EnqueteSatisfaction>(this.baseUrl);
  }

  /**
   * GET /api/enquete/acteur — configuration visible par TOUS les rôles authentifiés.
   * À utiliser dans les tableaux de bord des acteurs (EP, EA, STAGIAIRE, RE)
   * pour éviter le 403/401 que provoque getEnquete() pour ces rôles.
   */
  getEnqueteActeur(): Observable<EnqueteSatisfaction> {
    return this.http.get<EnqueteSatisfaction>(`${this.baseUrl}/acteur`);
  }

  /** PUT /api/enquete — met à jour titre, description et URL (RESPONSABLE_STAGE uniquement). */
  updateEnquete(data: UpdateEnqueteRequest): Observable<EnqueteSatisfaction> {
    return this.http.put<EnqueteSatisfaction>(this.baseUrl, data);
  }

  /** PATCH /api/enquete/toggle — active ou désactive l'enquête (RESPONSABLE_STAGE uniquement). */
  toggleEnquete(): Observable<EnqueteSatisfaction> {
    return this.http.patch<EnqueteSatisfaction>(`${this.baseUrl}/toggle`, {});
  }
}
