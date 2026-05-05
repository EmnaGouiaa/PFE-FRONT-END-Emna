import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import {
  StudentAgreement,
  StudentCompanyRef,
  StudentCompanyRequest,
  StudentCompanyRequestPayload,
  StudentEvaluation,
  StudentInternship,
  StudentMeeting,
  StudentOffer,
  StudentProfile,
  StudentProfileUpdateRequest,
  StudentReport,
  StudentStageDocumentAction,
  StudentStageDocumentsOverview,
  StudentTrelloBoardInfo,
  StudentTrelloSummary,
  StudentUserRef
} from './student.models';

@Injectable({ providedIn: 'root' })
export class StudentPortalService {
  private readonly profilesUrl = `${API_BASE_URL}/stagiaires`;
  private readonly usersUrl = `${API_BASE_URL}/utilisateurs`;
  private readonly offersUrl = `${API_BASE_URL}/offres`;
  private readonly requestsUrl = `${API_BASE_URL}/demandes-stage`;
  private readonly internshipsUrl = `${API_BASE_URL}/stages`;
  private readonly meetingsUrl = `${API_BASE_URL}/reunions`;
  private readonly weeklyMeetingsUrl = `${API_BASE_URL}/reunions-hebdomadaires`;
  private readonly finalMeetingsUrl = `${API_BASE_URL}/reunions-finales`;
  private readonly agreementsUrl = `${API_BASE_URL}/conventions-stage`;
  private readonly reportsUrl = `${API_BASE_URL}/cahiers-stage`;
  private readonly evaluationsUrl = `${API_BASE_URL}/fiches-evaluation`;

  constructor(private http: HttpClient) {}

  getProfile(studentId: number): Observable<StudentProfile> {
    return this.http
      .get<any>(`${this.profilesUrl}/${studentId}`)
      .pipe(map((item) => this.normalizeProfile(item)), catchError((error) => this.handleError(error)));
  }

  updateProfile(studentId: number, payload: StudentProfileUpdateRequest): Observable<StudentProfile> {
    const requestBody = {
      nom: this.normalizeOptionalString(payload.nom),
      prenom: this.normalizeOptionalString(payload.prenom),
      telephone: this.normalizeOptionalString(payload.telephone),
      adresse: this.normalizeOptionalString(payload.adresse),
      nomFichierSignature: this.normalizeOptionalString(payload.nomFichierSignature)
    };

    return this.http
      .patch<any>(`${this.usersUrl}/${studentId}/profil`, requestBody)
      .pipe(
        catchError((error) => this.handleError(error)),
        switchMap(() => this.getProfile(studentId))
      );
  }

