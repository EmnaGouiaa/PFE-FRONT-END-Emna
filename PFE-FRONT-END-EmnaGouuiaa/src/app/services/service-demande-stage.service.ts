import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { DemandeStage, StatutValidation } from '../models/demande-stage.model';
import {
  deriveResponsibleValidationStatus,
  mapBackendDemandeStatus,
  mapBackendValidationStatus,
} from '../utils/company-request-state.util';

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
      if (Array.isArray((raw as any).demandesStage)) return (raw as any).demandesStage as T[];
    }

    return [];
  }

  private unwrapObject<T>(response: any): T {
    return this.unwrapAny(response) as T;
  }

  private normalizeDemande(raw: any): DemandeStage {
    const etudiant = raw?.etudiant ?? raw?.stagiaire ?? null;
    const nomResponsable = [raw?.prenomResponsable, raw?.nomResponsable]
      .filter((part) => typeof part === 'string' && part.trim().length > 0)
      .join(' ')
      .trim();
    const statutValidationResponsableStages = deriveResponsibleValidationStatus(raw);

    return {
      id: Number(raw?.id ?? 0),
      nomEntreprise: raw?.nomEntreprise ?? raw?.entreprise?.nomEntreprise ?? '',
      adresseEntreprise: raw?.adresseEntreprise ?? raw?.adresse ?? raw?.entreprise?.adresseEntreprise ?? raw?.entreprise?.adresse ?? '',
      emailEntreprise: raw?.emailEntreprise ?? raw?.entreprise?.emailEntreprise ?? '',
      telephoneEntreprise: raw?.telephoneEntreprise ?? raw?.entreprise?.telephoneEntreprise ?? '',
      nomEncadrant: raw?.nomEncadrant ?? nomResponsable,
      emailEncadrant: raw?.emailEncadrant ?? raw?.emailResponsable ?? '',
      telephoneEncadrant: raw?.telephoneEncadrant ?? raw?.telephoneResponsable ?? '',
      posteEncadrant: raw?.posteEncadrant ?? raw?.posteResponsable ?? '',
      sujetStage: raw?.sujetStage ?? '',
      descriptionStage: raw?.descriptionStage ?? raw?.description ?? '',
      dateDebut: raw?.dateDebut ?? undefined,
      dateFin: raw?.dateFin ?? undefined,
      statut: mapBackendDemandeStatus(raw?.statut),
      statutValidationAdmin: mapBackendValidationStatus(raw?.statutValidationAdmin ?? raw?.statutAdmin),
      statutValidationResponsableStages,
      statutValidationEncadrant: mapBackendValidationStatus(
        raw?.statutValidationEncadrant ?? raw?.statutValidationProf
      ),
      statutValidationAcademique: mapBackendValidationStatus(
        raw?.statutValidationAcademique ?? raw?.statutValidationAcad
      ),
      commentaireAdmin: raw?.commentaireAdmin ?? raw?.motifRefusAdmin ?? undefined,
      commentaireResponsableStages:
        raw?.commentaireResponsableStages ?? raw?.motifRefusResponsableStages ?? undefined,
      creeLe: raw?.creeLe ?? raw?.dateDemande ?? new Date().toISOString(),
      misAJourLe: raw?.misAJourLe ?? undefined,
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
      map((r) => this.normalizeDemande(this.unwrapObject<any>(r))),
      catchError(error => throwError(() => error))
    );
  }

  // validerAdmin / refuserAdmin retirés :
  // l'admin n'a aucun droit de validation sur les demandes d'entreprise (lecture seule).
  // Seul RESPONSABLE_STAGE peut valider/refuser via validerResponsableStages / refuserResponsableStages.

  validerResponsableStages(demandeId: number): Observable<DemandeStage> {
    return this.http.put<any>(`${this.API_URL}/${demandeId}/valider-responsable-stages`, {}).pipe(
      map((r) => this.normalizeDemande(this.unwrapObject<any>(r))),
      catchError(error => throwError(() => error))
    );
  }

  refuserResponsableStages(demandeId: number, commentaire?: string): Observable<DemandeStage> {
    const body = { commentaire: String(commentaire ?? '').trim() };
    return this.http.put<any>(`${this.API_URL}/${demandeId}/refuser-responsable-stages`, body).pipe(
      map((r) => this.normalizeDemande(this.unwrapObject<any>(r))),
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
      return throwError(() => new Error("Impossible de déterminer l'identifiant stagiaire."));
    }

    return this.getDemandesParStagiaire(stagiaireId);
  }
}
