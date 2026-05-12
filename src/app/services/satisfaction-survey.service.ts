import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { AuthentificationService, RoleUtilisateur } from './authentification.service';

export type SatisfactionSurveyStatus = 'EN_ATTENTE' | 'REMPLIE';

export interface SatisfactionSurvey {
  id: number;
  titre?: string;
  description?: string;
  urlFormulaire?: string;
  dateCreation: string;
  dateSoumission: string | null;
  statutEnquete: SatisfactionSurveyStatus;
  reponses: string;
  commentaireGlobal: string;
  roleRepondant: RoleUtilisateur | string;
  stageId: number | null;
  stageTitre: string;
  utilisateurId: number | null;
  utilisateurNomComplet: string;
  proprietaire: boolean;
  actionDisponible: boolean;
  sectionEnqueteOuverte: boolean;
}

export interface FillSatisfactionSurveyPayload {
  reponses: string;
  commentaireGlobal: string;
}

export interface StageSurveySectionStatus {
  stageId: number;
  sectionEnqueteOuverte: boolean;
  dateReunionFinale: string | null;
  dateFinStage: string | null;
  rapportDisponible: boolean;
  rapportNomFichier: string;
}

export interface SatisfactionSurveyReportMetadata {
  id: number;
  nomFichier: string;
  dateUpload: string;
  stageId: number | null;
  uploadedById: number | null;
  uploadedByNomComplet: string;
}

@Injectable({ providedIn: 'root' })
export class SatisfactionSurveyService {
  private readonly surveysUrl = `${API_BASE_URL}/enquetes-satisfaction`;
  private readonly finalMeetingsUrl = `${API_BASE_URL}/reunions-finales`;

  constructor(
    private http: HttpClient,
    private authService: AuthentificationService
  ) {}

  getByStage(stageId: number): Observable<SatisfactionSurvey[]> {
    return this.http
      .get<any[]>(`${this.surveysUrl}/stage/${stageId}`)
      .pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => this.normalizeSurvey(item))));
  }

  getByUserId(utilisateurId: number): Observable<SatisfactionSurvey[]> {
    return this.http
      .get<any[]>(`${this.surveysUrl}/utilisateur/${utilisateurId}`)
      .pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => this.normalizeSurvey(item))));
  }

  getForCurrentUser(): Observable<SatisfactionSurvey[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return of([]);
    }
    return this.getByUserId(userId);
  }

  fillSurvey(id: number, payload: FillSatisfactionSurveyPayload): Observable<SatisfactionSurvey> {
    return this.http
      .put<any>(`${this.surveysUrl}/${id}/remplir`, payload)
      .pipe(map((item) => this.normalizeSurvey(item)));
  }

  getSectionStatus(stageId: number): Observable<StageSurveySectionStatus> {
    return this.http
      .get<any>(`${API_BASE_URL}/stages/${stageId}/enquete-section-status`)
      .pipe(map((item) => this.normalizeSectionStatus(item)));
  }

  uploadReport(stageId: number, file: File): Observable<SatisfactionSurveyReportMetadata> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<any>(`${API_BASE_URL}/stages/${stageId}/rapport-enquete/upload`, formData)
      .pipe(map((item) => this.normalizeReportMetadata(item)));
  }

  getReportMetadata(stageId: number): Observable<SatisfactionSurveyReportMetadata> {
    return this.http
      .get<any>(`${API_BASE_URL}/stages/${stageId}/rapport-enquete/metadata`)
      .pipe(map((item) => this.normalizeReportMetadata(item)));
  }

  downloadReport(stageId: number): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/stages/${stageId}/rapport-enquete`, {
      responseType: 'blob'
    });
  }

  // Legacy helpers kept for compatibility with older components/routes.
  getConfiguration(): Observable<SatisfactionSurvey> {
    return throwError(() => new Error('La configuration externe de l’enquête n’est plus utilisée.'));
  }

  saveConfiguration(_: { titre: string; description: string; urlFormulaire: string }): Observable<SatisfactionSurvey> {
    return throwError(() => new Error('Le formulaire de satisfaction est désormais géré dans l’application.'));
  }

  getAvailableForCurrentUser(): Observable<any> {
    return this.getForCurrentUser().pipe(
      map((surveys) => {
        const pending = surveys.find((survey) => survey.statutEnquete === 'EN_ATTENTE');
        if (pending) {
          return {
            enqueteId: pending.id,
            stageId: pending.stageId,
            stageTitre: pending.stageTitre,
            statut: pending.statutEnquete,
            disponible: true,
            dateAtteinte: true,
            message: '',
          };
        }

        return {
          enqueteId: null,
          stageId: null,
          stageTitre: '',
          statut: 'AUCUNE',
          disponible: false,
          dateAtteinte: false,
          message: 'Aucune enquête de satisfaction en attente pour le moment.',
        };
      })
    );
  }

  getForFinalMeeting(reunionFinaleId: number): Observable<any> {
    return this.http.get<any>(`${this.finalMeetingsUrl}/${reunionFinaleId}/enquete-satisfaction`);
  }

  private normalizeSurvey(raw: any): SatisfactionSurvey {
    return {
      id: Number(raw?.id ?? 0),
      titre: raw?.titre ? String(raw.titre) : undefined,
      description: raw?.description ? String(raw.description) : undefined,
      urlFormulaire: raw?.urlFormulaire ? String(raw.urlFormulaire) : undefined,
      dateCreation: String(raw?.dateCreation ?? ''),
      dateSoumission: raw?.dateSoumission ? String(raw.dateSoumission) : null,
      statutEnquete: raw?.statutEnquete === 'REMPLIE' ? 'REMPLIE' : 'EN_ATTENTE',
      reponses: String(raw?.reponses ?? ''),
      commentaireGlobal: String(raw?.commentaireGlobal ?? ''),
      roleRepondant: String(raw?.roleRepondant ?? ''),
      stageId: this.normalizeNullableNumber(raw?.stageId),
      stageTitre: String(raw?.stageTitre ?? ''),
      utilisateurId: this.normalizeNullableNumber(raw?.utilisateurId),
      utilisateurNomComplet: String(raw?.utilisateurNomComplet ?? ''),
      proprietaire: Boolean(raw?.proprietaire),
      actionDisponible: Boolean(raw?.actionDisponible),
      sectionEnqueteOuverte: Boolean(raw?.sectionEnqueteOuverte),
    };
  }

  private normalizeSectionStatus(raw: any): StageSurveySectionStatus {
    return {
      stageId: Number(raw?.stageId ?? 0),
      sectionEnqueteOuverte: Boolean(raw?.sectionEnqueteOuverte),
      dateReunionFinale: raw?.dateReunionFinale ? String(raw.dateReunionFinale) : null,
      dateFinStage: raw?.dateFinStage ? String(raw.dateFinStage) : null,
      rapportDisponible: Boolean(raw?.rapportDisponible),
      rapportNomFichier: String(raw?.rapportNomFichier ?? ''),
    };
  }

  private normalizeReportMetadata(raw: any): SatisfactionSurveyReportMetadata {
    return {
      id: Number(raw?.id ?? 0),
      nomFichier: String(raw?.nomFichier ?? ''),
      dateUpload: String(raw?.dateUpload ?? ''),
      stageId: this.normalizeNullableNumber(raw?.stageId),
      uploadedById: this.normalizeNullableNumber(raw?.uploadedById),
      uploadedByNomComplet: String(raw?.uploadedByNomComplet ?? ''),
    };
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
