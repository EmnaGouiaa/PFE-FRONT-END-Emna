import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ConventionStage } from '../models/convention-stage.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class ServiceConventionService {
  private readonly API_URL = `${API_BASE_URL}/conventions-stage`;

  constructor(private http: HttpClient) {}

  getConventionParId(id: number): Observable<ConventionStage> {
    return this.http.get<ConventionStage>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getConventionParStage(stageId: number): Observable<ConventionStage> {
    return this.http.get<ConventionStage>(`${this.API_URL}/stage/${stageId}`)
      .pipe(catchError(this.handleError));
  }

  signerParStagiaire(id: number): Observable<ConventionStage> {
    return this.http.put<ConventionStage>(`${this.API_URL}/${id}/signer-stagiaire`, {})
      .pipe(catchError(this.handleError));
  }

  signerParEncadrantAcademique(id: number): Observable<ConventionStage> {
    return this.http.put<ConventionStage>(`${this.API_URL}/${id}/signer-encadrant-academique`, {})
      .pipe(catchError(this.handleError));
  }

  signerParEncadrantProfessionnel(id: number): Observable<ConventionStage> {
    return this.http.put<ConventionStage>(`${this.API_URL}/${id}/signer-encadrant-professionnel`, {})
      .pipe(catchError(this.handleError));
  }

  signerParEntreprise(id: number): Observable<ConventionStage> {
    return this.http.put<ConventionStage>(`${this.API_URL}/${id}/signer-entreprise`, {})
      .pipe(catchError(this.handleError));
  }

  signerParResponsable(id: number): Observable<ConventionStage> {
    return this.http.put<ConventionStage>(`${this.API_URL}/${id}/signer-responsable`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Une erreur est survenue :', error);
    return throwError(() => error);
  }
}
