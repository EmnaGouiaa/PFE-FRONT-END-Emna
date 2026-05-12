import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface UserNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  dateTime: string;
  read: boolean;
  readAt?: string | null;
  type?: string | null;
  relatedEntityId?: number | null;
  relatedEntityType?: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${API_BASE_URL}/notifications`;

  constructor(private http: HttpClient) {}

  listByUser(userId: number): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/utilisateur/${userId}`);
  }

  countUnread(userId: number): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/utilisateur/${userId}/non-lues/count`)
      .pipe(map((response) => Number(response?.count ?? 0)));
  }

  markAsRead(notificationId: number, userId: number): Observable<UserNotification> {
    return this.http.patch<UserNotification>(`${this.apiUrl}/${notificationId}/lu`, null, {
      params: { userId }
    });
  }
}
