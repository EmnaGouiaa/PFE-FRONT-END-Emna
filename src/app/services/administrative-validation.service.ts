import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { InternshipRequest } from '../models/internship-request.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class AdministrativeValidationService {
  private readonly API_URL = `${API_BASE_URL}/internship-requests`;

  constructor(private http: HttpClient) {}

  getPendingRequests(): Observable<InternshipRequest[]> {
    return this.http.get<InternshipRequest[]>(`${this.API_URL}/pending-admin-validation`)
      .pipe(
        catchError(error => {
          console.error('❌ Error fetching pending admin requests:', error);
          return throwError(() => error);
        })
      );
  }

  getRequestById(id: number): Observable<InternshipRequest> {
    return this.http.get<InternshipRequest>(`${this.API_URL}/${id}`)
      .pipe(
        catchError(error => {
          console.error('❌ Error fetching request details:', error);
          return throwError(() => error);
        })
      );
  }

  approveRequest(id: number, comment: string): Observable<InternshipRequest> {
    return this.http.post<InternshipRequest>(`${this.API_URL}/${id}/admin-approve`, { comment })
      .pipe(
        catchError(error => {
          console.error('❌ Error approving request:', error);
          return throwError(() => error);
        })
      );
  }

  rejectRequest(id: number, comment: string): Observable<InternshipRequest> {
    return this.http.post<InternshipRequest>(`${this.API_URL}/${id}/admin-reject`, { comment })
      .pipe(
        catchError(error => {
          console.error('❌ Error rejecting request:', error);
          return throwError(() => error);
        })
      );
  }
}
