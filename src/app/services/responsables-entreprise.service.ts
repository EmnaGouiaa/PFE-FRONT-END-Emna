import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface ResponsableEntreprise {
  id: number;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  entrepriseId?: number;
  actif?: boolean;
}

export interface CreateResponsableEntrepriseRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  entrepriseId?: number;
}

export interface UpdateResponsableEntrepriseRequest {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  entrepriseId?: number;
  actif?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ResponsablesEntrepriseService {
  private readonly API_URL = `${API_BASE_URL}/responsables-entreprise`;

  constructor(private http: HttpClient) {}

  private unwrapAny(response: any): any {
    return (response && typeof response === 'object' && 'data' in response) ? response.data : response;
  }

  private unwrapList<T>(response: any): T[] {
    const raw = this.unwrapAny(response);
    if (Array.isArray(raw)) return raw as T[];

    if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).content)) return (raw as any).content as T[];
      if (Array.isArray((raw as any).items)) return (raw as any).items as T[];
      if (Array.isArray((raw as any).results)) return (raw as any).results as T[];
      if (Array.isArray((raw as any).responsables)) return (raw as any).responsables as T[];
    }

    return [];
  }

  private unwrapObject<T>(response: any): T {
    return this.unwrapAny(response) as T;
  }

  private normalizeResponsable(raw: any): ResponsableEntreprise {
    const id = Number(raw?.id ?? raw?.responsableId ?? raw?.userId ?? 0);
    const actifBrut = raw?.actif ?? raw?.active ?? raw?.enabled ?? raw?.estActif;
    const actif = typeof actifBrut === 'boolean' ? actifBrut : true;

    return {
      id,
      prenom: raw?.prenom ?? raw?.firstName ?? '',
      nom: raw?.nom ?? raw?.lastName ?? '',
      email: raw?.email ?? '',
      telephone: raw?.telephone ?? raw?.phone ?? '',
      entrepriseId: raw?.entrepriseId ?? raw?.idEntreprise ?? raw?.entreprise?.id,
      actif
    };
  }

  list(): Observable<ResponsableEntreprise[]> {
    return this.http
      .get<any>(this.API_URL)
      .pipe(map((r) => this.unwrapList<any>(r).map((item) => this.normalizeResponsable(item))));
  }

  getById(id: number): Observable<ResponsableEntreprise> {
    return this.http
      .get<any>(`${this.API_URL}/${id}`)
      .pipe(map((r) => this.normalizeResponsable(this.unwrapObject<any>(r))));
  }

  create(payload: CreateResponsableEntrepriseRequest): Observable<ResponsableEntreprise> {
    return this.http
      .post<any>(this.API_URL, payload)
      .pipe(map((r) => this.normalizeResponsable(this.unwrapObject<any>(r))));
  }

  update(id: number, payload: UpdateResponsableEntrepriseRequest): Observable<ResponsableEntreprise> {
    return this.http
      .put<any>(`${this.API_URL}/${id}`, payload)
      .pipe(map((r) => this.normalizeResponsable(this.unwrapObject<any>(r))));
  }

  listByEntreprise(entrepriseId: number): Observable<ResponsableEntreprise[]> {
    return this.http
      .get<any>(`${this.API_URL}/entreprise/${entrepriseId}`)
      .pipe(map((r) => this.unwrapList<any>(r).map((item) => this.normalizeResponsable(item))));
  }
}
