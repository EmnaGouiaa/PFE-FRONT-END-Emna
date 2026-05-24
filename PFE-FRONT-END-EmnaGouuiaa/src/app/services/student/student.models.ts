export interface StudentProfile {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  actif: boolean;
  nomFichierSignature: string;
  role: string;
  matricule: string;
  dateNaiss: string;
  filiereId: number | null;
  filiereNom: string;
  niveau: number | null;
}

export interface StudentProfileUpdateRequest {
  nom: string;
  prenom: string;
  telephone?: string;
  adresse?: string;
  matricule?: string;
  dateNaiss?: string;
  nomFichierSignature?: string;
}

export interface StudentOffer {
  id: number;
  titre: string;
  descriptionMissions: string;
  duree: number | null;
  profilRecherche: string;
  dateDebutPrevue: string;
  datePublication: string;
  statut: string;
  motifRefus: string;
  entrepriseId: number | null;
  entrepriseNom: string;
  stageCree: boolean;
  affectable: boolean;
}

export interface StudentCompanyRequest {
  id: number;
  statut: string;
  creeLe: string;
  misAJourLe: string;
  dateDemande: string;
  nomEntreprise: string;
  emailEntreprise: string;
  telephoneEntreprise: string;
  adresse: string;
  secteurActivite: string;
  nomResponsable: string;
  prenomResponsable: string;
  emailResponsable: string;
  telephoneResponsable: string;
  statutAdmin: string;
  statutResponsableStages: string;
  commentaireAdmin: string;
  commentaireResponsableStages: string;
}

export interface StudentUserRef {
  id: number | null;
  fullName: string;
  email: string;
  secondary: string;
}

export interface StudentCompanyRef {
  id: number | null;
  nom: string;
  email: string;
  telephone: string;
  secteurActivite: string;
}

export interface StudentInternship {
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
  reportId: number | null;
  student: StudentUserRef;
  company: StudentCompanyRef;
  academicSupervisor: StudentUserRef;
  professionalSupervisor: StudentUserRef;
  companySupervisor: StudentUserRef;
}

export interface StudentMeeting {
  id: number;
  source: 'HEBDOMADAIRE' | 'FINALE';
  numReunion: string;
  date: string;
  heure: string;
  observation: string;
  compteRendu: string;
  stageId: number;
  stageTitre: string;
  stagiaireNom?: string;
  entrepriseNom?: string;
  typeEncadrantCreateur: string;
  nomEncadrantCreateur: string;
  encadrantCreateurId: number | null;
  participantIds: number[];
  note: number | null;
  urlFormSatisfaction: string;
}

export interface StudentAgreement {
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
}

export interface StudentReport {
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

export interface StudentTrelloSummary {
  stageId: number;
  titreStage: string;
  sujet: string;
  trelloBoardUrl: string;
  nombreTotalTaches: number;
  nombreTachesAFaire: number;
  nombreTachesEnCours: number;
  nombreTachesTerminees: number;
  tachesAFaire: unknown[];
  tachesEnCours: unknown[];
  tachesTerminees: unknown[];
}

export interface StudentTrelloBoardInfo {
  stageId: number;
  trelloBoardId: string;
  trelloBoardUrl: string;
  trelloTodoListId: string;
  trelloDoingListId: string;
  trelloDoneListId: string;
  created: boolean;
}

export interface StudentStageDocumentAction {
  stageId: number;
  documentType: string;
  documentId: number | null;
  message: string;
  generatedAt: string;
}

/**
 * Cycle de vie du document, calculé automatiquement à partir des signatures.
 * Aucune validation manuelle du responsable des stages n'est requise.
 */
export type StatutDocument =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURES'
  | 'SIGNATURES_COMPLETES'
  | 'DISPONIBLE_IMPRESSION';

export interface StudentStageDocumentStatus {
  code: string;
  libelle: string;
  documentId: number | null;
  /** true uniquement si toutes les signatures obligatoires sont présentes — calcul automatique. */
  disponible: boolean;
  genere: boolean;
  generationAutorisee: boolean;
  statut: string;
  /** Message explicatif affiché quand disponible = false. */
  raisonAbsence: string;
  signeeParResponsableUniversitaire: boolean;
  dateSignatureResponsableUniversitaire: string;
  /** Cycle de vie typé du document, calculé automatiquement. */
  statutDocument: StatutDocument | null;
}

export interface StudentStageDocumentsOverview {
  stageId: number;
  stageTitre: string;
  stageStatut: string;
  stagiaireNom: string;
  entrepriseNom: string;
  encadrantAcademiqueNom: string;
  encadrantProfessionnelNom: string;
  convention: StudentStageDocumentStatus | null;
  ficheEvaluation: StudentStageDocumentStatus | null;
  cahierStage: StudentStageDocumentStatus | null;
}

export interface StudentEvaluation {
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

export interface StudentCompanyRequestPayload {
  stagiaireId: number;
  nomEntreprise: string;
  emailEntreprise: string;
  telephoneEntreprise: string;
  adresse: string;
  secteurActivite: string;
  nomResponsable: string;
  prenomResponsable: string;
  emailResponsable: string;
  telephoneResponsable: string;
}
