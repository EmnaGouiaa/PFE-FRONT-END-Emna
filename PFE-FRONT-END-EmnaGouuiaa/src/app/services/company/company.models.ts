import { Entreprise } from '../entreprises.service';
import { ResponsableEntreprise } from '../responsables-entreprise.service';

export interface CompanyContext {
  userId: number;
  email: string;
  responsable: ResponsableEntreprise;
  entreprise: Entreprise | null;
}

export interface CompanyOffer {
  id: number;
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
  datePublication: string;
  statut: string;
  entrepriseId: number | null;
  entrepriseNom: string;
  publieeParId: number | null;
  valideeParId: number | null;
  motifRefus: string;
  publieeParNomComplet: string;
  valideeParNomComplet: string;
  encadrantProId: number | null;
  encadrantProNomComplet: string;
  stageCree: boolean;
  affectable: boolean;
  /** Affectation active = un etudiant est rattache et le stage n'est pas annule. */
  affectationActive: boolean;
  /** Statut de validation du sujet du stage lie (EN_ATTENTE | VALIDEE | REFUSEE) ou null. */
  statutSujet: string | null;
  /** Date de fin du stage lie (si existant). */
  dateFinStage: string | null;
  /** Vrai si le stage associe est termine (date du jour >= date de fin). */
  stageTermine: boolean;
  /** Annulation affectation autorisee (sujet non valide + debut strictement futur). */
  annulationAffectationAutorisee?: boolean;
}

export interface CompanyOfferPayload {
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
  entrepriseId: number;
  publieeParId?: number | null;
  valideeParId?: number | null;
  encadrantProId?: number | null;
}

export interface CompanyOfferAssignmentPayload {
  emailEtudiant: string;
}

export interface CompanyOfferAssignmentResponse {
  message: string;
  offreId: number;
  offreStatut: string;
  stageId: number;
  stageTitre: string;
  stagiaireId: number;
  stagiaireEmail: string;
}

export interface CompanyOfferCancellationResponse {
  message: string;
  offreId: number;
  offreStatut: string;
  stageId: number;
  stageStatut: string;
  modeAnnulation: string;
}

export interface CompanyInternship {
  id: number;
  titre: string;
  sujet: string;
  dateDebut: string;
  dateFin: string;
  duree: number | null;
  nbSemaine: number | null;
  niveauSouhaite: string;
  statut: string;
  statutSujet: string;
  entrepriseId: number | null;
  stagiaireId: number | null;
  stagiaireNom: string;
  stagiaireEmail: string;
  encadrantAcademiqueNom: string;
  encadrantProfessionnelId: number | null;
  encadrantProfessionnelNom: string;
  tuteurEntrepriseNom: string;
  offreSourceId: number | null;
  conventionId: number | null;
  ficheEvaluationId: number | null;
  trelloBoardUrl: string;
}

export interface ProfessionalSupervisor {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
  service: string;
  entrepriseId: number | null;
  entrepriseNom: string;
}

export interface ProfessionalSupervisorPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste?: string;
  service?: string;
  entrepriseId?: number | null;
}

export interface CompanyMeeting {
  id: number;
  source: 'HEBDOMADAIRE' | 'FINALE';
  numReunion: string;
  date: string;
  heure: string;
  observation: string;
  compteRendu: string;
  stageId: number;
  stageTitre: string;
  stagiaireNom: string;
  entrepriseNom: string;
  typeEncadrantCreateur: string;
  nomEncadrantCreateur: string;
  encadrantCreateurId: number | null;
  companySupervisorName: string;
  participantIds: number[];
  participantNames: string[];
  note: number | null;
  urlFormSatisfaction: string;
}

export interface EvaluationNoteDto {
  ficheEvaluationId?: number | null;
  critereEvaluationId?: number | null;
  poids: number;
  bareme: number;
  note: number;
  commentaire?: string;
  critereLibelle?: string;
  scorePondere?: number | null;
  evaluee?: boolean;
}

export interface CompanyEvaluation {
  id: number;
  stageId: number;
  stageTitre: string;
  reunionFinaleId: number | null;
  pointFortEncadrantPro: string;
  axeAmeliorationEncadrantPro: string;
  pointFortResponsableEntreprise: string;
  axeAmeliorationResponsableEntreprise: string;
  signatureEncadrantProfessionnel: string;
  signatureRepresentantEntreprise: string;
  dateSignatureEncadrantProfessionnel: string;
  dateSignatureRepresentantEntreprise: string;
  noteFinale: number | null;
  donneesCompletes: boolean;
  pretSignatureResponsableEntreprise: boolean;
  signaturesCompletes: boolean;
  complete: boolean;
  verrouillee: boolean;
  evaluationAccessible: boolean;
  evaluationIndisponibleMessage: string;
  notesAttribuees: EvaluationNoteDto[];
}

export interface CompanyEvaluationPayload {
  id?: number;
  stageId: number;
  stageTitre?: string;
  reunionFinaleId?: number | null;
  pointFortEncadrantPro?: string;
  axeAmeliorationEncadrantPro?: string;
  pointFortResponsableEntreprise?: string;
  axeAmeliorationResponsableEntreprise?: string;
  signatureEncadrantProfessionnel?: string;
  signatureRepresentantEntreprise?: string;
  dateSignatureEncadrantProfessionnel?: string;
  dateSignatureRepresentantEntreprise?: string;
  noteFinale?: number | null;
  donneesCompletes?: boolean;
  signaturesCompletes?: boolean;
  complete?: boolean;
  verrouillee?: boolean;
}

export interface CompanyAgreement {
  id: number;
  numConv: number | null;
  dateDebut: string;
  dateFin: string;
  anneeUniversitaire: string;
  signeeEncAca: boolean;
  signeeEncPro: boolean;
  signeeEntreprise: boolean;
  signeeResp: boolean;
  signeeStagiaire: boolean;
  statutSignatures: boolean;
  stageId: number;
  stageTitre: string;
  demandeStageId: number | null;
}

export interface CompanyValidationItem {
  key: string;
  type: string;
  title: string;
  description: string;
  status: string;
  pending: boolean;
  itemId: number;
  stageId: number;
  relatedEntityId: number | null;
  stageTitle: string;
  studentName: string;
  companyName: string;
  dateDebut: string;
  dateFin: string;
}

export interface CompanyAbsence {
  id: number;
  dateAbsence: string;
  nbAbsence: number;
  justification: string;
  commentaire: string;
  statut: string;
  stageId: number;
  stageTitre: string;
}

export interface CompanyAbsencePayload {
  dateAbsence: string;
  nbAbsence?: number | null;
  justification: string;
  commentaire?: string;
  statut?: string;
  stageId: number;
}
