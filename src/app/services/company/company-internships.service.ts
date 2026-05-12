import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { CompanyInternship } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyInternshipsService {
  private readonly apiUrl = `${API_BASE_URL}/stages`;

  constructor(private http: HttpClient) {}

  private unwrapAny(response: any): any {
    return response && typeof response === 'object' && 'data' in response ? response.data : response;
  }

  private unwrapList<T>(response: any): T[] {
    const raw = this.unwrapAny(response);
    if (Array.isArray(raw)) return raw as T[];

    if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).content)) return (raw as any).content as T[];
      if (Array.isArray((raw as any).items)) return (raw as any).items as T[];
      if (Array.isArray((raw as any).results)) return (raw as any).results as T[];
      if (Array.isArray((raw as any).stages)) return (raw as any).stages as T[];
    }

    return [];
  }

  private unwrapObject<T>(response: any): T {
    return this.unwrapAny(response) as T;
  }

  listByEntreprise(entrepriseId: number): Observable<CompanyInternship[]> {
    return this.http
      .get<any>(`${this.apiUrl}/entreprise/${entrepriseId}`)
      .pipe(map((response) => this.unwrapList<any>(response).map((item) => this.normalizeInternship(item))));
  }

  getById(id: number): Observable<CompanyInternship> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.normalizeInternship(this.unwrapObject<any>(response))));
  }

  assignProfessionalSupervisor(stageId: number, encadrantId: number): Observable<CompanyInternship> {
    return this.http
      .put<any>(`${this.apiUrl}/${stageId}/affecter-encadrant-professionnel/${encadrantId}`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  validateByEntreprise(stageId: number): Observable<CompanyInternship> {
    return this.http
      .put<any>(`${this.apiUrl}/${stageId}/valider-entreprise`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  private normalizeInternship(raw: any): CompanyInternship {
    const stagiaire = raw?.stagiaire ?? {};
    const encadrantAcademique = raw?.encadrantAcademique ?? {};
    const encadrantProfessionnel = raw?.encadrantProfessionnel ?? {};
    const tuteurEntreprise = raw?.tuteurEntreprise ?? {};

    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      sujet: String(raw?.sujet ?? ''),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      duree: raw?.duree ?? null,
      nbSemaine: raw?.nbSemaine ?? null,
      niveauSouhaite: String(raw?.niveauSouhaite ?? ''),
      statut: String(raw?.statut ?? ''),
      statutSujet: String(raw?.statutSujet ?? ''),
      entrepriseId: raw?.entrepriseId ?? raw?.entreprise?.id ?? null,
      stagiaireId: stagiaire?.id ?? null,
      stagiaireNom: `${stagiaire?.prenom ?? ''} ${stagiaire?.nom ?? ''}`.trim(),
      stagiaireEmail: String(stagiaire?.email ?? ''),
      encadrantAcademiqueNom: `${encadrantAcademique?.prenom ?? ''} ${encadrantAcademique?.nom ?? ''}`.trim(),
      encadrantProfessionnelId: raw?.encadrantProfessionnelId ?? encadrantProfessionnel?.id ?? null,
      encadrantProfessionnelNom: `${encadrantProfessionnel?.prenom ?? ''} ${encadrantProfessionnel?.nom ?? ''}`.trim(),
      tuteurEntrepriseNom: `${tuteurEntreprise?.prenom ?? ''} ${tuteurEntreprise?.nom ?? ''}`.trim(),
      offreSourceId: raw?.offreSourceId ?? raw?.offreSource?.id ?? null,
      conventionId: raw?.conventionDeStage?.id ?? null,
      ficheEvaluationId: raw?.ficheEvaluation?.id ?? null,
      trelloBoardUrl: String(raw?.trelloBoardUrl ?? '')
    };
  }
}
