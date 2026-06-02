import { calculateStageEndDate } from '../shared/validators/stage-period.validation';

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

export const EVALUATION_UNAVAILABLE_MESSAGE =
  "La fiche d'évaluation sera disponible après la fin du stage.";

/**
 * La fiche d'évaluation est accessible à partir de la date de fin du stage inclus
 * ({@code date du jour >= dateFinStage}). Aligné sur {@code EvaluationStageAccessRules}.
 */
export function isEvaluationAccessible(
  _stageStatut: string | null | undefined,
  dateFin?: string | null | undefined
): boolean {
  if (!dateFin) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fin = new Date(dateFin);
  fin.setHours(0, 0, 0, 0);
  if (isNaN(fin.getTime())) {
    return false;
  }
  return today.getTime() >= fin.getTime();
}

/**
 * @deprecated Préférer {@link isEvaluationAccessible} avec la date de fin du stage.
 */
export function isStagePeriodOpen(
  dateFin: string | null | undefined,
  _dateRéunionFinale?: string | null | undefined
): boolean {
  return isEvaluationAccessible(null, dateFin);
}

/**
 * Date à partir de laquelle la fiche d'évaluation devient accessible (date de fin du stage).
 */
export function getStagePeriodOpenDate(
  dateFin: string | null | undefined,
  _dateRéunionFinale?: string | null | undefined
): Date | null {
  if (!dateFin) {
    return null;
  }
  const fin = new Date(dateFin);
  if (isNaN(fin.getTime())) {
    return null;
  }
  fin.setHours(0, 0, 0, 0);
  return fin;
}

function parseLocalYmdStartOfDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date de fin effective (dateFin ou dateDebut + duree en mois). Aligné sur StagePeriodValidation. */
export function resolveStageEndDateIso(
  dateDebut: string | null | undefined,
  dateFin: string | null | undefined,
  dureeMonths?: number | null
): string | null {
  if (dateFin?.trim()) {
    return dateFin.trim();
  }
  if (!dateDebut?.trim() || dureeMonths == null || dureeMonths <= 0) {
    return null;
  }
  const debut = parseLocalYmdStartOfDay(dateDebut);
  if (!debut) {
    return null;
  }
  return formatLocalYmd(calculateStageEndDate(debut, dureeMonths));
}

/**
 * Observations / suivi encadrant : autorisé si aujourd'hui ∈ [dateDebut, dateFin] (inclus).
 */
export function isSupervisionPeriodOpen(
  dateDebut: string | null | undefined,
  dateFin: string | null | undefined,
  dureeMonths?: number | null
): boolean {
  if (!dateDebut?.trim()) {
    return false;
  }
  const finIso = resolveStageEndDateIso(dateDebut, dateFin, dureeMonths);
  if (!finIso) {
    return false;
  }
  const debut = parseLocalYmdStartOfDay(dateDebut);
  const fin = parseLocalYmdStartOfDay(finIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!debut || !fin) {
    return false;
  }
  return today.getTime() >= debut.getTime() && today.getTime() <= fin.getTime();
}
