import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { DemandeStage } from '../models/demande-stage.model';

export interface DemandeStageDTO {
  nomEntreprise: string;
  adresseEntreprise: string;
  telephoneEntreprise?: string;
  emailEntreprise?: string;
  nomEncadrant: string;
  emailEncadrant: string;
  telephoneEncadrant?: string;
  posteEncadrant?: string;
  sujetStage: string;
  descriptionStage?: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface ReponseDemandeStage {
  id: number;
  message: string;
  statut: string;
  creeLe: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceDemandeStageService {
  private readonly API_URL = `${API_BASE_URL}/demandes-stage`;

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
      if (Array.isArray((raw as any).demandes)) return (raw as any).demandes as T[];
    }

    return [];
  }

  private normalizeDemande(raw: any): DemandeStage {
    const etudiant = raw?.etudiant ?? raw?.stagiaire ?? null;

    return {
      ...(raw as DemandeStage),
      id: Number(raw?.id ?? 0),
      nomEntreprise: raw?.nomEntreprise ?? raw?.entreprise?.nomEntreprise ?? '',
      adresseEntreprise: raw?.adresseEntreprise ?? raw?.entreprise?.adresseEntreprise ?? '',
      emailEntreprise: raw?.emailEntreprise ?? raw?.entreprise?.emailEntreprise ?? '',
      telephoneEntreprise: raw?.telephoneEntreprise ?? raw?.entreprise?.telephoneEntreprise ?? '',
      nomEncadrant: raw?.nomEncadrant ?? '',
      emailEncadrant: raw?.emailEncadrant ?? '',
      sujetStage: raw?.sujetStage ?? '',
      etudiant: etudiant
        ? {
            id: Number(etudiant?.id ?? 0),
            email: String(etudiant?.email ?? ''),
            nom: String(etudiant?.nom ?? ''),
            prenom: String(etudiant?.prenom ?? ''),
            role: String(etudiant?.role ?? '')
          }
        : null
    };
  }

  creerDemandeStage(demande: DemandeStageDTO): Observable<ReponseDemandeStage> {
    return this.http.post<ReponseDemandeStage>(this.API_URL, demande)
      .pipe(catchError(error => throwError(() => error)));
  }

  getToutesDemandes(): Observable<DemandeStage[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map((r) => this.unwrapList<any>(r).map((item) => this.normalizeDemande(item))),
      catchError(error => throwError(() => error))
    );
  }

  getDemandesEtudiant(): Observable<DemandeStage[]> {
    // Backward compatible alias for older endpoints.
    return this.http.get<any>(`${this.API_URL}/etudiant`).pipe(
      map((r) => this.unwrapList<any>(r).map((item) => this.normalizeDemande(item))),
      catchError(() => this.getDemandesParStagiaireDepuisSession())
    );
  }

  getDemandesParStagiaire(stagiaireId: number): Observable<DemandeStage[]> {
    return this.http.get<any>(`${this.API_URL}/stagiaire/${stagiaireId}`).pipe(
      map((r) => this.unwrapList<any>(r).map((item) => this.normalizeDemande(item))),
      catchError(error => throwError(() => error))
    );
  }

  getDemandeParId(id: number): Observable<DemandeStage> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map((r) => this.normalizeDemande(this.unwrapAny(r))),
      catchError(error => throwError(() => error))
    );
  }

  validerAdmin(demandeId: number, adminId: number): Observable<DemandeStage> {
    return this.http.put<DemandeStage>(`${this.API_URL}/${demandeId}/valider-admin/${adminId}`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  refuserAdmin(demandeId: number, adminId: number, commentaire?: string): Observable<DemandeStage> {
    const body = commentaire ? { commentaire } : {};
    return this.http.put<DemandeStage>(`${this.API_URL}/${demandeId}/refuser-admin/${adminId}`, body).pipe(
      catchError(error => throwError(() => error))
    );
  }

  validerResponsableStages(demandeId: number): Observable<DemandeStage> {
    return this.http.put<DemandeStage>(`${this.API_URL}/${demandeId}/valider-responsable-stages`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  refuserResponsableStages(demandeId: number, commentaire?: string): Observable<DemandeStage> {
    const body = commentaire ? { commentaire } : {};
    return this.http.put<DemandeStage>(`${this.API_URL}/${demandeId}/refuser-responsable-stages`, body).pipe(
      catchError(error => throwError(() => error))
    );
  }

  creerEntreprise(demandeId: number): Observable<any> {
    return this.http.post(`${this.API_URL}/${demandeId}/creer-entreprise`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  traiterDemandeStage(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${id}/traiter`, {})
      .pipe(catchError(error => throwError(() => error)));
  }

  private getDemandesParStagiaireDepuisSession(): Observable<DemandeStage[]> {
    const stagiaireId = Number(localStorage.getItem('userId') ?? '');
    if (!Number.isFinite(stagiaireId) || stagiaireId <= 0) {
      return throwError(() => new Error('Impossible de déterminer l’identifiant stagiaire.'));
    }

    return this.getDemandesParStagiaire(stagiaireId);
  }
}
