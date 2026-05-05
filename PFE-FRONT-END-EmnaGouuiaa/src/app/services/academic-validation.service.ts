import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcademicValidationRequest, AcademicValidationDTO } from '../models/academic-validation.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class AcademicValidationService {
  private apiUrl = `${API_BASE_URL}/internship-requests/academic`;

  constructor(private http: HttpClient) {}

  getPendingValidations(): Observable<AcademicValidationRequest[]> {
    return this.http.get<AcademicValidationRequest[]>(`${this.apiUrl}/pending`);
  }

  getRequestDetails(id: number): Observable<AcademicValidationRequest> {
    return this.http.get<AcademicValidationRequest>(`${this.apiUrl}/${id}`);
  }

  approveRequest(id: number, comment: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/approve`, { comment });
  }

  rejectRequest(id: number, comment: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reject`, { comment });
  }
}

