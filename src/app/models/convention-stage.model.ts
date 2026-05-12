export interface ConventionStage {
  id: number;
  numConv: number | null;
  dateDebut: string;
  dateFin: string;
  signeeEncAca: boolean;
  signeeEncPro: boolean;
  signeeEntreprise: boolean;
  signeeResp: boolean;
  dateSignatureResponsableUniversitaire?: string;
  nomResponsableUniversitaireSignataire?: string;
  signeeStagiaire: boolean;
  statutSignatures: boolean;
  stageId: number;
  stageTitre: string;
  demandeStageId: number | null;
}
