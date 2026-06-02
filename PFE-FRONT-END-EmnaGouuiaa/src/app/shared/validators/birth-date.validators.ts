import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const BIRTH_DATE_ERROR_FUTURE =
  'La date de naissance ne peut pas être postérieure à la date du jour.';
export const BIRTH_DATE_ERROR_INVALID = 'Date de naissance invalide.';

export function birthDateNotInFutureValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || raw === '') {
      return null;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return { invalidBirthDate: true };
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date.getTime() > today.getTime() ? { futureBirthDate: true } : null;
  };
}

export function birthDateErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['futureBirthDate']) {
    return BIRTH_DATE_ERROR_FUTURE;
  }
  if (errors['invalidBirthDate']) {
    return BIRTH_DATE_ERROR_INVALID;
  }
  return '';
}
