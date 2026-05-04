import { DemandeStage } from './demande-stage.model';

export enum StatutConvention {
  GENEREE = 'GENEREE',
  PARTIELLEMENT_SIGNEE = 'PARTIELLEMENT_SIGNEE',
  ENTIEREMENT_SIGNEE = 'ENTIEREMENT_SIGNEE'
}

export enum RoleSignataire {
  ETUDIANT = 'ETUDIANT',
  ENCADRANT_PRO = 'ENCADRANT_PRO',
  ENCADRANT_ACADEMIQUE = 'ENCADRANT_ACADEMIQUE',
  AGENT_STAGE = 'AGENT_STAGE',
  ENTREPRISE = 'ENTREPRISE'
}

export interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
}

export interface SignatureConvention {
  id: number;
  roleSignataire: RoleSignataire;
  utilisateurSignataire: Utilisateur;
  signeLe?: string;
  estSigne: boolean;
  jetonSignature?: string;
}

export interface ConventionStage {
  id: number;
  demandeStage: DemandeStage;
  cheminPdf: string;
  genereLe: string;
  statut: StatutConvention;
  signatures: SignatureConvention[];
}
