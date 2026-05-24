import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import {
  FacultyAcademicSupervisor,
  FacultyAcademicSupervisorAssignmentResult,
  FacultyAgreement,
  FacultyCompanyRef,
  FacultyStageDocumentActionResult,
  FacultyStageDocumentsOverview,
  FacultyEvaluation,
  FacultyInternship,
  FacultyMeeting,
  FacultyOffer,
  FacultyReport,
  FacultyStudentAssignment,
  FacultyUserRef,
  StatutDocument
} from './faculty.models';

@Injectable({ providedIn: 'root' })
export class FacultyPortalService {
  private readonly stagesUrl = `${API_BASE_URL}/stages`;
  private readonly studentsUrl = `${API_BASE_URL}/stagiaires`;
  private readonly supervisorsUrl = `${API_BASE_URL}/encadrants-academiques`;
  private readonly meetingsUrl = `${API_BASE_URL}/reunions`;
  private readonly weeklyMeetingsUrl = `${API_BASE_URL}/reunions-hebdomadaires`;
  private readonly finalMeetingsUrl = `${API_BASE_URL}/reunions-finales`;
  private readonly agreementsUrl = `${API_BASE_URL}/conventions-stage`;
  private readonly evaluationsUrl = `${API_BASE_URL}/fiches-evaluation`;
  private readonly reportsUrl = `${API_BASE_URL}/cahiers-stage`;
  private readonly offersUrl = `${API_BASE_URL}/offres`;

  constructor(private http: HttpClient) {}

