import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface Entreprise {
  id: number;
  nomEntreprise?: string;
  adresseEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
<<<<<<< HEAD
  secteurActivite?: string;
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  actif?: boolean;
}

export interface CreateEntrepriseRequest {
  nomEntreprise: string;
<<<<<<< HEAD
  adresse?: string;
  adresseEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  secteurActivite?: string;
=======
  adresseEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}

export interface UpdateEntrepriseRequest {
  nomEntreprise?: string;
<<<<<<< HEAD
  adresse?: string;
  adresseEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  secteurActivite?: string;
  actif?: boolean;
}

interface EntrepriseApiPayload {
  nom: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  secteurActivite?: string;
}

=======
  adresseEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  actif?: boolean;
}

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
@Injectable({ providedIn: 'root' })
export class EntreprisesService {
  private readonly API_URL = `${API_BASE_URL}/entreprises`;

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
      if (Array.isArray((raw as any).entreprises)) return (raw as any).entreprises as T[];
    }

    return [];
  }

  private unwrapObject<T>(response: any): T {
    return this.unwrapAny(response) as T;
  }

  private normalizeEntreprise(raw: any): Entreprise {
    const id = Number(raw?.id ?? raw?.entrepriseId ?? 0);
    const actifBrut = raw?.actif ?? raw?.active ?? raw?.enabled ?? raw?.estActif;
    const actif = typeof actifBrut === 'boolean' ? actifBrut : true;

    return {
      id,
      nomEntreprise: raw?.nomEntreprise ?? raw?.nom ?? '',
      adresseEntreprise: raw?.adresseEntreprise ?? raw?.adresse ?? '',
      emailEntreprise: raw?.emailEntreprise ?? raw?.email ?? '',
      telephoneEntreprise: raw?.telephoneEntreprise ?? raw?.telephone ?? '',
<<<<<<< HEAD
      secteurActivite: raw?.secteurActivite ?? '',
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      actif
    };
  }

<<<<<<< HEAD
  private toApiPayload(payload: CreateEntrepriseRequest | UpdateEntrepriseRequest): EntrepriseApiPayload {
    const nom = String(payload.nomEntreprise ?? '').trim();
    const adresse = String(payload.adresseEntreprise ?? payload.adresse ?? '').trim();
    const email = String(payload.emailEntreprise ?? '').trim();
    const telephone = String(payload.telephoneEntreprise ?? '').trim();
    const secteurActivite = String(payload.secteurActivite ?? '').trim();

    return {
      nom,
      adresse: adresse || undefined,
      email: email || undefined,
      telephone: telephone || undefined,
      secteurActivite: secteurActivite || undefined
    };
  }

=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  list(): Observable<Entreprise[]> {
    return this.http
      .get<any>(this.API_URL)
      .pipe(map((r) => this.unwrapList<any>(r).map((e) => this.normalizeEntreprise(e))));
  }

  getById(id: number): Observable<Entreprise> {
    return this.http
      .get<any>(`${this.API_URL}/${id}`)
      .pipe(map((r) => this.normalizeEntreprise(this.unwrapObject<any>(r))));
  }

  create(payload: CreateEntrepriseRequest): Observable<Entreprise> {
<<<<<<< HEAD
    const requestBody = this.toApiPayload(payload);
    console.log('[EntreprisesService] create payload:', requestBody);
    return this.http
      .post<any>(this.API_URL, requestBody)
=======
    return this.http
      .post<any>(this.API_URL, payload)
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      .pipe(map((r) => this.normalizeEntreprise(this.unwrapObject<any>(r))));
  }

  update(id: number, payload: UpdateEntrepriseRequest): Observable<Entreprise> {
<<<<<<< HEAD
    const requestBody = this.toApiPayload(payload);
    console.log('[EntreprisesService] update payload:', requestBody);
    return this.http
      .put<any>(`${this.API_URL}/${id}`, requestBody)
=======
    return this.http
      .put<any>(`${this.API_URL}/${id}`, payload)
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      .pipe(map((r) => this.normalizeEntreprise(this.unwrapObject<any>(r))));
  }
}
