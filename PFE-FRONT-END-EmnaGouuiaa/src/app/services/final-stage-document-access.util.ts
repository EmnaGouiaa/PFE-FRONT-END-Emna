/** Statut document stage tel que renvoyé par GET /api/stages/{id}/documents. */
export interface FinalStageDocumentStatus {
  disponible?: boolean;
  raisonAbsence?: string;
}

export type StageDocumentPdfStatus = FinalStageDocumentStatus;

/** PDF (convention, cahier, fiche) : accessible uniquement si le backend indique disponible = true. */
export function canAccessStageDocumentPdf(
  status: FinalStageDocumentStatus | null | undefined
): boolean {
  return Boolean(status?.disponible);
}

export function getStageDocumentPdfBlockReason(
  status: FinalStageDocumentStatus | null | undefined,
  fallbackMessage = 'Ce document PDF n\'est pas encore accessible.'
): string {
  if (!status) {
    return 'Les informations de disponibilité du document n\'ont pas pu être chargées. Actualisez la page.';
  }
  if (status.disponible) {
    return '';
  }
  const reason = status.raisonAbsence?.trim();
  if (reason) {
    return reason;
  }
  return fallbackMessage;
}

/** PDF cahier ou fiche de fin de stage. */
export function canAccessFinalStagePdf(
  status: FinalStageDocumentStatus | null | undefined
): boolean {
  return canAccessStageDocumentPdf(status);
}

export function getFinalPdfBlockReason(
  status: FinalStageDocumentStatus | null | undefined
): string {
  return getStageDocumentPdfBlockReason(
    status,
    'Le PDF est accessible uniquement après toutes les signatures obligatoires et la date de fin du stage.'
  );
}

/** Cahier de stage — mêmes règles que les autres documents de fin de stage. */
export function getLogbookPdfBlockReason(
  status: FinalStageDocumentStatus | null | undefined
): string {
  return getFinalPdfBlockReason(status);
}

export function getConventionPdfBlockReason(
  status: FinalStageDocumentStatus | null | undefined
): string {
  return getStageDocumentPdfBlockReason(
    status,
    'La convention PDF est accessible lorsque le sujet est validé et toutes les signatures sont complètes.'
  );
}
