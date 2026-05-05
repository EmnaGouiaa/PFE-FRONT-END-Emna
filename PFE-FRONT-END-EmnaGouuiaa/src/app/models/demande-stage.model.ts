export enum StatutDemande {
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVEE_ADMIN = 'APPROUVEE_ADMIN',
  APPROUVEE_ENCADRANT = 'APPROUVEE_ENCADRANT',
  APPROUVEE = 'APPROUVEE',
  REJETEE = 'REJETEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  APPROUVEE_ACADEMIQUE = 'APPROUVEE_ACADEMIQUE',
  OFFICIELLE = 'OFFICIELLE',
  REJETEE_ADMIN = 'REJETEE_ADMIN'
}

export enum StatutValidation {
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVEE = 'APPROUVEE',
  REJETEE = 'REJETEE'
}

export interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
}

export interface DemandeStage {
  id: number;
  // Backend payloads can omit nested user objects depending on projection/serialization.
  etudiant?: Utilisateur | null;
  nomEntreprise: string;
  adresseEntreprise: string;
  telephoneEntreprise?: string;
  emailEntreprise?: string;
  nomEncadrant: string;
  emailEncadrant: string;
  telephoneEncadrant?: string;
  posteEncadrant?: string;
  sujetStage: string;
  descriptionStage?: string;
  dateDebut?: string;
  dateFin?: string;
  statut: StatutDemande;
  
  // Champs de validation
  statutValidationAdmin: StatutValidation;
  // Present in the backend workflow endpoints; optional to keep compatibility with older payloads.
  statutValidationResponsableStages?: StatutValidation;
  statutValidationEncadrant: StatutValidation;
  statutValidationAcademique: StatutValidation;
  
  dateValidationAdmin?: string;
  dateValidationResponsableStages?: string;
  dateValidationEncadrant?: string;
  dateValidationAcademique?: string;
  
  commentaireAdmin?: string;
  commentaireResponsableStages?: string;
  valideeAdminLe?: string;
  agentAdmin?: Utilisateur;
  
  commentairesAcademiques?: string;
  valideeParEncadrantAcademique?: Utilisateur;
  
  creeLe: string;
  misAJourLe?: string;
}
