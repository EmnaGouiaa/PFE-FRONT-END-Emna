import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const STRICT_FUTURE_DATE_ERROR = 'Veuillez choisir une date future';

/** Date du lendemain au format YYYY-MM-DD (attribut min des champs date). */
export function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) {
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Vrai si la date est strictement postérieure à aujourd'hui (à partir de demain). */
export function isStrictlyFutureDate(value: string | null | undefined): boolean {
  if (value == null || String(value).trim() === '') {
    return false;
  }
  const selected = parseYmd(String(value));
  if (!selected) {
    return false;
  }
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return selected.getTime() >= tomorrow.getTime();
}

export function strictFutureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }
    return isStrictlyFutureDate(value) ? null : { strictFutureDate: true };
  };
}

export function strictFutureDateErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['required']) {
    return 'Ce champ est obligatoire.';
  }
  if (errors['strictFutureDate']) {
    return STRICT_FUTURE_DATE_ERROR;
  }
  return '';
}
