import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ConventionStage, SignatureConvention } from '../models/convention-stage.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class ServiceConventionService {
  private readonly API_URL = `${API_BASE_URL}/conventions`;

  constructor(private http: HttpClient) {}

  genererConvention(demandeId: number): Observable<ConventionStage> {
    return this.http.post<ConventionStage>(`${this.API_URL}/generer/${demandeId}`, {})
      .pipe(catchError(this.handleError));
  }

  getConventionParId(id: number): Observable<ConventionStage> {
    return this.http.get<ConventionStage>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  telechargerPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${id}/pdf`, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  signerConvention(jeton: string): Observable<SignatureConvention> {
    return this.http.post<SignatureConvention>(`${this.API_URL}/signer/${jeton}`, {})
      .pipe(catchError(this.handleError));
  }

  getSignaturesEnAttente(): Observable<ConventionStage[]> {
    return this.http.get<ConventionStage[]>(`${this.API_URL}/en-attente-signature`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Une erreur est survenue :', error);
    return throwError(() => error);
  }
}
