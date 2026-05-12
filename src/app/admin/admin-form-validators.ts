import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PHONE_REGEX = /^\+?[0-9][0-9 .()-]{7,19}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function strictEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!value.includes('@')) return { missingAt: true };
    if (!EMAIL_REGEX.test(value)) return { email: true };
    return null;
  };
}

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return PHONE_REGEX.test(value) ? null : { phone: true };
  };
}
