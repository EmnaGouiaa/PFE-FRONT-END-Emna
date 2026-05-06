export type SupervisorRole = 'ENCADRANT_PROFESSIONNEL' | 'ENCADRANT_ACADEMIQUE';

export interface SupervisorUserRef {
  id: number | null;
  fullName: string;
  email: string;
  secondary: string;
}

export interface SupervisorCompanyRef {
  id: number | null;
  nom: string;
  email: string;
  telephone: string;
  secteurActivite: string;
}

export interface SupervisorInternship {
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
  trelloBoardUrl: string;
  conventionId: number | null;
  ficheEvaluationId: number | null;
  student: SupervisorUserRef;
  company: SupervisorCompanyRef;
  academicSupervisor: SupervisorUserRef;
  professionalSupervisor: SupervisorUserRef;
  companySupervisor: SupervisorUserRef;
}

export interface SupervisorMeeting {
  id: number;
  source: 'HEBDOMADAIRE' | 'FINALE';
  numReunion: string;
  date: string;
  heure: string;
  observation: string;
  compteRendu: string;
  stageId: number;
  stageTitre: string;
  studentName: string;
  companyName: string;
  typeEncadrantCreateur: string;
  nomEncadrantCreateur: string;
  participantIds: number[];
  note: number | null;
  urlFormEvaluation: string;
  urlFormSatisfaction: string;
}

export interface SupervisorMeetingPayload {
  id?: number;
  numReunion?: string;
  date: string;
  heure: string;
  observation: string;
  compteRendu?: string;
  stageId: number;
  participantIds?: number[];
}

export interface SupervisorAgreement {
  id: number;
  numConv: number | null;
  dateDebut: string;
  dateFin: string;
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

export interface SupervisorLogbook {
  id: number;
  dateGeneration: string;
  dateSignature: string;
  estSigne: boolean;
  signeeEncAcad: boolean;
  signeeEncPro: boolean;
  signeeRespEntreprise: boolean;
  signeeStagiaire: boolean;
  stageId: number;
  stageTitre: string;
}

export interface SupervisorEvaluation {
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
  signaturesCompletes: boolean;
  complete: boolean;
  verrouillee: boolean;
}

export interface SupervisorStageDocumentStatus {
  code: string;
  libelle: string;
  documentId: number | null;
  disponible: boolean;
  genere: boolean;
  generationAutorisee: boolean;
  statut: string;
  raisonAbsence: string;
  signeeParResponsableUniversitaire: boolean;
  dateSignatureResponsableUniversitaire: string;
}

export interface SupervisorStageDocumentsOverview {
  stageId: number;
  stageTitre: string;
  stageStatut: string;
  stagiaireNom: string;
  entrepriseNom: string;
  encadrantAcademiqueNom: string;
  encadrantProfessionnelNom: string;
  convention: SupervisorStageDocumentStatus | null;
  ficheEvaluation: SupervisorStageDocumentStatus | null;
  cahierStage: SupervisorStageDocumentStatus | null;
}

export interface SupervisorTrelloSummary {
  stageId: number;
  titreStage: string;
  trelloBoardUrl: string;
  nombreTotalTaches: number;
  nombreTachesAFaire: number;
  nombreTachesEnCours: number;
  nombreTachesTerminees: number;
  tachesAFaire: unknown[];
  tachesEnCours: unknown[];
  tachesTerminees: unknown[];
}