  listInternships(): Observable<FacultyInternship[]> {
    return this.http
      .get<any[]>(this.stagesUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeInternship(item))));
  }

  getInternshipById(id: number): Observable<FacultyInternship> {
    return this.http.get<any>(`${this.stagesUrl}/${id}`).pipe(map((item) => this.normalizeInternship(item)));
  }

  listStudentsForAcademicAssignments(): Observable<FacultyStudentAssignment[]> {
    return this.http
      .get<any[]>(this.studentsUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeStudentAssignment(item))));
  }

  listStudentsWithoutStage(): Observable<FacultyStudentAssignment[]> {
    return this.http
      .get<any[]>(`${this.studentsUrl}/sans-stage`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeStudentAssignment(item))));
  }

  searchStudentByEmail(email: string): Observable<FacultyStudentAssignment> {
    return this.http
      .get<any>(`${this.studentsUrl}/search`, { params: { email: email.trim() } })
      .pipe(map((item) => this.normalizeStudentAssignment(item)));
  }

  assignAcademicSupervisorToStudent(studentId: number, encadrantId: number): Observable<FacultyAcademicSupervisorAssignmentResult> {
    return this.http
      .patch<any>(`${this.studentsUrl}/${studentId}/affecter-encadrant-academique/${encadrantId}`, {})
      .pipe(
        map((response) => ({
          message: String(response?.message ?? 'Encadrant academique affecte avec succes'),
          student: this.normalizeStudentAssignment(response?.stagiaire)
        }))
      );
  }

  assignAcademicSupervisor(stageId: number, encadrantId: number): Observable<FacultyInternship> {
    return this.http
      .put<any>(`${this.stagesUrl}/${stageId}/affecter-encadrant-academique/${encadrantId}`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  getStageProgressSummary(stageId: number): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.stagesUrl}/${stageId}/resume-trello`);
  }

  getStageReportSummary(stageId: number): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.stagesUrl}/${stageId}/generer-rapport`);
  }

  listAcademicSupervisors(): Observable<FacultyAcademicSupervisor[]> {
    return this.http
      .get<any[]>(this.supervisorsUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeAcademicSupervisor(item))));
  }

  listMeetings(): Observable<FacultyMeeting[]> {
    return this.http
      .get<any>(this.meetingsUrl)
      .pipe(
        tap((response) => console.log('[FacultyPortalService] meetings raw response', response)),
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'HEBDOMADAIRE'))),
        map((meetings) => meetings.filter((item) => item.source === 'HEBDOMADAIRE')),
        tap((meetings) => console.log('[FacultyPortalService] weekly meetings normalized', meetings))
      );
  }

  getMeetingById(id: number): Observable<FacultyMeeting> {
    return this.http.get<any>(`${this.meetingsUrl}/${id}`).pipe(map((item) => this.normalizeMeeting(item, 'HEBDOMADAIRE')));
  }

  listFinalMeetings(): Observable<FacultyMeeting[]> {
    return this.http
      .get<any>(this.finalMeetingsUrl)
      .pipe(
        tap((response) => console.log('[FacultyPortalService] final meetings raw response', response)),
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'FINALE'))),
        tap((meetings) => console.log('[FacultyPortalService] final meetings normalized', meetings))
      );
  }

  updateFinalMeetingFormUrls(meetingId: number, payload: {
    urlFormSatisfaction: string | null;
    titreEnqueteSatisfaction?: string | null;
    descriptionEnqueteSatisfaction?: string | null;
  }): Observable<FacultyMeeting> {
    return this.http
      .patch<any>(`${this.finalMeetingsUrl}/${meetingId}/formulaires`, payload)
      .pipe(map((item) => this.normalizeMeeting(item, 'FINALE')));
  }

  listAgreements(): Observable<FacultyAgreement[]> {
    return this.http
      .get<any[]>(this.agreementsUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeAgreement(item))));
  }

  getAgreementById(id: number): Observable<FacultyAgreement> {
    return this.http.get<any>(`${this.agreementsUrl}/${id}`).pipe(map((item) => this.normalizeAgreement(item)));
  }

  signAgreementAsResponsable(id: number): Observable<FacultyAgreement> {
    return this.http
      .put<any>(`${this.agreementsUrl}/${id}/signer-responsable`, {})
      .pipe(map((item) => this.normalizeAgreement(item)));
  }

  signAgreementAsResponsableUniversitaire(id: number): Observable<FacultyAgreement> {
    return this.http
      .put<any>(`${this.agreementsUrl}/${id}/signer-responsable`, {})
      .pipe(map((item) => this.normalizeAgreement(item)));
  }

  listEvaluations(): Observable<FacultyEvaluation[]> {
    return this.http
      .get<any[]>(this.evaluationsUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeEvaluation(item))));
  }

  getEvaluationByStage(stageId: number): Observable<FacultyEvaluation> {
    return this.http
      .get<any>(`${this.evaluationsUrl}/stage/${stageId}`)
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  listReports(): Observable<FacultyReport[]> {
    return this.http
      .get<any[]>(this.reportsUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeReport(item))));
  }

  getReportByStage(stageId: number): Observable<FacultyReport> {
    return this.http.get<any>(`${this.reportsUrl}/stage/${stageId}`).pipe(map((item) => this.normalizeReport(item)));
  }

  /** Fetches all meetings (weekly + final) for a stage, sorted by date. */
  listMeetingsForStage(stageId: number): Observable<FacultyMeeting[]> {
    return forkJoin([
      this.http.get<any>(`${this.weeklyMeetingsUrl}/stage/${stageId}`).pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'HEBDOMADAIRE'))),
        catchError(() => of([] as FacultyMeeting[]))
      ),
      this.http.get<any>(`${this.finalMeetingsUrl}/stage/${stageId}`).pipe(
        map((response) => this.extractCollection(response).map((item) => this.normalizeMeeting(item, 'FINALE'))),
        catchError(() => of([] as FacultyMeeting[]))
      )
    ]).pipe(
      map(([weekly, finale]) => [...weekly, ...finale].sort((a, b) => a.date.localeCompare(b.date)))
    );
  }

  /** Fetches the data-URI signature stored in a user profile.
   *  Returns an empty string on any error (graceful degradation). */
  getUserSignature(userId: number | null): Observable<string> {
    if (!userId) return of('');
    return this.http.get<any>(`${API_BASE_URL}/utilisateurs/${userId}`).pipe(
      map((raw) => String(raw?.urlSignature ?? raw?.nomFichierSignature ?? '')),
      catchError(() => of(''))
    );
  }

  /** Fetches absences for a given internship stage.
   *  Returns an empty array on any error (graceful degradation). */
  getAbsencesForStage(stageId: number): Observable<{ dateAbsence: string; nbAbsence: number; justification: string; statut: string }[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/absences/stage/${stageId}`).pipe(
      map((items) => (items ?? []).map((item) => ({
        dateAbsence: String(item?.dateAbsence ?? ''),
        nbAbsence: Number(item?.nbAbsence ?? 1),
        justification: String(item?.justification ?? ''),
        statut: String(item?.statut ?? '')
      }))),
      catchError(() => of([]))
    );
  }

  listStageDocuments(): Observable<FacultyStageDocumentsOverview[]> {
    return this.http
      .get<any[]>(`${this.stagesUrl}/documents`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeStageDocumentsOverview(item))));
  }

  getStageDocuments(stageId: number): Observable<FacultyStageDocumentsOverview> {
    return this.http
      .get<any>(`${this.stagesUrl}/${stageId}/documents`)
      .pipe(map((item) => this.normalizeStageDocumentsOverview(item)));
  }

  generateStageDocument(stageId: number, documentType: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<FacultyStageDocumentActionResult> {
    return this.http
      .post<any>(`${this.stagesUrl}/${stageId}/documents/${documentType}/generer`, {})
      .pipe(map((response) => ({
        message: String(response?.message ?? 'Document genere avec succes'),
        stageDocuments: this.normalizeStageDocumentsOverview(response?.stageDocuments)
      })));
  }

  downloadStageDocumentPdf(stageId: number, documentType: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<Blob> {
    return this.http.get(`${this.stagesUrl}/${stageId}/documents/${documentType}/pdf`, { responseType: 'blob' });
  }

  listPendingOffers(): Observable<FacultyOffer[]> {
    return this.http
      .get<any>(`${this.offersUrl}/en-attente-validation`)
      .pipe(
        tap((response) => console.log('[FacultyPortalService] pending offers raw response', response)),
        map((response) => this.extractCollection(response).map((item) => this.normalizeOffer(item)))
      );
  }

  listAllOffers(): Observable<FacultyOffer[]> {
    return this.http
      .get<any>(`${this.offersUrl}/toutes`)
      .pipe(map((response) => this.extractCollection(response).map((item) => this.normalizeOffer(item))));
  }

  deleteOffer(offreId: number): Observable<void> {
    return this.http.delete<void>(`${this.offersUrl}/${offreId}`);
  }

  approveOffer(offreId: number, responsableId: number): Observable<FacultyOffer> {
    return this.http
      .patch<any>(`${this.offersUrl}/${offreId}/approuver`, { responsableServiceStagesId: responsableId })
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  rejectOffer(offreId: number, motifRefus?: string): Observable<FacultyOffer> {
    return this.http
      .patch<any>(`${this.offersUrl}/${offreId}/refuser`, { motifRefus: motifRefus?.trim() || null })
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  createOffer(payload: {
    titre: string;
    descriptionMissions: string;
    duree: number | null;
    profilRecherche: string;
    dateDebutPrevue: string;
    entrepriseId: number;
  }): Observable<FacultyOffer> {
    return this.http
      .post<any>(this.offersUrl, {
        titre: payload.titre.trim(),
        descriptionMissions: payload.descriptionMissions.trim(),
        duree: payload.duree ?? null,
        profilRecherche: payload.profilRecherche.trim(),
        dateDebutPrevue: payload.dateDebutPrevue,
        entrepriseId: payload.entrepriseId,
        publieeParId: null,
        valideeParId: null
      })
      .pipe(map((item) => this.normalizeOffer(item)));
  }

  private normalizeInternship(raw: any): FacultyInternship {
    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      sujet: String(raw?.sujet ?? ''),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      duree: this.normalizeNullableNumber(raw?.duree),
      nbSemaine: this.normalizeNullableNumber(raw?.nbSemaine),
      niveauSouhaite: String(raw?.niveauSouhaite ?? ''),
      statut: String(raw?.statut ?? ''),
      statutSujet: String(raw?.statutSujet ?? ''),
      trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
      conventionId: this.normalizeNullableNumber(raw?.conventionDeStage?.id),
      ficheEvaluationId: this.normalizeNullableNumber(raw?.ficheEvaluation?.id),
      stageRequestId: this.normalizeNullableNumber(raw?.demandeStage?.id),
      student: this.normalizeUser(raw?.stagiaire, raw?.stagiaire?.niveau, raw?.stagiaire?.filiere?.nom),
      company: this.normalizeCompany(raw?.entreprise),
      academicSupervisor: this.normalizeUser(raw?.encadrantAcademique, raw?.encadrantAcademique?.grade, raw?.encadrantAcademique?.specialite),
      professionalSupervisor: this.normalizeUser(raw?.encadrantProfessionnel, raw?.encadrantProfessionnel?.poste, raw?.encadrantProfessionnel?.service),
      companySupervisor: this.normalizeUser(raw?.tuteurEntreprise)
    };
  }

  private normalizeAcademicSupervisor(raw: any): FacultyAcademicSupervisor {
    return {
      id: Number(raw?.id ?? 0),
      nom: String(raw?.nom ?? ''),
      prenom: String(raw?.prenom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      grade: String(raw?.grade ?? ''),
      matricule: String(raw?.matricule ?? ''),
      specialite: String(raw?.specialite ?? '')
    };
  }

  private normalizeStudentAssignment(raw: any): FacultyStudentAssignment {
    return {
      id: Number(raw?.id ?? 0),
      fullName: `${raw?.prenom ?? ''} ${raw?.nom ?? ''}`.trim(),
      email: String(raw?.email ?? ''),
      matricule: String(raw?.matricule ?? ''),
      filiereNom: String(raw?.filiereNom ?? ''),
      niveau: this.normalizeNullableNumber(raw?.niveau),
      academicSupervisor: {
        id: this.normalizeNullableNumber(raw?.encadrantAcademiqueId),
        fullName: String(raw?.encadrantAcademiqueNom ?? ''),
        email: String(raw?.encadrantAcademiqueEmail ?? ''),
        secondary: String(raw?.encadrantAcademiqueEmail ?? '')
      },
      activeStageId: this.normalizeNullableNumber(raw?.stageActifId),
      activeStageTitle: String(raw?.stageActifTitre ?? ''),
      activeStageStatus: String(raw?.stageActifStatut ?? ''),
      hasActiveStage: Boolean(raw?.hasStageActif)
    };
  }

  private normalizeMeeting(raw: any, source: 'HEBDOMADAIRE' | 'FINALE'): FacultyMeeting {
    const resolvedSource = this.resolveMeetingSource(raw, source);
    return {
      id: Number(raw?.id ?? 0),
      source: resolvedSource,
      numReunion: String(raw?.numReunion ?? ''),
      date: String(raw?.date ?? ''),
      heure: String(raw?.heure ?? ''),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      studentName: String(raw?.stagiaireNom ?? ''),
      companyName: String(raw?.entrepriseNom ?? ''),
      participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map((item: unknown) => Number(item)) : [],
      note: this.normalizeNullableNumber(raw?.note),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? ''),
      titreEnqueteSatisfaction: String(raw?.titreEnqueteSatisfaction ?? ''),
      descriptionEnqueteSatisfaction: String(raw?.descriptionEnqueteSatisfaction ?? '')
    };
  }

  private resolveMeetingSource(raw: any, fallback: 'HEBDOMADAIRE' | 'FINALE'): 'HEBDOMADAIRE' | 'FINALE' {
    const candidates = [
      raw?.typeReunion,
      raw?.reunionType,
      raw?.discriminator,
      raw?.type
    ];

    const normalized = candidates
      .map((value) => String(value ?? '').trim().toUpperCase())
      .find((value) => value.length > 0);

    if (!normalized) {
      return fallback;
    }

    if (normalized === 'FINALE' || normalized === 'FINALES' || normalized === 'FINAL' || normalized === 'FINALE_REUNION') {
      return 'FINALE';
    }

    if (normalized === 'HEBDOMADAIRE' || normalized === 'REUNION' || normalized === 'HEBDOMADAIRES') {
      return 'HEBDOMADAIRE';
    }

    return fallback;
  }

  private normalizeAgreement(raw: any): FacultyAgreement {
    const dateDebut = String(raw?.dateDebut ?? '');
    return {
      id: Number(raw?.id ?? 0),
      numConv: this.normalizeNullableNumber(raw?.numConv),
      dateDebut,
      dateFin: String(raw?.dateFin ?? ''),
      anneeUniversitaire: this.computeAnneeUniversitaire(dateDebut),
      signeeEncAca: Boolean(raw?.signeeEncAca),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeEntreprise: Boolean(raw?.signeeEntreprise),
      signeeResp: Boolean(raw?.signeeResp),
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? ''),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      statutSignatures: Boolean(raw?.statutSignatures),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      demandeStageId: this.normalizeNullableNumber(raw?.demandeStageId)
    };
  }

  private computeAnneeUniversitaire(dateDebut: string): string {
    if (!dateDebut) return '';
    const d = new Date(dateDebut);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }

  private normalizeEvaluation(raw: any): FacultyEvaluation {
    return {
      id: Number(raw?.id ?? 0),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      reunionFinaleId: this.normalizeNullableNumber(raw?.reunionFinaleId),
      pointFortEncadrantPro: String(raw?.pointFortEncadrantPro ?? ''),
      axeAmeliorationEncadrantPro: String(raw?.axeAmeliorationEncadrantPro ?? ''),
      pointFortResponsableEntreprise: String(raw?.pointFortResponsableEntreprise ?? ''),
      axeAmeliorationResponsableEntreprise: String(raw?.axeAmeliorationResponsableEntreprise ?? ''),
      signatureEncadrantProfessionnel: String(raw?.signatureEncadrantProfessionnel ?? ''),
      signatureRepresentantEntreprise: String(raw?.signatureRepresentantEntreprise ?? ''),
      dateSignatureEncadrantProfessionnel: String(raw?.dateSignatureEncadrantProfessionnel ?? ''),
      dateSignatureRepresentantEntreprise: String(raw?.dateSignatureRepresentantEntreprise ?? ''),
      noteFinale: this.normalizeNullableNumber(raw?.noteFinale),
      donneesCompletes: Boolean(raw?.donneesCompletes),
      signaturesCompletes: Boolean(raw?.signaturesCompletes),
      complete: Boolean(raw?.complete),
      verrouillee: Boolean(raw?.verrouillee)
    };
  }

  private normalizeReport(raw: any): FacultyReport {
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

  private normalizeStageDocumentsOverview(raw: any): FacultyStageDocumentsOverview {
    return {
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      stageStatut: String(raw?.stageStatut ?? ''),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      stagiaireNom: String(raw?.stagiaireNom ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      encadrantAcademiqueNom: String(raw?.encadrantAcademiqueNom ?? ''),
      encadrantProfessionnelNom: String(raw?.encadrantProfessionnelNom ?? ''),
      convention: this.normalizeStageDocumentStatus(raw?.convention, 'CONVENTION', 'Convention de stage'),
      ficheEvaluation: this.normalizeStageDocumentStatus(raw?.ficheEvaluation, 'FICHE_EVALUATION', 'Fiche d evaluation'),
      cahierStage: this.normalizeStageDocumentStatus(raw?.cahierStage, 'CAHIER_STAGE', 'Cahier de stage')
    };
  }

  private normalizeStageDocumentStatus(raw: any, fallbackCode: string, fallbackLabel: string) {
    if (!raw) {
      return null;
    }

    return {
      code: String(raw?.code ?? fallbackCode),
      libelle: String(raw?.libelle ?? fallbackLabel),
      documentId: this.normalizeNullableNumber(raw?.documentId),
      disponible: Boolean(raw?.disponible),
      genere: Boolean(raw?.genere),
      generationAutorisee: Boolean(raw?.generationAutorisee),
      statut: String(raw?.statut ?? ''),
      raisonAbsence: String(raw?.raisonAbsence ?? ''),
      signeeParResponsableUniversitaire: Boolean(raw?.signeeParResponsableUniversitaire),
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? ''),
      statutDocument: (raw?.statutDocument ?? null) as StatutDocument | null
    };
  }

  private normalizeOffer(raw: any): FacultyOffer {
    return {
      id: Number(raw?.id ?? 0),
      titre: String(raw?.titre ?? ''),
      descriptionMissions: String(raw?.descriptionMissions ?? ''),
      duree: this.normalizeNullableNumber(raw?.duree),
      profilRecherche: String(raw?.profilRecherche ?? ''),
      dateDebutPrevue: String(raw?.dateDebutPrevue ?? ''),
      datePublication: String(raw?.datePublication ?? ''),
      statut: String(raw?.statut ?? ''),
      motifRefus: String(raw?.motifRefus ?? ''),
      entrepriseId: this.normalizeNullableNumber(raw?.entrepriseId),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      publieeParId: this.normalizeNullableNumber(raw?.publieeParId),
      publieeParNomComplet: String(raw?.publieeParNomComplet ?? ''),
      valideeParId: this.normalizeNullableNumber(raw?.valideeParId),
      valideeParNomComplet: String(raw?.valideeParNomComplet ?? ''),
      stageCree: Boolean(raw?.stageCree),
      affectable: Boolean(raw?.affectable)
    };
  }

  private extractCollection(raw: any): any[] {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (Array.isArray(raw?.content)) {
      return raw.content;
    }

    if (Array.isArray(raw?.value)) {
      return raw.value;
    }

    return [];
  }

  private normalizeUser(raw: any, firstSecondary?: unknown, secondSecondary?: unknown): FacultyUserRef {
    const secondaryParts = [firstSecondary, secondSecondary]
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    return {
      id: this.normalizeNullableNumber(raw?.id),
      fullName: `${raw?.prenom ?? ''} ${raw?.nom ?? ''}`.trim(),
      email: String(raw?.email ?? ''),
      secondary: secondaryParts.join(' · ')
    };
  }

  private normalizeCompany(raw: any): FacultyCompanyRef {
    return {
      id: this.normalizeNullableNumber(raw?.id),
      nom: String(raw?.nom ?? ''),
      email: String(raw?.email ?? ''),
      telephone: String(raw?.telephone ?? ''),
      secteurActivite: String(raw?.secteurActivite ?? '')
    };
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
