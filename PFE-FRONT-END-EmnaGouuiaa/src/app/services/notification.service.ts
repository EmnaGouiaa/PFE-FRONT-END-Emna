import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface UserNotification {
  id: number;
  notificationId: number | null;
  title: string;
  message: string;
  dateTime: string;
  read: boolean;
  readAt: string | null;
  type: string | null;
  stageId: number | null;
  reunionId: number | null;
  reunionFinaleId: number | null;
  cahierStageId: number | null;
  ficheEvaluationId: number | null;
  conventionId: number | null;
  demandeId: number | null;
  relatedEntityId: number | null;
  relatedEntityType: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${API_BASE_URL}/notifications`;

  constructor(private http: HttpClient) {}

  listByUser(userId: number): Observable<UserNotification[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/utilisateur/${userId}`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalize(item))));
  }

  countUnread(userId: number): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/utilisateur/${userId}/non-lues/count`)
      .pipe(map((response) => Number(response?.count ?? 0)));
  }

  markAsRead(notificationDestinataireId: number): Observable<UserNotification> {
    return this.http
      .put<any>(`${this.apiUrl}/destinataire/${notificationDestinataireId}/read`, null)
      .pipe(map((item) => this.normalize(item)));
  }

  markAllAsRead(userId: number): Observable<number> {
    return this.http
      .put<{ markedAsRead: number }>(`${this.apiUrl}/utilisateur/${userId}/read-all`, null)
      .pipe(map((r) => Number(r?.markedAsRead ?? 0)));
  }

  private normalize(raw: any): UserNotification {
    return {
      id: Number(raw?.notificationDestinataireId ?? raw?.id ?? 0),
      notificationId: raw?.notificationId != null ? Number(raw.notificationId) : null,
      title: String(raw?.titre ?? raw?.title ?? ''),
      message: String(raw?.body ?? raw?.message ?? ''),
      dateTime: raw?.dateCreation ?? raw?.dateTime ?? null,
      read: raw?.statutNotification === 'LUE' || raw?.read === true,
      readAt: raw?.dateLecture ?? raw?.readAt ?? null,
      type: raw?.typeNotification ?? raw?.type ?? null,
      stageId: raw?.stageId != null ? Number(raw.stageId) : null,
      reunionId: raw?.reunionId != null ? Number(raw.reunionId) : null,
      reunionFinaleId: raw?.reunionFinaleId != null ? Number(raw.reunionFinaleId) : null,
      cahierStageId: raw?.cahierStageId != null ? Number(raw.cahierStageId) : null,
      ficheEvaluationId: raw?.ficheEvaluationId != null ? Number(raw.ficheEvaluationId) : null,
      conventionId: raw?.conventionId != null ? Number(raw.conventionId) : null,
      demandeId: raw?.demandeId != null ? Number(raw.demandeId) : null,
      relatedEntityId: raw?.stageId ?? raw?.reunionFinaleId ?? raw?.reunionId ?? raw?.cahierStageId ?? raw?.ficheEvaluationId ?? raw?.conventionId ?? raw?.demandeId ?? null,
      relatedEntityType: raw?.stageId != null ? 'STAGE'
        : raw?.reunionFinaleId != null ? 'REUNION_FINALE'
        : raw?.reunionId != null ? 'REUNION'
        : raw?.cahierStageId != null ? 'CAHIER_STAGE'
        : raw?.ficheEvaluationId != null ? 'FICHE_EVALUATION'
        : raw?.conventionId != null ? 'CONVENTION'
        : raw?.demandeId != null ? 'DEMANDE'
        : null,
    };
  }
}
