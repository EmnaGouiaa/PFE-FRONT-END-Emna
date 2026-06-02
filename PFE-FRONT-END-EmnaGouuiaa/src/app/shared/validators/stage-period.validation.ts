import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const STAGE_MAX_DURATION_MONTHS_ACADEMIC = 3;
export const STAGE_MAX_DURATION_MONTHS_SUMMER = 2;
/** Borne haute globale (saisie HTML, compatibilité). */
export const STAGE_MAX_DURATION_MONTHS = STAGE_MAX_DURATION_MONTHS_ACADEMIC;
export const STAGE_MIN_DURATION_MONTHS = 1;

export type StagePeriodKind = 'ACADEMIC' | 'SUMMER';

const PERIOD_LABEL: Record<StagePeriodKind, string> = {
  ACADEMIC: 'Période 1 (stage académique)',
  SUMMER: 'Période 2 (stage été)',
};

export interface StagePeriodValidationResult {
  valid: boolean;
  message?: string;
  period?: StagePeriodKind;
  dateFin?: Date;
}

function parseYmd(value: string | Date): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFr(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function periodBounds(kind: StagePeriodKind, year: number): {
  periodStart: Date;
  periodLastStart: Date;
  maxEnd: Date;
} {
  if (kind === 'ACADEMIC') {
    return {
      periodStart: new Date(year, 1, 1),
      periodLastStart: new Date(year, 4, 31),
      maxEnd: new Date(year, 5, 1),
    };
  }
  return {
    periodStart: new Date(year, 5, 1),
    periodLastStart: new Date(year, 7, 31),
    maxEnd: new Date(year, 8, 1),
  };
}

export function maxDurationMonthsForPeriod(kind: StagePeriodKind): number {
  return kind === 'ACADEMIC' ? STAGE_MAX_DURATION_MONTHS_ACADEMIC : STAGE_MAX_DURATION_MONTHS_SUMMER;
}

export function maxDurationMonthsForStartDate(
  dateDebutInput: string | Date | null | undefined
): number | null {
  const dateDebut = dateDebutInput != null ? parseYmd(dateDebutInput) : null;
  if (!dateDebut) {
    return null;
  }
  const kind = resolveStagePeriodKind(dateDebut);
  return kind ? maxDurationMonthsForPeriod(kind) : null;
}

export function resolveStagePeriodKind(dateDebut: Date): StagePeriodKind | null {
  const year = dateDebut.getFullYear();
  const t = dateDebut.getTime();
  const p1Start = new Date(year, 1, 1).getTime();
  const p1End = new Date(year, 4, 31).getTime();
  const p2Start = new Date(year, 5, 1).getTime();
  const p2End = new Date(year, 7, 31).getTime();
  if (t >= p1Start && t <= p1End) return 'ACADEMIC';
  if (t >= p2Start && t <= p2End) return 'SUMMER';
  return null;
}

/** Date de fin = début + N mois calendaires (aligné backend LocalDate.plusMonths). */
export function calculateStageEndDate(dateDebut: Date, dureeMonths: number): Date {
  const end = new Date(dateDebut);
  end.setMonth(end.getMonth() + dureeMonths);
  end.setHours(0, 0, 0, 0);
  return end;
}

/** Mois calendaires entre début (inclus) et fin (inclus), aligné sur calculateStageEndDate. */
export function calculateStageDurationMonths(dateDebut: Date, dateFin: Date): number {
  let months = 0;
  while (months < 12 && calculateStageEndDate(dateDebut, months + 1).getTime() <= dateFin.getTime()) {
    months++;
  }
  return Math.max(STAGE_MIN_DURATION_MONTHS, months);
}

/** Valide une plage début/fin explicite (ex. formulaire avec deux champs date). */
export function validateStagePeriodWithEndDate(
  dateDebutInput: string | Date | null | undefined,
  dateFinInput: string | Date | null | undefined
): StagePeriodValidationResult {
  const dateDebut = dateDebutInput != null ? parseYmd(dateDebutInput) : null;
  const dateFin = dateFinInput != null ? parseYmd(dateFinInput) : null;
  if (!dateDebut) {
    return { valid: false, message: 'La date de début est obligatoire.' };
  }
  if (!dateFin) {
    return { valid: false, message: 'La date de fin est obligatoire.' };
  }
  if (dateFin.getTime() < dateDebut.getTime()) {
    return { valid: false, message: 'La date de fin ne peut pas être antérieure à la date de début.' };
  }
  const duree = calculateStageDurationMonths(dateDebut, dateFin);
  return validateStagePeriod(dateDebut, duree);
}

export function validateStagePeriod(
  dateDebutInput: string | Date | null | undefined,
  dureeInput: number | null | undefined
): StagePeriodValidationResult {
  const dateDebut = dateDebutInput != null ? parseYmd(dateDebutInput) : null;
  if (!dateDebut) {
    return { valid: false, message: 'La date de début est obligatoire.' };
  }

  const duree = Number(dureeInput);
  if (!Number.isFinite(duree)) {
    return { valid: false, message: 'La durée du stage est obligatoire.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateDebut.getTime() < today.getTime()) {
    return {
      valid: false,
      message: 'La date de début du stage ne peut pas être dans le passé.',
    };
  }

  const kind = resolveStagePeriodKind(dateDebut);
  if (!kind) {
    return {
      valid: false,
      message:
        'La date de début doit appartenir à la période 1 (1er février → 31 mai) ' +
        'ou à la période 2 (1er juin → 31 août).',
    };
  }

  const maxDur = maxDurationMonthsForPeriod(kind);
  const label = PERIOD_LABEL[kind];

  if (duree < STAGE_MIN_DURATION_MONTHS || duree > maxDur) {
    return {
      valid: false,
      message: `${label} : la durée doit être comprise entre ${STAGE_MIN_DURATION_MONTHS} et ${maxDur} mois.`,
      period: kind,
    };
  }

  const year = dateDebut.getFullYear();
  const { periodStart, periodLastStart, maxEnd } = periodBounds(kind, year);

  if (dateDebut.getTime() < periodStart.getTime() || dateDebut.getTime() > periodLastStart.getTime()) {
    return {
      valid: false,
      message: `${label} : la date de début doit être entre le ${formatFr(periodStart)} et le ${formatFr(periodLastStart)}.`,
      period: kind,
    };
  }

  const dateFin = calculateStageEndDate(dateDebut, duree);
  if (dateFin.getTime() > maxEnd.getTime()) {
    return {
      valid: false,
      message: `${label} : la date de fin calculée (${formatFr(dateFin)}) ne peut pas dépasser le ${formatFr(maxEnd)}.`,
      period: kind,
      dateFin,
    };
  }

  return { valid: true, period: kind, dateFin };
}

export function stagePeriodValidator(group: AbstractControl): ValidationErrors | null {
  const dateDebut = group.get('dateDebutPrevue')?.value ?? group.get('dateDebut')?.value;
  const dateFin = group.get('dateFin')?.value;
  const duree = group.get('duree')?.value;

  const result =
    dateFin != null && String(dateFin).trim() !== '' && (duree == null || duree === '')
      ? validateStagePeriodWithEndDate(dateDebut, dateFin)
      : validateStagePeriod(dateDebut, duree);

  if (result.valid) {
    return null;
  }
  return {
    stagePeriod: { message: result.message ?? 'Période de stage invalide.' },
  };
}

export function notPastDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }
  const selected = parseYmd(value);
  if (!selected) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected.getTime() < today.getTime() ? { pastDate: true } : null;
}

export function stagePeriodErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors?.['stagePeriod']?.message) {
    return '';
  }
  return String(errors['stagePeriod'].message);
}
