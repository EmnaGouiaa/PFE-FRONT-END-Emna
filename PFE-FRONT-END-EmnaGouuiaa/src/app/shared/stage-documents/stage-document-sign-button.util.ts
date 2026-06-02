import {
  areAllConventionSignatoriesSigned,
  canSignConvention,
  canSignLogbook,
  getConventionSignBlockedReason,
  getLogbookSignBlockedReason,
} from './stage-document-signature-eligibility.util';
import { StageDocumentSignatoriesSource } from './stage-document-signatures.util';

export type StageDocumentSignType = 'convention' | 'fiche-evaluation' | 'cahier-stage';

/** Rôles signataires alignés sur le backend (RoleSignature). */
export type StageSignatoryRole =
  | 'STAGIAIRE'
  | 'ENCADRANT_ACADEMIQUE'
  | 'ENCADRANT_PROFESSIONNEL'
  | 'RESPONSABLE_ENTREPRISE'
  | 'RESPONSABLE_UNIVERSITAIRE';

const CONVENTION_SIGNATORIES: StageSignatoryRole[] = [
  'STAGIAIRE',
  'ENCADRANT_ACADEMIQUE',
  'ENCADRANT_PROFESSIONNEL',
  'RESPONSABLE_ENTREPRISE',
  'RESPONSABLE_UNIVERSITAIRE',
];

const LOGBOOK_SIGNATORIES: StageSignatoryRole[] = [
  'STAGIAIRE',
  'ENCADRANT_ACADEMIQUE',
  'ENCADRANT_PROFESSIONNEL',
  'RESPONSABLE_ENTREPRISE',
];

const EVALUATION_SIGNATORIES: StageSignatoryRole[] = [
  'ENCADRANT_PROFESSIONNEL',
  'RESPONSABLE_ENTREPRISE',
];

export interface StageDocumentSignButtonContext {
  documentType: StageDocumentSignType;
  /** Rôle applicatif (STAGIAIRE, ENCADRANT_ACADEMIQUE, RESPONSABLE_STAGE, …). */
  userRole: string | null | undefined;
  status?: StageDocumentSignatoriesSource;
  documentId?: number | null;
  /** Identifiant convention (prioritaire sur documentId pour le type convention). */
  conventionId?: number | null;
  /** Déjà signé par l'utilisateur connecté (convention / cahier / fiche). */
  alreadySignedByMe?: boolean;
  dateFin?: string | null;
  dateDebut?: string | null;
  dureeMonths?: number | null;
  /** Fiche d'évaluation : partie métier complète avant signature (resp. entreprise). */
  evaluationReadyForSign?: boolean;
  /** Statut métier du stage (ex. EN_COURS) — requis pour signer la convention. */
  stageStatut?: string | null;
  /**
   * Si {@code false}, aucun contrôle signature n'est affiché (ex. cahier non soumis).
   * Par défaut {@code true} pour les signataires attendus.
   */
  signActionVisible?: boolean;
  isActing?: boolean;
  /** Statut API : generation autorisee (convention absente mais initialisable). */
  generationAutorisee?: boolean;
}

export function shouldShowConventionInitializeButton(
  ctx: Pick<StageDocumentSignButtonContext, 'documentType' | 'conventionId' | 'documentId' | 'generationAutorisee'>
): boolean {
  if (ctx.documentType !== 'convention' || ctx.generationAutorisee !== true) {
    return false;
  }
  const id = ctx.conventionId ?? ctx.documentId;
  return id == null || id <= 0;
}

export function mapAppRoleToSignatoryRole(userRole: string | null | undefined): StageSignatoryRole | null {
  const role = String(userRole ?? '').trim().toUpperCase();
  switch (role) {
    case 'STAGIAIRE':
      return 'STAGIAIRE';
    case 'ENCADRANT_ACADEMIQUE':
      return 'ENCADRANT_ACADEMIQUE';
    case 'ENCADRANT_PROFESSIONNEL':
      return 'ENCADRANT_PROFESSIONNEL';
    case 'RESPONSABLE_ENTREPRISE':
      return 'RESPONSABLE_ENTREPRISE';
    case 'RESPONSABLE_STAGE':
      return 'RESPONSABLE_UNIVERSITAIRE';
    default:
      return null;
  }
}

function signatoriesForDocumentType(documentType: StageDocumentSignType): StageSignatoryRole[] {
  switch (documentType) {
    case 'convention':
      return CONVENTION_SIGNATORIES;
    case 'cahier-stage':
      return LOGBOOK_SIGNATORIES;
    case 'fiche-evaluation':
      return EVALUATION_SIGNATORIES;
  }
}

export function isSignatoryRoleForDocument(
  documentType: StageDocumentSignType,
  userRole: string | null | undefined
): boolean {
  const signatory = mapAppRoleToSignatoryRole(userRole);
  return signatory != null && signatoriesForDocumentType(documentType).includes(signatory);
}

/** Alias explicite : l'utilisateur connecté est un signataire attendu pour ce type de document. */
export function isUserExpectedSignatoryForStageDocument(
  ctx: Pick<StageDocumentSignButtonContext, 'documentType' | 'userRole'>
): boolean {
  return isSignatoryRoleForDocument(ctx.documentType, ctx.userRole);
}

export const STAGE_DOCUMENT_SIGNED_STATUS_LABEL = 'Signé';

