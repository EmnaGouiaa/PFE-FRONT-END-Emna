/**
 * Stage considéré comme terminé lorsque la date de fin (jour calendaire) est strictement
 * avant aujourd'hui — aligné avec le backend ({@code LocalDate} + {@code isBefore(now)}).
 */
export function isStageFinishedByCalendarEndDate(dateFin: string | null | undefined): boolean {
  if (!dateFin || !String(dateFin).trim()) {
    return false;
  }
  const end = parseLocalYmdStartOfDay(String(dateFin).trim());
  if (!end) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
}

function parseLocalYmdStartOfDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
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
