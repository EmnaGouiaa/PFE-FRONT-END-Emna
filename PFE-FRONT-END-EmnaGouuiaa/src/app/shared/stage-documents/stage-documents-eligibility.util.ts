/** Un stage refuse n'apparait pas dans la section « Documents de stage ». */
export function isStageEligibleForStageDocuments(statut: string | null | undefined): boolean {
  return String(statut ?? '').trim().toUpperCase() !== 'REFUSE';
}

export function filterInternshipsForStageDocuments<T extends { statut?: string | null }>(
  internships: T[]
): T[] {
  return internships.filter((item) => isStageEligibleForStageDocuments(item.statut));
}

export function filterStageDocumentsOverviews<T extends { stageStatut?: string | null; statut?: string | null }>(
  overviews: T[]
): T[] {
  return overviews.filter((item) =>
    isStageEligibleForStageDocuments(item.stageStatut ?? item.statut)
  );
}
