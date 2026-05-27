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

/**
 * Réponse de GET /api/enquete/stage/{stageId}.
 * Contient l'état calculé de l'enquête pour un stage précis,
 * en appliquant la règle des 7 jours (dateFin … dateFin + 6).
 *
 * Valeurs possibles de `statut` :
 *   "Non configurée" | "Désactivée" | "En attente" | "Ouverte" | "Fermée"
 */
export interface EnqueteStageDto {
  stageId?: number | null;
  stageTitre?: string;
  titre: string;
  description: string;
  /** Vide ("") quand la section n'est pas ouverte — jamais exposé hors fenêtre. */
  urlFormulaire?: string | null;
  /** Statut calculé par le backend selon la fenêtre de 7 jours. */
  statut: 'Non configurée' | 'Désactivée' | 'En attente' | 'Ouverte' | 'Fermée' | string;
  /** true uniquement si la fenêtre est active ET active ET URL configurée. */
  sectionEnqueteOuverte?: boolean;
  disponible?: boolean;
  dateAtteinte?: boolean;
  /** Message contextuel expliquant le statut. */
  message?: string;
  active?: boolean;
  dateModification?: string;
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

  /**
   * GET /api/enquete/stage/{stageId} — état calculé de l'enquête pour un stage précis.
   *
   * Applique la règle des 7 jours côté backend :
   *   - statut "Ouverte"   + urlFormulaire renseignée → dans la fenêtre
   *   - statut "Fermée"    + urlFormulaire vide        → fenêtre expirée
   *   - statut "En attente"                            → stage pas encore terminé
   */
  getEnqueteParStage(stageId: number): Observable<EnqueteStageDto> {
    return this.http.get<EnqueteStageDto>(`${this.baseUrl}/stage/${stageId}`);
  }
}
