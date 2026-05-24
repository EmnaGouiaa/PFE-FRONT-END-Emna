import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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

/**
 * Valide un numero de telephone tunisien : prefixe "+216" (espace optionnel) suivi de
 * EXACTEMENT 8 chiffres. Aucune lettre ni caractere special tolere.
 *
 * Formats acceptes :
 *   "+216 20123456" / "+21620123456" / "20123456" (les 8 chiffres seuls, le composant
 *   PhoneInput prepose toujours le prefixe).
 *
 * Renvoie { phone: true } si le format ne correspond pas, null sinon (ou si vide —
 * le caractere obligatoire est gere par Validators.required du formulaire).
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    // On extrait uniquement les chiffres et on retire le code pays s'il est present.
    const allDigits = value.replace(/\D+/g, '');
    const localDigits = allDigits.startsWith('216') && allDigits.length > 8
      ? allDigits.substring(3)
      : allDigits;
    return /^\d{8}$/.test(localDigits) ? null : { phone: true };
  };
}