  listOpenOffers(): Observable<StudentOffer[]> {
    return this.http
      .get<any>(`${this.offersUrl}/ouvertes`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeOffer(item))),
        map((offers) => offers.filter((offer) => this.isOfferVisibleToStudent(offer))),
        catchError((error) => this.handleError(error))
      );
  }

  getOfferById(id: number): Observable<StudentOffer> {
    return this.http
      .get<any>(`${this.offersUrl}/${id}`)
      .pipe(map((item) => this.normalizeOffer(item)), catchError((error) => this.handleError(error)));
  }

  createCompanyRequest(payload: StudentCompanyRequestPayload): Observable<StudentCompanyRequest> {
    return this.http
      .post<any>(this.requestsUrl, payload)
      .pipe(map((item) => this.normalizeCompanyRequest(item)), catchError((error) => this.handleError(error)));
  }

  listCompanyRequestsByStudent(studentId: number): Observable<StudentCompanyRequest[]> {
    return this.http
      .get<any>(`${this.requestsUrl}/stagiaire/${studentId}`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeCompanyRequest(item))),
        catchError((error) => this.handleError(error))
      );
  }

  listInternshipsByStudent(studentId: number): Observable<StudentInternship[]> {
    return this.http
      .get<any>(`${this.internshipsUrl}/stagiaire/${studentId}`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeInternship(item))),
        catchError((error) => this.handleError(error))
      );
  }

  listMyInternships(): Observable<StudentInternship[]> {
    return this.http
      .get<any>(`${this.internshipsUrl}/mes-stages`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeInternship(item))),
        catchError((error) => this.handleError(error))
      );
  }

  getMyInternship(): Observable<StudentInternship> {
    return this.http
      .get<any>(`${this.internshipsUrl}/mon-stage`)
      .pipe(map((item) => this.normalizeInternship(item)), catchError((error) => this.handleError(error)));
  }

  getInternshipById(id: number): Observable<StudentInternship> {
    return this.http
      .get<any>(`${this.internshipsUrl}/${id}`)
      .pipe(map((item) => this.normalizeInternship(item)), catchError((error) => this.handleError(error)));
  }

  getStageProgressSummary(stageId: number): Observable<StudentTrelloSummary> {
    return this.http
      .get<any>(`${this.internshipsUrl}/${stageId}/resume-trello`)
      .pipe(map((raw) => this.normalizeTrelloSummary(raw, stageId)), catchError((error) => this.handleError(error)));
  }

  getOrCreateTrelloBoard(stageId: number): Observable<StudentTrelloBoardInfo> {
    return this.http
      .get<any>(`${this.internshipsUrl}/${stageId}/trello-board`)
      .pipe(map((raw) => this.normalizeTrelloBoardInfo(raw, stageId)), catchError((error) => this.handleError(error)));
  }

  getStageReportSummary(stageId: number): Observable<Record<string, unknown>> {
    return this.http
      .get<Record<string, unknown>>(`${this.internshipsUrl}/${stageId}/generer-rapport`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  listMeetingsByStage(stageId: number): Observable<StudentMeeting[]> {
    return this.http
      .get<any>(`${this.weeklyMeetingsUrl}/stage/${stageId}`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'HEBDOMADAIRE'))),
        catchError((error) => this.handleError(error))
      );
  }

  listMyMeetings(): Observable<StudentMeeting[]> {
    return this.http
      .get<any>(`${this.meetingsUrl}/mes-reunions`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'HEBDOMADAIRE'))),
        catchError((error) => this.handleError(error))
      );
  }

  listFinalMeetingsByStage(stageId: number): Observable<StudentMeeting[]> {
    return this.http
      .get<any>(`${this.finalMeetingsUrl}/stage/${stageId}`)
      .pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'FINALE'))),
        catchError((error) => this.handleError(error))
      );
  }

  getAgreementByStage(stageId: number): Observable<StudentAgreement> {
    return this.http
      .get<any>(`${this.agreementsUrl}/stage/${stageId}`)
      .pipe(map((item) => this.normalizeAgreement(item)), catchError((error) => this.handleError(error)));
  }

  signAgreementAsStudent(agreementId: number): Observable<StudentAgreement> {
    return this.http
      .put<any>(`${this.agreementsUrl}/${agreementId}/signer-stagiaire`, {})
      .pipe(map((item) => this.normalizeAgreement(item)), catchError((error) => this.handleError(error)));
  }

  getReportByStage(stageId: number): Observable<StudentReport> {
    return this.http
      .get<any>(`${this.reportsUrl}/stage/${stageId}`)
      .pipe(map((item) => this.normalizeReport(item)), catchError((error) => this.handleError(error)));
  }

  signReportAsStudent(reportId: number): Observable<StudentReport> {
    return this.http
      .put<any>(`${this.reportsUrl}/${reportId}/signer-stagiaire`, {})
      .pipe(map((item) => this.normalizeReport(item)), catchError((error) => this.handleError(error)));
  }

  generateLogbook(stageId: number): Observable<StudentStageDocumentAction> {
    return this.http
      .post<any>(`${this.internshipsUrl}/${stageId}/documents/cahier-stage/generer`, {})
      .pipe(map((item) => this.normalizeStageDocumentAction(item, stageId)), catchError((error) => this.handleError(error)));
  }

  getStageDocuments(stageId: number): Observable<StudentStageDocumentsOverview> {
    return this.http
      .get<any>(`${this.internshipsUrl}/${stageId}/documents`)
      .pipe(map((item) => this.normalizeStageDocumentsOverview(item)), catchError((error) => this.handleError(error)));
  }

  downloadStageDocumentPdf(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<Blob> {
    return this.http
      .get(`${this.internshipsUrl}/${stageId}/documents/${type}/pdf`, { responseType: 'blob' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getEvaluationByStage(stageId: number): Observable<StudentEvaluation> {
    return this.http
      .get<any>(`${this.evaluationsUrl}/stage/${stageId}`)
      .pipe(map((item) => this.normalizeEvaluation(item)), catchError((error) => this.handleError(error)));
  }

  describeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Le serveur est indisponible ou la requête a été bloquée avant réponse.';
      }
      if (error.status === 401) {
        return 'Votre session a expiré. Veuillez vous reconnecter.';
      }
      if (error.status === 403) {
        return 'Cette action n’est pas autorisée pour le rôle stagiaire avec l’API actuelle.';
      }
      if (error.status === 404) {
        return 'Aucune donnée correspondante n’a été trouvée.';
      }
      return error.error?.message ?? error.message ?? fallback;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message?: unknown }).message ?? fallback);
    }

    return fallback;
  }

  pickCurrentInternship(internships: StudentInternship[]): StudentInternship | null {
    if (!internships.length) return null;

    const priority = ['EN_COURS', 'VALIDE_PAR_ENTREPRISE', 'VALIDE_PAR_RESPONSABLE', 'TERMINE'];
    for (const status of priority) {
      const found = internships.find((item) => item.statut === status);
      if (found) return found;
    }

    return null;
  }

  private normalizeProfile(raw: any): StudentProfile {
    return {
      id: Number(raw?.id ?? 0),
      nom: String(raw?.nom ?? ''),
      prenom: String(raw?.prenom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      adresse: String(raw?.adresse ?? ''),
      actif: Boolean(raw?.actif),
      nomFichierSignature: String(raw?.nomFichierSignature ?? ''),
      role: String(raw?.role ?? ''),
      matricule: String(raw?.matricule ?? ''),
      dateNaiss: String(raw?.dateNaiss ?? ''),
      filiereId: this.normalizeId(raw?.filiereId),
      filiereNom: String(raw?.filiereNom ?? ''),
      niveau: this.normalizeNumber(raw?.niveau)
    };
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeOffer(raw: any): StudentOffer {
    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      descriptionMissions: String(raw?.descriptionMissions ?? ''),
      duree: this.normalizeNumber(raw?.duree),
      profilRecherche: String(raw?.profilRecherche ?? ''),
      dateDebutPrevue: String(raw?.dateDebutPrevue ?? ''),
      datePublication: String(raw?.datePublication ?? ''),
      statut: String(raw?.statut ?? ''),
      motifRefus: String(raw?.motifRefus ?? ''),
      entrepriseId: this.normalizeId(raw?.entrepriseId),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      stageCree: Boolean(raw?.stageCree),
      affectable: Boolean(raw?.affectable)
    };
  }

  private isOfferVisibleToStudent(offer: StudentOffer): boolean {
    const hiddenStatuses = ['AFFECTEE', 'POURVUE', 'ARCHIVEE', 'FERMEE', 'REFUSEE'];
    if (offer.stageCree) {
      return false;
    }

    return !hiddenStatuses.includes((offer.statut || '').toUpperCase());
  }

  private normalizeCompanyRequest(raw: any): StudentCompanyRequest {
    return {
      id: Number(raw?.id ?? 0),
      statut: String(raw?.statut ?? ''),
      creeLe: String(raw?.creeLe ?? ''),
      misAJourLe: String(raw?.misAJourLe ?? ''),
      dateDemande: String(raw?.dateDemande ?? ''),
      nomEntreprise: String(raw?.nomEntreprise ?? ''),
      emailEntreprise: String(raw?.emailEntreprise ?? ''),
      telephoneEntreprise: String(raw?.telephoneEntreprise ?? ''),
      adresse: String(raw?.adresse ?? ''),
      secteurActivite: String(raw?.secteurActivite ?? ''),
      nomResponsable: String(raw?.nomResponsable ?? ''),
      prenomResponsable: String(raw?.prenomResponsable ?? ''),
      emailResponsable: String(raw?.emailResponsable ?? ''),
      statutAdmin: String(raw?.statutAdmin ?? raw?.statutValidationAdmin ?? ''),
      statutResponsableStages: String(raw?.statutResponsableStages ?? raw?.statutValidationResponsableStages ?? '')
    };
  }

  private normalizeInternship(raw: any): StudentInternship {
    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      sujet: String(raw?.sujet ?? ''),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      duree: this.normalizeNumber(raw?.duree),
      nbSemaine: this.normalizeNumber(raw?.nbSemaine),
      niveauSouhaite: String(raw?.niveauSouhaite ?? ''),
      statut: String(raw?.statut ?? ''),
      statutSujet: String(raw?.statutSujet ?? ''),
      trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
      conventionId: this.normalizeId(raw?.conventionDeStage?.id),
      ficheEvaluationId: this.normalizeId(raw?.ficheEvaluation?.id),
      reportId: this.normalizeId(raw?.cahierStage?.id),
      student: this.normalizeUser(raw?.stagiaire, raw?.stagiaire?.niveau, raw?.stagiaire?.filiere?.nom),
      company: this.normalizeCompany(raw?.entreprise),
      academicSupervisor: this.normalizeUser(raw?.encadrantAcademique, raw?.encadrantAcademique?.grade, raw?.encadrantAcademique?.specialite),
      professionalSupervisor: this.normalizeUser(raw?.encadrantProfessionnel, raw?.encadrantProfessionnel?.poste, raw?.encadrantProfessionnel?.service),
      companySupervisor: this.normalizeUser(raw?.tuteurEntreprise)
    };
  }

  private normalizeMeeting(raw: any, fallback: 'HEBDOMADAIRE' | 'FINALE'): StudentMeeting {
    return {
      id: Number(raw?.id ?? 0),
      source: this.resolveMeetingSource(raw, fallback),
      numReunion: String(raw?.numReunion ?? ''),
      date: String(raw?.date ?? ''),
      heure: String(raw?.heure ?? ''),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      stagiaireNom: String(raw?.stagiaireNom ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map((item: unknown) => Number(item)) : [],
      note: this.normalizeNumber(raw?.note),
      urlFormEvaluation: String(raw?.urlFormEvaluation ?? ''),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? '')
    };
  }

  private normalizeAgreement(raw: any): StudentAgreement {
    return {
      id: Number(raw?.id ?? 0),
      numConv: this.normalizeNumber(raw?.numConv),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      signeeEncAca: Boolean(raw?.signeeEncAca),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeEntreprise: Boolean(raw?.signeeEntreprise),
      signeeResp: Boolean(raw?.signeeResp),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      statutSignatures: Boolean(raw?.statutSignatures),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? '')
    };
  }

  private normalizeReport(raw: any): StudentReport {
    return {
      id: Number(raw?.id ?? 0),
      dateGeneration: String(raw?.dateGeneration ?? ''),
      dateSignature: String(raw?.dateSignature ?? ''),
      estSigne: Boolean(raw?.estSigne),
      signeeEncAcad: Boolean(raw?.signeeEncAcad),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeRespEntreprise: Boolean(raw?.signeeRespEntreprise),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? '')
    };
  }

  private normalizeTrelloSummary(raw: any, fallbackStageId: number): StudentTrelloSummary {
    return {
      stageId: Number(raw?.stageId ?? fallbackStageId),
      titreStage: String(raw?.titreStage ?? ''),
      sujet: String(raw?.sujet ?? ''),
      trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
      nombreTotalTaches: Number(raw?.nombreTotalTaches ?? 0),
      nombreTachesAFaire: Number(raw?.nombreTachesAFaire ?? 0),
      nombreTachesEnCours: Number(raw?.nombreTachesEnCours ?? 0),
      nombreTachesTerminees: Number(raw?.nombreTachesTerminees ?? 0),
      tachesAFaire: Array.isArray(raw?.tachesAFaire) ? raw.tachesAFaire : [],
      tachesEnCours: Array.isArray(raw?.tachesEnCours) ? raw.tachesEnCours : [],
      tachesTerminees: Array.isArray(raw?.tachesTerminees) ? raw.tachesTerminees : []
    };
  }

  private normalizeTrelloBoardInfo(raw: any, fallbackStageId: number): StudentTrelloBoardInfo {
    return {
      stageId: Number(raw?.stageId ?? fallbackStageId),
      trelloBoardId: String(raw?.trelloBoardId ?? ''),
      trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
      trelloTodoListId: String(raw?.trelloTodoListId ?? ''),
      trelloDoingListId: String(raw?.trelloDoingListId ?? ''),
      trelloDoneListId: String(raw?.trelloDoneListId ?? ''),
      created: Boolean(raw?.created)
    };
  }

  private normalizeStageDocumentAction(raw: any, fallbackStageId: number): StudentStageDocumentAction {
    return {
      stageId: Number(raw?.stageId ?? fallbackStageId),
      documentType: String(raw?.documentType ?? raw?.type ?? 'CAHIER_STAGE'),
      documentId: this.normalizeId(raw?.documentId ?? raw?.id),
      message: String(raw?.message ?? 'Document généré.'),
      generatedAt: String(raw?.generatedAt ?? raw?.dateGeneration ?? '')
    };
  }

  private normalizeStageDocumentsOverview(raw: any): StudentStageDocumentsOverview {
    return {
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      stageStatut: String(raw?.stageStatut ?? ''),
      stagiaireNom: String(raw?.stagiaireNom ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      encadrantAcademiqueNom: String(raw?.encadrantAcademiqueNom ?? ''),
      encadrantProfessionnelNom: String(raw?.encadrantProfessionnelNom ?? ''),
      convention: this.normalizeStageDocumentStatus(raw?.convention),
      ficheEvaluation: this.normalizeStageDocumentStatus(raw?.ficheEvaluation),
      cahierStage: this.normalizeStageDocumentStatus(raw?.cahierStage)
    };
  }

  private normalizeStageDocumentStatus(raw: any) {
    if (!raw) {
      return null;
    }

    return {
      code: String(raw?.code ?? ''),
      libelle: String(raw?.libelle ?? ''),
      documentId: this.normalizeId(raw?.documentId),
      disponible: Boolean(raw?.disponible),
      genere: Boolean(raw?.genere),
      generationAutorisee: Boolean(raw?.generationAutorisee),
      statut: String(raw?.statut ?? ''),
      raisonAbsence: String(raw?.raisonAbsence ?? ''),
      signeeParResponsableUniversitaire: Boolean(raw?.signeeParResponsableUniversitaire),
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? '')
    };
  }

  private normalizeEvaluation(raw: any): StudentEvaluation {
    return {
      id: Number(raw?.id ?? 0),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      reunionFinaleId: this.normalizeId(raw?.reunionFinaleId),
      pointFortEncadrantPro: String(raw?.pointFortEncadrantPro ?? ''),
      axeAmeliorationEncadrantPro: String(raw?.axeAmeliorationEncadrantPro ?? ''),
      pointFortResponsableEntreprise: String(raw?.pointFortResponsableEntreprise ?? ''),
      axeAmeliorationResponsableEntreprise: String(raw?.axeAmeliorationResponsableEntreprise ?? ''),
      signatureEncadrantProfessionnel: String(raw?.signatureEncadrantProfessionnel ?? ''),
      signatureRepresentantEntreprise: String(raw?.signatureRepresentantEntreprise ?? ''),
      dateSignatureEncadrantProfessionnel: String(raw?.dateSignatureEncadrantProfessionnel ?? ''),
      dateSignatureRepresentantEntreprise: String(raw?.dateSignatureRepresentantEntreprise ?? ''),
      noteFinale: this.normalizeNumber(raw?.noteFinale),
      donneesCompletes: Boolean(raw?.donneesCompletes),
      signaturesCompletes: Boolean(raw?.signaturesCompletes),
      complete: Boolean(raw?.complete),
      verrouillee: Boolean(raw?.verrouillee)
    };
  }

  private normalizeUser(raw: any, firstSecondary?: unknown, secondSecondary?: unknown): StudentUserRef {
    const secondaryParts = [firstSecondary, secondSecondary]
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    return {
      id: this.normalizeId(raw?.id),
      fullName: `${raw?.prenom ?? ''} ${raw?.nom ?? ''}`.trim(),
      email: String(raw?.email ?? ''),
      secondary: secondaryParts.join(' · ')
    };
  }

  private normalizeCompany(raw: any): StudentCompanyRef {
    return {
      id: this.normalizeId(raw?.id),
      nom: String(raw?.nom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      secteurActivite: String(raw?.secteurActivite ?? '')
    };
  }

  private normalizeNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private normalizeId(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  private resolveMeetingSource(raw: any, fallback: 'HEBDOMADAIRE' | 'FINALE'): 'HEBDOMADAIRE' | 'FINALE' {
    const candidates = [raw?.typeReunion, raw?.reunionType, raw?.discriminator, raw?.type];
    const normalized = candidates
      .map((value) => String(value ?? '').trim().toUpperCase())
      .find((value) => value.length > 0);

    if (!normalized) {
      return fallback;
    }

    if (normalized === 'FINALE' || normalized === 'FINAL') {
      return 'FINALE';
    }

    if (normalized === 'HEBDOMADAIRE' || normalized === 'REUNION') {
      return 'HEBDOMADAIRE';
    }

    return fallback;
  }

  private extractCollection(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
  }

  private handleError(error: unknown) {
    return throwError(() => error);
  }
}
