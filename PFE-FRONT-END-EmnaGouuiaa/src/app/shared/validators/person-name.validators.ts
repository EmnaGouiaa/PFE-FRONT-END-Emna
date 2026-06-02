import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Lettres Unicode (accents inclus), espaces, tirets et apostrophes. */
const PERSON_NAME_REGEX = /^[\p{L}\s'\-]+$/u;

export const PERSON_NAME_ERROR_REQUIRED = 'Ce champ est obligatoire.';
export const PERSON_NAME_ERROR_WHITESPACE =
  'La valeur ne peut pas être composée uniquement d\'espaces.';
export const PERSON_NAME_ERROR_INVALID =
  'Seules les lettres sont autorisées (lettres accentuées, espaces, tirets et apostrophes).';

export function noWhitespaceOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }
    return String(value).trim().length === 0 ? { whitespaceOnly: true } : null;
  };
}

export function personNamePatternValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }
    const trimmed = String(value).trim();
    return PERSON_NAME_REGEX.test(trimmed) ? null : { personName: true };
  };
}

/** Validateurs pour un champ Nom ou Prénom obligatoire. */
export function personNameValidators(): ValidatorFn[] {
  return [Validators.required, noWhitespaceOnlyValidator(), personNamePatternValidator()];
}

/** Variante avec limite de longueur (ex. demandes entreprise). */
export function personNameValidatorsWithMaxLength(maxLength: number): ValidatorFn[] {
  return [
    Validators.required,
    Validators.maxLength(maxLength),
    noWhitespaceOnlyValidator(),
    personNamePatternValidator(),
  ];
}

export function personNameErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['required']) {
    return PERSON_NAME_ERROR_REQUIRED;
  }
  if (errors['whitespaceOnly']) {
    return PERSON_NAME_ERROR_WHITESPACE;
  }
  if (errors['personName']) {
    return PERSON_NAME_ERROR_INVALID;
  }
  return '';
}
