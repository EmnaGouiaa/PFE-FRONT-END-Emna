/**
 * Détermine si la période d'accès à l'évaluation / à l'enquête est ouverte
 * pour un stage donné.
 *
 * Règle métier :
 *   sysdate >= dateRéunionFinale  OU  sysdate >= dateFinStage
 *
 * Si aucune des deux dates n'est fournie, la période est considérée fermée.
 *
 * @param dateFin             Date de fin du stage (format ISO "YYYY-MM-DD").
 * @param dateRéunionFinale   Date de la réunion finale (format ISO "YYYY-MM-DD"), peut être null.
 */
export function isStagePeriodOpen(
  dateFin: string | null | undefined,
  dateRéunionFinale: string | null | undefined
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateRéunionFinale) {
    const rf = new Date(dateRéunionFinale);
    rf.setHours(0, 0, 0, 0);
    if (!isNaN(rf.getTime()) && today >= rf) {
      return true;
    }
  }

  if (dateFin) {
    const fin = new Date(dateFin);
    fin.setHours(0, 0, 0, 0);
    if (!isNaN(fin.getTime()) && today >= fin) {
      return true;
    }
  }

  return false;
}

/**
 * Retourne la date d'ouverture la plus proche (réunion finale ou fin du stage),
 * ou null si aucune date n'est disponible.
 *
 * Utile pour afficher "Disponible à partir du XX/XX/XXXX".
 */
export function getStagePeriodOpenDate(
  dateFin: string | null | undefined,
  dateRéunionFinale: string | null | undefined
): Date | null {
  const candidates: Date[] = [];

  if (dateRéunionFinale) {
    const rf = new Date(dateRéunionFinale);
    if (!isNaN(rf.getTime())) candidates.push(rf);
  }

  if (dateFin) {
    const fin = new Date(dateFin);
    if (!isNaN(fin.getTime())) candidates.push(fin);
  }

  if (!candidates.length) return null;
  return candidates.reduce((min, d) => (d < min ? d : min));
}
