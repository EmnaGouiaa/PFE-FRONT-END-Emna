import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../api.config';
import { RoleUtilisateur } from '../authentification.service';
import {
  SupervisorAgreement,
  SupervisorEvaluation,
  SupervisorEvaluationNote,
  SupervisorInternship,
  SupervisorLogbook,
  SupervisorMeeting,
  SupervisorMeetingPayload,
  SupervisorRole,
  SupervisorStageDocumentsOverview,
  SupervisorTrelloSummary,
  SupervisorUserRef
} from './supervisor.models';

@Injectable({ providedIn: 'root' })
export class SupervisorPortalService {
  private readonly stagesUrl = `${API_BASE_URL}/stages`;
  private readonly meetingsUrl = `${API_BASE_URL}/reunions`;
  private readonly finalMeetingsUrl = `${API_BASE_URL}/reunions-finales`;
  private readonly agreementsUrl = `${API_BASE_URL}/conventions-stage`;
  private readonly logbooksUrl = `${API_BASE_URL}/cahiers-stage`;
  private readonly evaluationsUrl = `${API_BASE_URL}/fiches-evaluation`;

  constructor(private http: HttpClient) {}

  listMyInternships(role: RoleUtilisateur | SupervisorRole | null): Observable<SupervisorInternship[]> {
    const endpoint =
      String(role) === RoleUtilisateur.ENCADRANT_ACADEMIQUE
        ? 'encadrant-academique-connecte'
        : 'encadrant-professionnel-connecte';

    return this.http
      .get<any[]>(`${this.stagesUrl}/${endpoint}`)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizeInternship(item))));
  }

  validateSubject(stageId: number): Observable<SupervisorInternship> {
    return this.http
      .put<any>(`${this.stagesUrl}/${stageId}/valider-sujet-connecte`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  rejectSubject(stageId: number): Observable<SupervisorInternship> {
    return this.http
      .put<any>(`${this.stagesUrl}/${stageId}/refuser-sujet-connecte`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  getTrelloSummary(stageId: number): Observable<SupervisorTrelloSummary> {
    return this.http.get<any>(`${this.stagesUrl}/${stageId}/resume-trello`).pipe(
      map((raw) => ({
        stageId: Number(raw?.stageId ?? stageId),
        titreStage: String(raw?.titreStage ?? ''),
        trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
        nombreTotalTaches: Number(raw?.nombreTotalTaches ?? 0),
        nombreTachesAFaire: Number(raw?.nombreTachesAFaire ?? 0),
        nombreTachesEnCours: Number(raw?.nombreTachesEnCours ?? 0),
        nombreTachesTerminees: Number(raw?.nombreTachesTerminees ?? 0),
        tachesAFaire: Array.isArray(raw?.tachesAFaire) ? raw.tachesAFaire : [],
        tachesEnCours: Array.isArray(raw?.tachesEnCours) ? raw.tachesEnCours : [],
        tachesTerminees: Array.isArray(raw?.tachesTerminees) ? raw.tachesTerminees : []
      }))
    );
  }

  getOrCreateTrelloBoard(stageId: number): Observable<{ trelloBoardUrl: string; trelloBoardId: string }> {
    return this.http.get<any>(`${this.stagesUrl}/${stageId}/trello-board`).pipe(
      map((raw) => ({
        trelloBoardUrl: String(raw?.trelloBoardUrl ?? ''),
        trelloBoardId: String(raw?.trelloBoardId ?? '')
      }))
    );
  }

  listMeetingsForInternships(internships: SupervisorInternship[]): Observable<SupervisorMeeting[]> {
    if (!internships.length) {
      return of([]);
    }

    return forkJoin(
      internships.map((internship) =>
        forkJoin([
          this.http.get<any[]>(`${this.meetingsUrl}/stage/${internship.id}`).pipe(catchError(() => of([]))),
          this.http.get<any[]>(`${this.finalMeetingsUrl}/stage/${internship.id}`).pipe(catchError(() => of([])))
        ]).pipe(
          map(([weeklyMeetings, finalMeetings]) =>
            [...(weeklyMeetings ?? []), ...(finalMeetings ?? [])].map((item) => this.normalizeMeeting(item))
          ),
          catchError(() => of([]))
        )
      )
    ).pipe(
      map((groups) =>
        groups
          .flat()
          .sort((a, b) => `${b.date} ${b.heure}`.localeCompare(`${a.date} ${a.heure}`))
      )
    );
  }

  saveMeeting(payload: SupervisorMeetingPayload): Observable<SupervisorMeeting> {
    const body = this.toMeetingPayload(payload);
    const request$ = payload.id
      ? this.http.put<any>(`${this.meetingsUrl}/${payload.id}`, body)
      : this.http.post<any>(this.meetingsUrl, body);

    return request$.pipe(map((item) => this.normalizeMeeting(item)));
  }

  saveObservation(meetingId: number, observation: string): Observable<SupervisorMeeting> {
    return this.http
      .put<any>(`${this.meetingsUrl}/${meetingId}/observation`, observation.trim())
      .pipe(map((item) => this.normalizeMeeting(item)));
  }

  deleteMeeting(meetingId: number): Observable<void> {
    return this.http.delete<void>(`${this.meetingsUrl}/${meetingId}`);
  }

  getAgreementByStage(stageId: number): Observable<SupervisorAgreement> {
    return this.http.get<any>(`${this.agreementsUrl}/stage/${stageId}`).pipe(map((item) => this.normalizeAgreement(item)));
  }

  signAgreement(role: SupervisorRole, agreementId: number): Observable<SupervisorAgreement> {
    const endpoint = role === 'ENCADRANT_ACADEMIQUE' ? 'signer-encadrant-academique' : 'signer-encadrant-professionnel';
    return this.http.put<any>(`${this.agreementsUrl}/${agreementId}/${endpoint}`, {}).pipe(map((item) => this.normalizeAgreement(item)));
  }

  getLogbookByStage(stageId: number): Observable<SupervisorLogbook> {
    return this.http.get<any>(`${this.logbooksUrl}/stage/${stageId}`).pipe(map((item) => this.normalizeLogbook(item)));
  }

  signLogbook(role: SupervisorRole, logbookId: number): Observable<SupervisorLogbook> {
    const endpoint = role === 'ENCADRANT_ACADEMIQUE' ? 'signer-encadrant-academique' : 'signer-encadrant-professionnel';
    return this.http.put<any>(`${this.logbooksUrl}/${logbookId}/${endpoint}`, {}).pipe(map((item) => this.normalizeLogbook(item)));
  }

  getEvaluationByStage(stageId: number): Observable<SupervisorEvaluation> {
    return this.http.get<any>(`${this.evaluationsUrl}/stage/${stageId}`).pipe(map((item) => this.normalizeEvaluation(item)));
  }

  fillProfessionalEvaluation(id: number, userId: number, payload: Partial<SupervisorEvaluation>): Observable<SupervisorEvaluation> {
    return this.http
      .patch<any>(`${this.evaluationsUrl}/${id}/encadrant-pro/${userId}`, {
        pointFortEncadrantPro: payload.pointFortEncadrantPro?.trim() || '',
        axeAmeliorationEncadrantPro: payload.axeAmeliorationEncadrantPro?.trim() || ''
      })
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  saveEvaluationNotes(id: number, userId: number, notes: SupervisorEvaluationNote[]): Observable<SupervisorEvaluation> {
    const payload = (notes ?? []).map((note) => ({
      ficheEvaluationId: note.ficheEvaluationId,
      critereEvaluationId: note.critereEvaluationId,
      critereLibelle: note.critereLibelle?.trim() || '',
      poids: note.poids,
      bareme: 5,
      note: note.note,
      commentaire: note.commentaire?.trim() || ''
    }));

    return this.http
      .put<any>(`${this.evaluationsUrl}/${id}/notes/${userId}`, payload)
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  signEvaluation(id: number, userId: number): Observable<SupervisorEvaluation> {
    return this.http.patch<any>(`${this.evaluationsUrl}/${id}/signer/${userId}`, {}).pipe(map((item) => this.normalizeEvaluation(item)));
  }

  downloadDocument(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<Blob> {
    return this.http.get(`${this.stagesUrl}/${stageId}/documents/${type}/pdf`, { responseType: 'blob' });
  }

  generateLogbook(stageId: number): Observable<unknown> {
    return this.http.post(`${this.stagesUrl}/${stageId}/documents/cahier-stage/generer`, {});
  }

  getStageDocuments(stageId: number): Observable<SupervisorStageDocumentsOverview> {
    return this.http
      .get<any>(`${this.stagesUrl}/${stageId}/documents`)
      .pipe(map((item) => this.normalizeStageDocumentsOverview(item)));
  }

  private normalizeInternship(raw: any): SupervisorInternship {
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
      student: this.normalizeUser(raw?.stagiaire, raw?.stagiaire?.niveau, raw?.stagiaire?.filiere?.nom),
      company: {
        id: this.normalizeNullableNumber(raw?.entreprise?.id),
        nom: String(raw?.entreprise?.nom ?? raw?.entreprise?.nomEntreprise ?? ''),
        email: String(raw?.entreprise?.email ?? ''),
        telephone: String(raw?.entreprise?.telephone ?? ''),
        secteurActivite: String(raw?.entreprise?.secteurActivite ?? '')
      },
      academicSupervisor: this.normalizeUser(raw?.encadrantAcademique, raw?.encadrantAcademique?.grade, raw?.encadrantAcademique?.specialite),
      professionalSupervisor: this.normalizeUser(raw?.encadrantProfessionnel, raw?.encadrantProfessionnel?.poste, raw?.encadrantProfessionnel?.service),
      companySupervisor: this.normalizeUser(raw?.tuteurEntreprise)
    };
  }

  private normalizeMeeting(raw: any): SupervisorMeeting {
    return {
      id: Number(raw?.id ?? 0),
      source: String(raw?.typeReunion ?? '').toUpperCase().includes('FIN') ? 'FINALE' : 'HEBDOMADAIRE',
      numReunion: String(raw?.numReunion ?? ''),
      date: String(raw?.date ?? ''),
      heure: String(raw?.heure ?? ''),
      typeReunion: String(raw?.typeReunion ?? 'HEBDOMADAIRE'),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      studentName: String(raw?.stagiaireNom ?? ''),
      companyName: String(raw?.entrepriseNom ?? ''),
      typeEncadrantCreateur: String(raw?.typeEncadrantCreateur ?? ''),
      nomEncadrantCreateur: String(raw?.nomEncadrantCreateur ?? ''),
      participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map((item: unknown) => Number(item)) : [],
      participantNames: Array.isArray(raw?.participantNoms) ? raw.participantNoms.map((item: unknown) => String(item ?? '')) : [],
      note: this.normalizeNullableNumber(raw?.note),
      urlFormEvaluation: String(raw?.urlFormEvaluation ?? ''),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? '')
    };
  }

  private normalizeAgreement(raw: any): SupervisorAgreement {
    return {
      id: Number(raw?.id ?? 0),
      numConv: this.normalizeNullableNumber(raw?.numConv),
      dateDebut: String(raw?.dateDebut ?? ''),
      dateFin: String(raw?.dateFin ?? ''),
      signeeEncAca: Boolean(raw?.signeeEncAca),
      signeeEncPro: Boolean(raw?.signeeEncPro),
      signeeEntreprise: Boolean(raw?.signeeEntreprise),
      signeeResp: Boolean(raw?.signeeResp),
      signeeStagiaire: Boolean(raw?.signeeStagiaire),
      statutSignatures: Boolean(raw?.statutSignatures),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      demandeStageId: this.normalizeNullableNumber(raw?.demandeStageId)
    };
  }

  private normalizeLogbook(raw: any): SupervisorLogbook {
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

  private normalizeEvaluation(raw: any): SupervisorEvaluation {
    return {
      id: Number(raw?.id ?? 0),
      stageId: Number(raw?.stageId ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      stageSujet: String(raw?.stageSujet ?? ''),
      stageDateDebut: String(raw?.stageDateDebut ?? ''),
      stageDateFin: String(raw?.stageDateFin ?? ''),
      stagiaireNomComplet: String(raw?.stagiaireNomComplet ?? ''),
      sectionStagiaire: String(raw?.sectionStagiaire ?? ''),
      entrepriseNom: String(raw?.entrepriseNom ?? ''),
      entrepriseLieuStage: String(raw?.entrepriseLieuStage ?? ''),
      reunionFinaleId: this.normalizeNullableNumber(raw?.reunionFinaleId),
      reunionFinaleNumero: String(raw?.reunionFinaleNumero ?? ''),
      reunionFinaleDate: String(raw?.reunionFinaleDate ?? ''),
      reunionFinaleHeure: String(raw?.reunionFinaleHeure ?? ''),
      pointFortEncadrantPro: String(raw?.pointFortEncadrantPro ?? ''),
      axeAmeliorationEncadrantPro: String(raw?.axeAmeliorationEncadrantPro ?? ''),
      pointFortResponsableEntreprise: String(raw?.pointFortResponsableEntreprise ?? ''),
      axeAmeliorationResponsableEntreprise: String(raw?.axeAmeliorationResponsableEntreprise ?? ''),
      signatureEncadrantProfessionnel: String(raw?.signatureEncadrantProfessionnel ?? ''),
      signatureRepresentantEntreprise: String(raw?.signatureRepresentantEntreprise ?? ''),
      dateSignatureEncadrantProfessionnel: String(raw?.dateSignatureEncadrantProfessionnel ?? ''),
      dateSignatureRepresentantEntreprise: String(raw?.dateSignatureRepresentantEntreprise ?? ''),
      nomSignataireEncadrantProfessionnel: String(raw?.nomSignataireEncadrantProfessionnel ?? ''),
      roleSignatureEncadrantProfessionnel: String(raw?.roleSignatureEncadrantProfessionnel ?? ''),
      nomSignataireRepresentantEntreprise: String(raw?.nomSignataireRepresentantEntreprise ?? ''),
      roleSignatureRepresentantEntreprise: String(raw?.roleSignatureRepresentantEntreprise ?? ''),
      noteFinale: this.normalizeNullableNumber(raw?.noteFinale),
      donneesCompletes: Boolean(raw?.donneesCompletes),
      signaturesCompletes: Boolean(raw?.signaturesCompletes),
      complete: Boolean(raw?.complete),
      verrouillee: Boolean(raw?.verrouillee),
      notesAttribuees: Array.isArray(raw?.notesAttribuees) ? raw.notesAttribuees.map((item: any) => this.normalizeEvaluationNote(item)) : []
    };
  }

  private normalizeEvaluationNote(raw: any): SupervisorEvaluationNote {
    return {
      ficheEvaluationId: this.normalizeNullableNumber(raw?.ficheEvaluationId),
      critereEvaluationId: this.normalizeNullableNumber(raw?.critereEvaluationId),
      critereLibelle: String(raw?.critereLibelle ?? ''),
      poids: this.normalizeNullableNumber(raw?.poids),
      bareme: this.normalizeNullableNumber(raw?.bareme),
      note: this.normalizeNullableNumber(raw?.note),
      commentaire: String(raw?.commentaire ?? ''),
      scorePondere: this.normalizeNullableNumber(raw?.scorePondere),
      evaluee: Boolean(raw?.evaluee)
    };
  }

  private normalizeStageDocumentsOverview(raw: any): SupervisorStageDocumentsOverview {
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
      documentId: this.normalizeNullableNumber(raw?.documentId),
      disponible: Boolean(raw?.disponible),
      genere: Boolean(raw?.genere),
      generationAutorisee: Boolean(raw?.generationAutorisee),
      statut: String(raw?.statut ?? ''),
      raisonAbsence: String(raw?.raisonAbsence ?? ''),
      signeeParResponsableUniversitaire: Boolean(raw?.signeeParResponsableUniversitaire),
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? '')
    };
  }

  private normalizeUser(raw: any, firstSecondary?: unknown, secondSecondary?: unknown): SupervisorUserRef {
    const secondary = [firstSecondary, secondSecondary]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' - ');

    return {
      id: this.normalizeNullableNumber(raw?.id),
      fullName: `${raw?.prenom ?? ''} ${raw?.nom ?? ''}`.trim(),
      email: String(raw?.email ?? ''),
      secondary
    };
  }

  private toMeetingPayload(payload: SupervisorMeetingPayload): SupervisorMeetingPayload {
    // Ensure `heure` is sent as "HH:mm" or "HH:mm:ss" properly
    let formattedHeure = payload.heure;
    if (formattedHeure && formattedHeure.split(':').length === 2) {
      formattedHeure = `${formattedHeure}:00`;
    }
  
    const result: any = {
      ...payload,
      heure: formattedHeure,
      typeReunion: String(payload.typeReunion ?? 'HEBDOMADAIRE').trim() || 'HEBDOMADAIRE',
      observation: payload.observation.trim(),
      participantIds: payload.participantIds ?? []
    };
    delete result.compteRendu;
    if (payload.numReunion) {
      result.numReunion = payload.numReunion.trim();
    } else {
      delete result.numReunion;
    }
    return result;
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
