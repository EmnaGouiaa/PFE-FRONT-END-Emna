import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
<<<<<<< HEAD
import { ConventionStage } from '../models/convention-stage.model';
=======
import { ConventionStage, SignatureConvention } from '../models/convention-stage.model';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class ServiceConventionService {
<<<<<<< HEAD
  private readonly API_URL = `${API_BASE_URL}/conventions-stage`;

  constructor(private http: HttpClient) {}

=======
  private readonly API_URL = `${API_BASE_URL}/conventions`;

  constructor(private http: HttpClient) {}

  genererConvention(demandeId: number): Observable<ConventionStage> {
    return this.http.post<ConventionStage>(`${this.API_URL}/generer/${demandeId}`, {})
      .pipe(catchError(this.handleError));
  }

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  getConventionParId(id: number): Observable<ConventionStage> {
    return this.http.get<ConventionStage>(`${this.API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

<<<<<<< HEAD
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
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Une erreur est survenue :', error);
    return throwError(() => error);
  }
}
