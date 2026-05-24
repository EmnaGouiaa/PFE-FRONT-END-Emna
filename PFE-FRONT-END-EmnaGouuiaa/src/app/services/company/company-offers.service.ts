import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import {
  CompanyOffer,
  CompanyOfferAssignmentPayload,
  CompanyOfferAssignmentResponse,
  CompanyOfferCancellationResponse,
  CompanyOfferPayload
} from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyOffersService {
  private readonly apiUrl = `${API_BASE_URL}/offres`;

  constructor(private http: HttpClient) {}

  listByEntreprise(entrepriseId: number): Observable<CompanyOffer[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/entreprise/${entrepriseId}`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeOffer(item))));
  }

  getById(id: number): Observable<CompanyOffer> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map((item) => this.normalizeOffer(item)));
  }

  create(payload: CompanyOfferPayload): Observable<CompanyOffer> {
    return this.http
      .post<any>(this.apiUrl, this.toPayload(payload))
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  update(id: number, payload: CompanyOfferPayload): Observable<CompanyOffer> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, this.toPayload(payload))
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  publish(offreId: number, responsableId: number): Observable<CompanyOffer> {
    return this.http
      .put<any>(`${this.apiUrl}/${offreId}/publier/${responsableId}`, {})
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  close(offreId: number): Observable<CompanyOffer> {
    return this.http
      .put<any>(`${this.apiUrl}/${offreId}/fermer`, {})
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  assignStudent(offreId: number, payload: CompanyOfferAssignmentPayload): Observable<CompanyOfferAssignmentResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/${offreId}/affecter-etudiant`, {
        emailEtudiant: payload.emailEtudiant.trim()
      })
      .pipe(map((item) => this.normalizeAssignmentResponse(item)));
  }

  cancelAssignment(offreId: number): Observable<CompanyOfferCancellationResponse> {
    return this.http
      .patch<any>(`${this.apiUrl}/${offreId}/annuler-affectation`, {})
      .pipe(map((item) => this.normalizeCancellationResponse(item)));
  }

  private normalizeOffer(raw: any): CompanyOffer {
    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      descriptionMissions: String(raw?.descriptionMissions ?? ''),
      duree: raw?.duree ?? null,
      profilRecherche: String(raw?.profilRecherche ?? ''),
      dateDebutPrevue: String(raw?.dateDebutPrevue ?? ''),
      datePublication: String(raw?.datePublication ?? ''),
      statut: String(raw?.statut ?? ''),
      entrepriseId: raw?.entrepriseId ?? raw?.entreprise?.id ?? null,
      entrepriseNom: String(raw?.entrepriseNom ?? raw?.entreprise?.nom ?? ''),
      publieeParId: raw?.publieeParId ?? raw?.publieePar?.id ?? null,
      valideeParId: raw?.valideeParId ?? raw?.valideePar?.id ?? null,
      motifRefus: String(raw?.motifRefus ?? ''),
      publieeParNomComplet: String(raw?.publieeParNomComplet ?? ''),
      valideeParNomComplet: String(raw?.valideeParNomComplet ?? ''),
      encadrantProId: raw?.encadrantProId ?? raw?.encadrantPro?.id ?? null,
      encadrantProNomComplet: String(raw?.encadrantProNomComplet ?? ''),
      stageCree: Boolean(raw?.stageCree),
      affectable: Boolean(raw?.affectable),
      affectationActive: Boolean(raw?.affectationActive),
      statutSujet: raw?.statutSujet == null ? null : String(raw.statutSujet)
    };
  }

  private toPayload(payload: CompanyOfferPayload): CompanyOfferPayload {
    return {
      titre: payload.titre.trim(),
      descriptionMissions: payload.descriptionMissions.trim(),
      duree: payload.duree ?? null,
      profilRecherche: payload.profilRecherche.trim(),
      dateDebutPrevue: payload.dateDebutPrevue,
      entrepriseId: payload.entrepriseId,
      publieeParId: payload.publieeParId ?? null,
      valideeParId: payload.valideeParId ?? null,
      encadrantProId: payload.encadrantProId ?? null
    };
  }

  private normalizeAssignmentResponse(raw: any): CompanyOfferAssignmentResponse {
    return {
      message: String(raw?.message ?? ''),
      offreId: Number(raw?.offreId ?? 0),
      offreStatut: String(raw?.offreStatut ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      stagiaireId: Number(raw?.stagiaireId ?? 0),
      stagiaireEmail: String(raw?.stagiaireEmail ?? '')
    };
  }

  private normalizeCancellationResponse(raw: any): CompanyOfferCancellationResponse {
    return {
      message: String(raw?.message ?? ''),
      offreId: Number(raw?.offreId ?? 0),
      offreStatut: String(raw?.offreStatut ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageStatut: String(raw?.stageStatut ?? ''),
      modeAnnulation: String(raw?.modeAnnulation ?? '')
    };
  }
}
