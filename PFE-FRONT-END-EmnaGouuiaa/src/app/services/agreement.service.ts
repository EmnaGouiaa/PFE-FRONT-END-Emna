import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { InternshipAgreement, AgreementSignature } from '../models/agreement.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class AgreementService {
  private readonly API_URL = `${API_BASE_URL}/agreements`;

  constructor(private http: HttpClient) {}

  generateAgreement(requestId: number): Observable<InternshipAgreement> {
    return this.http.post<InternshipAgreement>(`${this.API_URL}/generate/${requestId}`, {})
      .pipe(catchError(this.handleError));
  }

  getAgreementById(id: number): Observable<InternshipAgreement> {
    return this.http.get<InternshipAgreement>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${id}/pdf`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  signAgreement(token: string): Observable<AgreementSignature> {
    return this.http.post<AgreementSignature>(`${this.API_URL}/sign/${token}`, {})
      .pipe(catchError(this.handleError));
  }

  getPendingSignatures(): Observable<InternshipAgreement[]> {
    return this.http.get<InternshipAgreement[]>(`${this.API_URL}/pending-signature`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}