/** Vrai si l'utilisateur connecté a déjà signé ce document (flags métier ou statut API). */
export function hasUserSignedStageDocument(ctx: StageDocumentSignButtonContext): boolean {
  if (!isUserExpectedSignatoryForStageDocument(ctx)) {
    return false;
  }
  if (ctx.alreadySignedByMe === true) {
    return true;
  }
  const signatoryRole = mapAppRoleToSignatoryRole(ctx.userRole);
  return signatoryRole != null && isAlreadySignedViaStatus(ctx.status ?? null, signatoryRole);
}

function isSignActionVisible(ctx: StageDocumentSignButtonContext): boolean {
  return ctx.signActionVisible !== false;
}

/** Afficher le bouton d'action « Signer » (signataire, pas encore signé). */
export function shouldShowStageDocumentSignButton(ctx: StageDocumentSignButtonContext): boolean {
  return (
    isSignActionVisible(ctx) &&
    isUserExpectedSignatoryForStageDocument(ctx) &&
    !hasUserSignedStageDocument(ctx)
  );
}

/** Afficher le statut « Signé » à la place du bouton (signataire déjà signé). */
export function shouldShowStageDocumentSignedStatus(ctx: StageDocumentSignButtonContext): boolean {
  return (
    isSignActionVisible(ctx) &&
    isUserExpectedSignatoryForStageDocument(ctx) &&
    hasUserSignedStageDocument(ctx)
  );
}

function isAlreadySignedViaStatus(
  status: StageDocumentSignatoriesSource,
  signatoryRole: StageSignatoryRole
): boolean {
  const entry = status?.signataires?.find(
    (s) => String(s.role ?? '').toUpperCase() === signatoryRole
  );
  return entry?.signe === true;
}

/**
 * {@code true} si l'utilisateur peut déclencher la signature maintenant (backend + règles métier).
 */
export function resolveConventionDocumentId(ctx: StageDocumentSignButtonContext): number | null {
  const raw = ctx.conventionId ?? ctx.documentId;
  return raw != null && raw > 0 ? raw : null;
}

export function canUserSignStageDocument(ctx: StageDocumentSignButtonContext): boolean {
  if (!shouldShowStageDocumentSignButton(ctx)) {
    return false;
  }

  if (ctx.documentType === 'convention') {
    return canSignConvention({
      conventionId: ctx.conventionId,
      documentId: ctx.documentId,
      alreadySigned: false,
      stageStatut: ctx.stageStatut,
      dateDebut: ctx.dateDebut,
      allSignaturesComplete: areAllConventionSignatoriesSigned(ctx.status?.signataires),
    });
  }

  if (!ctx.documentId) {
    return false;
  }

  if (ctx.documentType === 'cahier-stage') {
    return canSignLogbook({
      dateFin: ctx.dateFin,
      dateDebut: ctx.dateDebut,
      dureeMonths: ctx.dureeMonths,
      alreadySigned: false,
      hasDocument: true,
    });
  }

  if (ctx.documentType === 'fiche-evaluation') {
    return ctx.evaluationReadyForSign === true;
  }

  return true;
}

export function isStageDocumentSignButtonDisabled(ctx: StageDocumentSignButtonContext): boolean {
  return Boolean(ctx.isActing) || !canUserSignStageDocument(ctx);
}

export function getStageDocumentSignButtonLabel(ctx: StageDocumentSignButtonContext): string {
  if (ctx.documentType === 'convention') {
    return 'Signer la convention';
  }
  if (ctx.documentType === 'cahier-stage') {
    return 'Signer le cahier';
  }
  if (ctx.documentType === 'fiche-evaluation') {
    return "Signer la fiche";
  }
  return 'Signer';
}

export function getStageDocumentSignButtonTooltip(ctx: StageDocumentSignButtonContext): string {
  if (!shouldShowStageDocumentSignButton(ctx)) {
    if (shouldShowStageDocumentSignedStatus(ctx)) {
      return 'Vous avez déjà signé ce document.';
    }
    return '';
  }
  if (ctx.documentType === 'convention') {
    const reason = getConventionSignBlockedReason({
      conventionId: ctx.conventionId,
      documentId: ctx.documentId,
      stageStatut: ctx.stageStatut,
      dateDebut: ctx.dateDebut,
      allSignaturesComplete: areAllConventionSignatoriesSigned(ctx.status?.signataires),
    });
    if (reason) {
      return reason;
    }
    return 'Signer la convention de stage';
  }
  if (!ctx.documentId) {
    return 'Le document doit être généré avant la signature.';
  }
  if (ctx.documentType === 'cahier-stage') {
    const reason = getLogbookSignBlockedReason(ctx.dateFin, ctx.dateDebut, ctx.dureeMonths);
    return reason || 'Signer le cahier de stage';
  }
  if (ctx.documentType === 'fiche-evaluation') {
    if (ctx.evaluationReadyForSign !== true) {
      return "Complétez la fiche d'évaluation avant de signer.";
    }
    return "Signer la fiche d'évaluation";
  }
  return 'Signer';
}

export function getStageDocumentSignedStatusTooltip(ctx: StageDocumentSignButtonContext): string {
  return shouldShowStageDocumentSignedStatus(ctx)
    ? 'Vous avez déjà signé ce document.'
    : '';
}
