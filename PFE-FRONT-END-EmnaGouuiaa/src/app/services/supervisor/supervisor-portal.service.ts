import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { getJsonOptional$ } from '../http-optional-body';
import { API_BASE_URL } from '../api.config';
import { RoleUtilisateur } from '../authentification.service';
import {
  EvaluationNoteDto,
  SupervisorAgreement,
  SupervisorEvaluation,
  SupervisorInternship,
  SupervisorLogbook,
  MeetingEligibleParticipant,
  SupervisorMeeting,
  SupervisorMeetingPayload,
  SupervisorRole,
  SupervisorStageDocumentsOverview,
  SupervisorTrelloSummary,
  SupervisorUserRef
} from './supervisor.models';
import { normalizeDocumentSignatoriesApi } from '../../shared/stage-documents/stage-document-signatures.util';
import {
  normalizeMeetingDate,
  normalizeMeetingHeure,
  resolveMeetingSourceFromApi
} from '../../utils/meeting-schedule.util';
import {
  normalizeParticipantNames,
  pickMeetingCompanySupervisorName,
  pickMeetingCreatorFields
} from '../../utils/meeting-display.util';

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
      .pipe(
        map((items) => (items ?? []).map((item) => this.normalizeInternship(item))),
        map((internships) => {
          // Garde-fou : évite que le même stage soit traité deux fois (ce qui
          // dédoublerait ensuite réunions, documents, évaluations, etc.).
          const seen = new Set<number>();
          return internships.filter((internship) => {
            if (seen.has(internship.id)) {
              return false;
            }
            seen.add(internship.id);
            return true;
          });
        })
      );
  }

  validateSubject(stageId: number): Observable<SupervisorInternship> {
    return this.http
      .put<any>(`${this.stagesUrl}/${stageId}/valider-sujet-connecte`, {})
      .pipe(map((item) => this.normalizeInternship(item)));
  }

  rejectSubject(stageId: number): Observable<void> {
    return this.http.put<void>(`${this.stagesUrl}/${stageId}/refuser-sujet-connecte`, {});
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

  getEligibleMeetingParticipants(stageId: number): Observable<MeetingEligibleParticipant[]> {
    return this.http
      .get<MeetingEligibleParticipant[]>(`${this.meetingsUrl}/stage/${stageId}/eligible-participants`)
      .pipe(
        map((items) =>
          (items ?? []).map((item) => ({
            id: Number(item.id),
            fullName: String(item.fullName ?? '').trim(),
            email: String(item.email ?? '').trim(),
            role: String(item.role ?? '').trim(),
            roleLabel: String(item.roleLabel ?? '').trim()
          }))
        ),
        catchError(() => of([]))
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
        this.dedupeMeetings(groups.flat())
          .sort((a, b) => `${b.date} ${b.heure}`.localeCompare(`${a.date} ${a.heure}`))
      )
    );
  }

  /**
   * Supprime les réunions en double. Une réunion finale (ex: "RF-2") peut être
   * renvoyée à la fois par l'endpoint des réunions hebdomadaires et par celui des
   * réunions finales, ce qui dédoublait l'historique côté UI.
   * - Si un numéro de réunion est présent, il identifie la réunion de façon fiable
   *   (indépendamment de l'endpoint source).
   * - Sinon on retombe sur la combinaison source/id/date/heure/stage.
   */
  private dedupeMeetings(meetings: SupervisorMeeting[]): SupervisorMeeting[] {
    const byKey = new Map<string, SupervisorMeeting>();
    for (const meeting of meetings) {
      const num = (meeting.numReunion ?? '').trim();
      const key = num
        ? `num:${num.toUpperCase()}|stage:${meeting.stageId}`
        : `id:${meeting.source}-${meeting.id}|${meeting.date}|${meeting.heure}|stage:${meeting.stageId}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, meeting);
        continue;
      }
      if (meeting.source === 'FINALE' && existing.source !== 'FINALE') {
        byKey.set(key, meeting);
      }
    }
    return Array.from(byKey.values());
  }

  saveMeeting(payload: SupervisorMeetingPayload): Observable<SupervisorMeeting> {
    const body = this.toMeetingPayload(payload);
    const request$ = payload.id
      ? this.http.put<any>(`${this.meetingsUrl}/${payload.id}`, body)
      : this.http.post<any>(this.meetingsUrl, body);

    return request$.pipe(map((item) => this.normalizeMeeting(item)));
  }

  /** Réunion finale : seule l'heure est modifiable (payload minimal pour éviter les rejets policy). */
  saveFinalMeetingSchedule(
    payload: SupervisorMeetingPayload
  ): Observable<SupervisorMeeting> {
    const body = {
      id: payload.id,
      heure: this.formatMeetingHeure(payload.heure),
    };
    return this.http
      .put<any>(`${this.finalMeetingsUrl}/${payload.id}`, body)
      .pipe(map((item) => this.normalizeMeeting(item)));
  }

  /** Observation du créateur (encadrant académique ou professionnel) sur sa réunion hebdomadaire. */
  saveObservation(meetingId: number, observation: string): Observable<SupervisorMeeting> {
    return this.http
      .put<any>(`${this.meetingsUrl}/${meetingId}/observation`, JSON.stringify(observation.trim()), {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(map((item) => this.normalizeMeeting(item)));
  }

  /** @deprecated Utiliser {@link saveObservation} pour les encadrants. */
  saveReport(meetingId: number, observation: string): Observable<SupervisorMeeting> {
    return this.saveObservation(meetingId, observation);
  }

  deleteMeeting(meetingId: number): Observable<void> {
    return this.http.delete<void>(`${this.meetingsUrl}/${meetingId}`);
  }

  getAgreementByStage(stageId: number): Observable<SupervisorAgreement | null> {
    return getJsonOptional$<any>(this.http, `${this.agreementsUrl}/stage/${stageId}`).pipe(
      map((item) => (item ? this.normalizeAgreement(item) : null))
    );
  }

  signAgreement(role: SupervisorRole, agreementId: number): Observable<SupervisorAgreement> {
    const endpoint = role === 'ENCADRANT_ACADEMIQUE' ? 'signer-encadrant-academique' : 'signer-encadrant-professionnel';
    return this.http.put<any>(`${this.agreementsUrl}/${agreementId}/${endpoint}`, {}).pipe(map((item) => this.normalizeAgreement(item)));
  }

  getLogbookByStage(stageId: number): Observable<SupervisorLogbook | null> {
    return getJsonOptional$<any>(this.http, `${this.logbooksUrl}/stage/${stageId}`).pipe(
      map((item) => (item ? this.normalizeLogbook(item) : null))
    );
  }

  signLogbook(role: SupervisorRole, logbookId: number, signatureImage: string): Observable<SupervisorLogbook> {
    const endpoint = role === 'ENCADRANT_ACADEMIQUE' ? 'signer-encadrant-academique' : 'signer-encadrant-professionnel';
    return this.http
      .put<any>(`${this.logbooksUrl}/${logbookId}/${endpoint}`, { signatureImage })
      .pipe(map((item) => this.normalizeLogbook(item)));
  }

  getEvaluationByStage(stageId: number): Observable<SupervisorEvaluation | null> {
    return getJsonOptional$<any>(this.http, `${this.evaluationsUrl}/stage/${stageId}`).pipe(
      map((item) => (item ? this.normalizeEvaluation(item) : null))
    );
  }

  fillProfessionalEvaluation(id: number, userId: number, payload: Partial<SupervisorEvaluation>): Observable<SupervisorEvaluation> {
    return this.http
      .patch<any>(`${this.evaluationsUrl}/${id}/encadrant-pro/${userId}`, {
        pointFortEncadrantPro: payload.pointFortEncadrantPro?.trim() || '',
        axeAmeliorationEncadrantPro: payload.axeAmeliorationEncadrantPro?.trim() || ''
      })
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  signEvaluation(id: number, userId: number): Observable<SupervisorEvaluation> {
    return this.http.patch<any>(`${this.evaluationsUrl}/${id}/signer/${userId}`, {}).pipe(map((item) => this.normalizeEvaluation(item)));
  }

  saveEvaluationNotes(id: number, userId: number, notes: EvaluationNoteDto[]): Observable<SupervisorEvaluation> {
    return this.http
      .put<any>(`${this.evaluationsUrl}/${id}/notes/${userId}`, notes)
      .pipe(map((item) => this.normalizeEvaluation(item)));
  }

  downloadDocument(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): Observable<Blob> {
    return this.http.get(`${this.stagesUrl}/${stageId}/documents/${type}/pdf`, { responseType: 'blob' });
  }

  getMeetingsForStage(stageId: number): Observable<SupervisorMeeting[]> {
    return forkJoin([
      this.http.get<any[]>(`${this.meetingsUrl}/stage/${stageId}`).pipe(catchError(() => of([]))),
      this.http.get<any[]>(`${this.finalMeetingsUrl}/stage/${stageId}`).pipe(catchError(() => of([])))
    ]).pipe(
      map(([weekly, finale]) =>
        this.dedupeMeetings(
          [...(weekly ?? []), ...(finale ?? [])].map((item) => this.normalizeMeeting(item))
        ).sort((a, b) => a.date.localeCompare(b.date))
      )
    );
  }

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

  getUserSignature(userId: number | null): Observable<string> {
    if (!userId) return of('');
    return this.http.get<{ urlSignature?: string }>(`${API_BASE_URL}/utilisateurs/${userId}/signature-collaborateur`).pipe(
      map((raw) => String(raw?.urlSignature ?? '')),
      catchError(() => of(''))
    );
  }

  generateStageDocument(
    stageId: number,
    documentType: 'convention' | 'fiche-evaluation' | 'cahier-stage'
  ): Observable<SupervisorStageDocumentsOverview> {
    return this.http
      .post<any>(`${this.stagesUrl}/${stageId}/documents/${documentType}/generer`, {})
      .pipe(
        map((response) =>
          this.normalizeStageDocumentsOverview(response?.stageDocuments ?? response)
        )
      );
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
    const participantIdsRaw = raw?.participantIds;
    const participantIds = Array.isArray(participantIdsRaw)
      ? participantIdsRaw.map((item: unknown) => Number(item)).filter((id) => Number.isFinite(id) && id > 0)
      : participantIdsRaw && typeof participantIdsRaw === 'object'
        ? Object.values(participantIdsRaw).map((item) => Number(item)).filter((id) => Number.isFinite(id) && id > 0)
        : [];

    return {
      id: Number(raw?.id ?? 0),
      source: resolveMeetingSourceFromApi(raw, 'HEBDOMADAIRE'),
      numReunion: String(raw?.numReunion ?? ''),
      date: normalizeMeetingDate(raw?.date),
      heure: normalizeMeetingHeure(raw?.heure),
      observation: String(raw?.observation ?? ''),
      compteRendu: String(raw?.compteRendu ?? ''),
      stageId: Number(raw?.stageId ?? raw?.stage?.id ?? 0),
      stageTitre: String(raw?.stageTitre ?? ''),
      studentName: String(raw?.stagiaireNom ?? ''),
      companyName: String(raw?.entrepriseNom ?? ''),
      ...pickMeetingCreatorFields(raw),
      companySupervisorName: pickMeetingCompanySupervisorName(raw),
      participantIds,
      participantNames: normalizeParticipantNames(raw?.participantNoms ?? raw?.participantNames),
      note: this.normalizeNullableNumber(raw?.note),
      urlFormSatisfaction: String(raw?.urlFormSatisfaction ?? '')
    };
  }

  private normalizeAgreement(raw: any): SupervisorAgreement {
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
      pretSignatureEncadrantProfessionnel: Boolean(raw?.pretSignatureEncadrantProfessionnel),
      signaturesCompletes: Boolean(raw?.signaturesCompletes),
      complete: Boolean(raw?.complete),
      verrouillee: Boolean(raw?.verrouillee),
      evaluationAccessible: raw?.evaluationAccessible !== false,
      evaluationIndisponibleMessage: String(raw?.evaluationIndisponibleMessage ?? ''),
      notesAttribuees: Array.isArray(raw?.notesAttribuees)
        ? raw.notesAttribuees.map((n: any) => ({
            ficheEvaluationId: this.normalizeNullableNumber(n?.ficheEvaluationId),
            critereEvaluationId: this.normalizeNullableNumber(n?.critereEvaluationId),
            poids: Number(n?.poids ?? 0),
            bareme: Number(n?.bareme ?? 5),
            note: Number(n?.note ?? 0),
            commentaire: String(n?.commentaire ?? ''),
            critereLibelle: String(n?.critereLibelle ?? ''),
            scorePondere: n?.scorePondere != null ? Number(n.scorePondere) : null,
            evaluee: Boolean(n?.evaluee)
          }))
        : []
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
      dateSignatureResponsableUniversitaire: String(raw?.dateSignatureResponsableUniversitaire ?? ''),
      signataires: normalizeDocumentSignatoriesApi(raw?.signataires)
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


  private formatMeetingHeure(heure: string | null | undefined): string {
    let formatted = String(heure ?? '').trim();
    if (formatted && formatted.split(':').length === 2) {
      formatted = `${formatted}:00`;
    }
    return formatted;
  }

  private toMeetingPayload(payload: SupervisorMeetingPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      stageId: Number(payload.stageId),
      date: payload.date,
      heure: this.formatMeetingHeure(payload.heure),
      typeReunion: 'HEBDOMADAIRE',
      compteRendu: payload.compteRendu?.trim() || '',
    };

    if (payload.id) {
      body['id'] = payload.id;
    }
    if (payload.numReunion?.trim()) {
      body['numReunion'] = payload.numReunion.trim();
    }
    return body;
  }

  private normalizeNullableNumber(value: unknown): number | null {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
