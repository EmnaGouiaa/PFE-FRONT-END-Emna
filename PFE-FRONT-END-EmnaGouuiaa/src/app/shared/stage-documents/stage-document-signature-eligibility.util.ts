import {

  isEvaluationAccessible,

  resolveStageEndDateIso,

} from '../../services/stage-period.utils';



export const LOGBOOK_SIGN_BEFORE_END_MESSAGE =

  "La signature du cahier de stage n'est autorisée qu'après la date de fin du stage.";



export const CONVENTION_NOT_GENERATED_MESSAGE =

  'La convention doit être générée avant la signature.';



export const CONVENTION_STAGE_UPCOMING_MESSAGE =

  "La signature de la convention n'est pas disponible tant que le stage est à venir.";



export const CONVENTION_STAGE_NOT_ONGOING_MESSAGE =

  "La signature de la convention n'est disponible que pour un stage en cours ou terminé.";



const CONVENTION_SIGNATORY_ROLES = [

  'STAGIAIRE',

  'ENCADRANT_ACADEMIQUE',

  'ENCADRANT_PROFESSIONNEL',

  'RESPONSABLE_ENTREPRISE',

  'RESPONSABLE_UNIVERSITAIRE',

] as const;



function normalizeStageStatut(stageStatut?: string | null): string {

  return String(stageStatut ?? '').trim().toUpperCase();

}



/**

 * Convention signable uniquement si le stage est EN_COURS ou TERMINE.

 */

export function isConventionSigningPermitted(params: {

  stageStatut?: string | null;

  dateDebut?: string | null;

  allSignaturesComplete?: boolean;

}): boolean {

  const statut = normalizeStageStatut(params.stageStatut);



  if (statut === 'REFUSE' || statut === 'ANNULE') {

    return false;

  }



  if (params.allSignaturesComplete === true) {

    return false;

  }



  return statut === 'EN_COURS' || statut === 'TERMINE';

}



export function areAllConventionSignatoriesSigned(

  signataires?: { role?: string; signe?: boolean }[] | null

): boolean {

  const list = signataires ?? [];

  if (!list.length) {

    return false;

  }

  return CONVENTION_SIGNATORY_ROLES.every((role) =>

    list.some(

      (entry) => String(entry.role ?? '').trim().toUpperCase() === role && entry.signe === true

    )

  );

}



export function canSignConvention(params: {

  conventionId?: number | null;

  documentId?: number | null;

  alreadySigned?: boolean;

  stageStatut?: string | null;

  dateDebut?: string | null;

  allSignaturesComplete?: boolean;

}): boolean {

  if (params.alreadySigned) {

    return false;

  }

  const id = params.conventionId ?? params.documentId;

  if (id == null || id <= 0) {

    return false;

  }

  return isConventionSigningPermitted({

    stageStatut: params.stageStatut,

    dateDebut: params.dateDebut,

    allSignaturesComplete: params.allSignaturesComplete,

  });

}



export function getConventionSignBlockedReason(params: {

  conventionId?: number | null;

  documentId?: number | null;

  stageStatut?: string | null;

  dateDebut?: string | null;

  allSignaturesComplete?: boolean;

}): string {

  const id = params.conventionId ?? params.documentId;

  if (id == null || id <= 0) {

    return CONVENTION_NOT_GENERATED_MESSAGE;

  }

  if (params.allSignaturesComplete === true) {

    return 'La convention est déjà entièrement signée.';

  }



  const statut = normalizeStageStatut(params.stageStatut);

  if (statut === 'A_VENIR' || statut === 'PAS_COMMENCE') {

    return CONVENTION_STAGE_UPCOMING_MESSAGE;

  }

  if (statut === 'REFUSE' || statut === 'ANNULE') {

    return "La convention n'est pas disponible pour un stage refusé ou annulé.";

  }

  if (!isConventionSigningPermitted(params)) {

    return CONVENTION_STAGE_NOT_ONGOING_MESSAGE;

  }

  return '';

}



export function isStageEndDateReached(

  dateFin?: string | null,

  dateDebut?: string | null,

  dureeMonths?: number | null

): boolean {

  const fin = resolveStageEndDateIso(dateDebut, dateFin, dureeMonths);

  return isEvaluationAccessible(null, fin);

}



export function canShowLogbookSignButton(hasDocument: boolean): boolean {

  return hasDocument;

}



export function canSignLogbook(params: {

  dateFin?: string | null;

  dateDebut?: string | null;

  dureeMonths?: number | null;

  alreadySigned: boolean;

  hasDocument: boolean;

}): boolean {

  if (!params.hasDocument || params.alreadySigned) {

    return false;

  }

  return isStageEndDateReached(params.dateFin, params.dateDebut, params.dureeMonths);

}



export function getLogbookSignBlockedReason(

  dateFin?: string | null,

  dateDebut?: string | null,

  dureeMonths?: number | null

): string {

  if (isStageEndDateReached(dateFin, dateDebut, dureeMonths)) {

    return '';

  }

  return LOGBOOK_SIGN_BEFORE_END_MESSAGE;

}


