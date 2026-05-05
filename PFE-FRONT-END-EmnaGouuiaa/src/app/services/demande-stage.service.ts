import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DemandeStage, StatutDemande } from '../models/demande-stage.model';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class DemandeStageService {
  private readonly API_URL = `${API_BASE_URL}/demandes-stage`;

  constructor(private http: HttpClient) {}

  creerDemandeStage(demande: any): Observable<any> {
    console.log('🎯 DemandeStageService: Création de la demande:', demande);
    return this.http.post<any>(this.API_URL, demande)
      .pipe(
        map(response => {
          console.log('✅ Demande de stage créée avec succès:', response);
          return response;
        }),
        catchError(error => {
          console.error('❌ Erreur lors de la création de la demande:', error);
          return throwError(() => error);
        })
      );
  }

  getDemandesEtudiant(): Observable<DemandeStage[]> {
    return this.http.get<DemandeStage[]>(`${this.API_URL}/etudiant`)
      .pipe(
        catchError(error => {
          console.error('❌ Erreur lors de la récupération des demandes étudiant:', error);
          return throwError(() => error);
        })
      );
  }

  getToutesLesDemandes(): Observable<DemandeStage[]> {
    return this.http.get<DemandeStage[]>(`${this.API_URL}/toutes`)
      .pipe(
        catchError(error => {
          console.error('❌ Erreur lors de la récupération de toutes les demandes:', error);
          return throwError(() => error);
        })
      );
  }

  getDemandeParId(id: number): Observable<DemandeStage> {
    return this.http.get<DemandeStage>(`${this.API_URL}/${id}`)
      .pipe(
        catchError(error => {
          console.error('❌ Erreur lors de la récupération de la demande:', error);
          return throwError(() => error);
        })
      );
  }

  traiterDemandeStage(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/${id}/traiter`, {})
      .pipe(
        catchError(error => {
          console.error('❌ Erreur lors du traitement de la demande de stage:', error);
          return throwError(() => error);
        })
      );
  }
}
