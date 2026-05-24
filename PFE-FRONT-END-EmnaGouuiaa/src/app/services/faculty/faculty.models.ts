export interface FacultyUserRef {
  id: number | null;
  fullName: string;
  email: string;
  secondary: string;
}

export interface FacultyCompanyRef {
  id: number | null;
  nom: string;
  email: string;
  telephone: string;
  secteurActivite: string;
}

export interface FacultyInternship {
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
  stageRequestId: number | null;
  student: FacultyUserRef;
  company: FacultyCompanyRef;
  academicSupervisor: FacultyUserRef;
  professionalSupervisor: FacultyUserRef;
  companySupervisor: FacultyUserRef;
}

export interface FacultyAcademicSupervisor {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  grade: string;
  matricule: string;
  specialite: string;
}

export interface FacultyStudentAssignment {
  id: number;
  fullName: string;
  email: string;
  matricule: string;
  filiereNom: string;
  niveau: number | null;
  academicSupervisor: FacultyUserRef;
  activeStageId: number | null;
  activeStageTitle: string;
  activeStageStatus: string;
  hasActiveStage: boolean;
}

export interface FacultyAcademicSupervisorAssignmentResult {
  message: string;
  student: FacultyStudentAssignment;
}

export interface FacultyMeeting {
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
  participantIds: number[];
  note: number | null;
  urlFormSatisfaction: string;
  titreEnqueteSatisfaction: string;
  descriptionEnqueteSatisfaction: string;
}

export interface FacultyAgreement {
  id: number;
  numConv: number | null;
  dateDebut: string;
  dateFin: string;
  anneeUniversitaire: string;
  signeeEncAca: boolean;
  signeeEncPro: boolean;
  signeeEntreprise: boolean;
  signeeResp: boolean;
  dateSignatureResponsableUniversitaire: string;
  signeeStagiaire: boolean;
  statutSignatures: boolean;
  stageId: number;
  stageTitre: string;
  demandeStageId: number | null;
}

export interface FacultyEvaluation {
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

export interface FacultyReport {
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

/**
 * Cycle de vie du document, calculé automatiquement à partir des signatures.
 * Aucune validation manuelle du responsable des stages n'est requise.
 */
export type StatutDocument =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURES'
  | 'SIGNATURES_COMPLETES'
  | 'DISPONIBLE_IMPRESSION';

export interface FacultyStageDocumentStatus {
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

export interface FacultyStageDocumentsOverview {
  stageId: number;
  stageTitre: string;
  stageStatut: string;
  dateDebut: string;
  dateFin: string;
  stagiaireNom: string;
  entrepriseNom: string;
  encadrantAcademiqueNom: string;
  encadrantProfessionnelNom: string;
  convention: FacultyStageDocumentStatus | null;
  ficheEvaluation: FacultyStageDocumentStatus | null;
  cahierStage: FacultyStageDocumentStatus | null;
}

export interface FacultyStageDocumentActionResult {
  message: string;
  stageDocuments: FacultyStageDocumentsOverview;
}

export interface FacultyOffer {
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
  publieeParId: number | null;
  publieeParNomComplet: string;
  valideeParId: number | null;
  valideeParNomComplet: string;
  stageCree: boolean;
  affectable: boolean;
}
