/**
 * Nombre de jours après la date de fin du stage pendant lesquels l'enquête
 * de satisfaction reste accessible.  dateFin = jour 1, donc la fenêtre est
 * dateFin … dateFin + 6 = 7 jours au total.
 * Doit rester synchronisé avec FENETRE_ENQUETE_JOURS dans EnqueteSatisfactionServiceImpl.
 */
export const ENQUETE_FENETRE_JOURS = 6;

/**
 * Détermine si la fenêtre d'accès à l'enquête de satisfaction est expirée
 * pour un stage donné.
 *
 * Règle : today > dateFin + ENQUETE_FENETRE_JOURS  →  fenêtre expirée.
 *
 * @param dateFin  Date de fin du stage au format ISO "YYYY-MM-DD".
 */
export function isEnqueteWindowExpired(
  dateFin: string | null | undefined
): boolean {
  if (!dateFin) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fin = new Date(dateFin);
  fin.setHours(0, 0, 0, 0);
  if (isNaN(fin.getTime())) return false;
  const deadline = new Date(fin);
  deadline.setDate(deadline.getDate() + ENQUETE_FENETRE_JOURS);
  // strictement supérieur : le jour deadline lui-même est encore dans la fenêtre
  return today > deadline;
}

// ─────────────────────────────────────────────────────────────────────────────

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
