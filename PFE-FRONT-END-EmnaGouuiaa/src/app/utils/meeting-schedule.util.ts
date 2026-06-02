/** Champs minimaux pour comparer la date/heure d'une réunion. */
export interface MeetingScheduleFields {
  date?: string | null;
  heure?: string | null;
}

/** Normalise une date API (chaîne ISO, tableau [y,m,d], etc.). */
export function normalizeMeetingDate(value: unknown): string {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    return trimmed;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const year = Number(value[0]);
    const month = Number(value[1]);
    const day = Number(value[2]);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

/** Reconnaît le type réunion (FINALE / HEBDOMADAIRE) depuis la réponse API. */
export function resolveMeetingSourceFromApi(
  raw: Record<string, unknown> | null | undefined,
  fallback: 'HEBDOMADAIRE' | 'FINALE' = 'HEBDOMADAIRE'
): 'HEBDOMADAIRE' | 'FINALE' {
  const candidates = [raw?.['typeReunion'], raw?.['reunionType'], raw?.['discriminator'], raw?.['type']];
  const normalized = candidates
    .map((value) => String(value ?? '').trim().toUpperCase())
    .find((value) => value.length > 0);

  if (!normalized) {
    return fallback;
  }
  if (
    normalized === 'FINALE' ||
    normalized === 'FINAL' ||
    normalized === 'FINALES' ||
    normalized.includes('FIN')
  ) {
    return 'FINALE';
  }
  return 'HEBDOMADAIRE';
}

/** Normalise l'heure API (HH:mm ou HH:mm:ss) pour Date.parse. */
export function normalizeMeetingHeure(heure?: string | null): string {
  const raw = String(heure ?? '').trim();
  if (!raw) {
    return '00:00:00';
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }
  return '00:00:00';
}

/** Délai minimum avant le début d'une réunion (aligné sur ReunionServiceImpl.MIN_UPDATE_DELAY). */
export const MEETING_MIN_SCHEDULE_DELAY_MS = 24 * 60 * 60 * 1000;

export const MEETING_MIN_SCHEDULE_DELAY_ERROR =
  'Une réunion doit être planifiée au moins 24 heures avant son début.';

export const MEETING_OUTSIDE_STAGE_PERIOD_ERROR =
  'La date de la réunion doit être comprise dans la période du stage.';

/** Première date calendaire autorisée (now + 24 h), format YYYY-MM-DD. */
export function earliestSchedulableMeetingDateIso(nowMs: number = Date.now()): string {
  const d = new Date(nowMs + MEETING_MIN_SCHEDULE_DELAY_MS);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compare deux dates ISO (YYYY-MM-DD). */
export function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function isSchedulableMeetingDate(value: string | null | undefined, nowMs: number = Date.now()): boolean {
  const date = normalizeMeetingDate(value);
  if (!date) {
    return false;
  }
  return date >= earliestSchedulableMeetingDateIso(nowMs);
}

export function isMeetingAtLeast24HoursAhead(
  meeting: MeetingScheduleFields,
  nowMs: number = Date.now()
): boolean {
  const timestamp = getMeetingTimestamp(meeting);
  if (!timestamp) {
    return false;
  }
  return timestamp - nowMs >= MEETING_MIN_SCHEDULE_DELAY_MS;
}

export function isMeetingDateWithinStagePeriod(
  meetingDate: string,
  stageDebut?: string | null,
  stageFin?: string | null
): boolean {
  const date = normalizeMeetingDate(meetingDate);
  if (!date) {
    return false;
  }
  const debut = normalizeMeetingDate(stageDebut);
  const fin = normalizeMeetingDate(stageFin);
  if (debut && date < debut) {
    return false;
  }
  if (fin && date > fin) {
    return false;
  }
  return true;
}

/** Timestamp planifié de la réunion (date + heure). */
export function getMeetingTimestamp(meeting: MeetingScheduleFields): number {
  const date = normalizeMeetingDate(meeting.date);
  if (!date) {
    return 0;
  }
  const timestamp = Date.parse(`${date}T${normalizeMeetingHeure(meeting.heure)}`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Réunion « à venir » : date/heure non encore passées.
 * Indépendant du type (hebdomadaire ou finale).
 */
export function isMeetingUpcoming(meeting: MeetingScheduleFields, nowMs: number = Date.now()): boolean {
  const timestamp = getMeetingTimestamp(meeting);
  if (!timestamp) {
    return false;
  }
  return timestamp >= nowMs;
}

/** Les réunions finales n'ont pas de champ observation (affichage ni saisie). */
export function meetingShowsObservation(meeting: { source?: string | null }): boolean {
  return String(meeting.source ?? '').toUpperCase() !== 'FINALE';
}

export function splitMeetingsBySchedule<T extends MeetingScheduleFields>(
  meetings: T[],
  nowMs: number = Date.now()
): { upcoming: T[]; past: T[] } {
  const upcoming = meetings
    .filter((meeting) => isMeetingUpcoming(meeting, nowMs))
    .sort((left, right) => getMeetingTimestamp(left) - getMeetingTimestamp(right));
  const past = meetings
    .filter((meeting) => !isMeetingUpcoming(meeting, nowMs))
    .sort((left, right) => getMeetingTimestamp(right) - getMeetingTimestamp(left));
  return { upcoming, past };
}
