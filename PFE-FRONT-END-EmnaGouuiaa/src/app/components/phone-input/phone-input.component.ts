import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Champ de saisie d'un numero de telephone tunisien.
 *
 * - Le prefixe "+216" est affiche dans une zone non modifiable (lecture seule, non focusable).
 * - L'utilisateur ne peut taper que les 8 chiffres locaux.
 * - Toute lettre / caractere special / espace est rejete a la saisie (le champ est filtre
 *   automatiquement) — il devient impossible d'entrer autre chose que des chiffres.
 * - Validation visuelle en temps reel : une bordure rouge + message d'erreur s'affichent tant
 *   que la longueur est non nulle et differente de 8.
 * - Cote valeur emise dans le FormControl, on emet "+216 XXXXXXXX" pour un numero complet,
 *   "" (chaine vide) sinon (le caractere obligatoire est gere par Validators.required).
 *
 * Utilisation :
 *   <app-phone-input formControlName="telephone"></app-phone-input>
 */
@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phone-input-wrap" [class.invalid]="showError">
      <span class="phone-prefix" aria-label="Indicatif Tunisie">+216</span>
      <input
        type="tel"
        [value]="localDigits"
        (input)="onInput($event)"
        (blur)="onBlur()"
        [disabled]="isDisabled || !!readonly"
        [readonly]="!!readonly && !isDisabled"
        [attr.aria-invalid]="showError ? 'true' : null"
        [attr.aria-describedby]="showError ? 'phone-err-' + uid : null"
        maxlength="8"
        inputmode="numeric"
        pattern="[0-9]{8}"
        placeholder="20123456"
        autocomplete="off"
      />
    </div>
    <div *ngIf="showError" class="phone-error" [id]="'phone-err-' + uid">
      Le numéro doit contenir exactement 8 chiffres (sans espace, lettre ou caractère spécial).
    </div>
  `,
  styles: [`
    :host { display: block; }
    .phone-input-wrap {
      display: flex;
      align-items: stretch;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .phone-input-wrap:focus-within {
      border-color: rgba(37, 150, 190, 0.55);
      box-shadow: 0 0 0 3px rgba(37, 150, 190, 0.15);
    }
    .phone-input-wrap.invalid {
      border-color: #e53e3e;
      box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12);
    }
    .phone-prefix {
      display: inline-flex;
      align-items: center;
      padding: 0 12px;
      background: rgba(16, 71, 120, 0.06);
      color: #1a3a6e;
      font-weight: 700;
      letter-spacing: 0.02em;
      border-right: 1px solid rgba(15, 23, 42, 0.10);
      user-select: none;
    }
    input {
      flex: 1;
      min-width: 0;
      padding: 8px 12px;
      border: 0;
      outline: none;
      background: transparent;
      font: inherit;
      color: inherit;
    }
    input:disabled {
      background: rgba(15, 23, 42, 0.04);
      color: #64748b;
      cursor: not-allowed;
    }
    .phone-error {
      color: #e53e3e;
      font-size: 0.85rem;
      margin-top: 4px;
    }
  `],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInputComponent), multi: true }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor {
  /** Marque le champ comme touche par soumission du formulaire parent (force l'affichage d'erreur). */
  @Input() set submitted(value: boolean) { this._submitted = !!value; }
  get submitted(): boolean { return this._submitted; }
  private _submitted = false;

  /** Verrouille le champ visuellement (utilise par les pages profil basculant entre lecture et edition). */
  @Input() readonly = false;

  localDigits = '';
  isDisabled = false;
  touched = false;
  readonly uid = Math.random().toString(36).slice(2, 8);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.localDigits = this.stripToLocalDigits(value);
  }
  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = target.value ?? '';
    // Filtrage strict : on ne garde que les chiffres et on limite a 8.
    const digitsOnly = raw.replace(/\D+/g, '').slice(0, 8);
    if (digitsOnly !== raw) {
      target.value = digitsOnly; // empeche tout caractere non-chiffre d'apparaitre
    }
    this.localDigits = digitsOnly;
    this.onChange(this.toEmittedValue());
  }

  onBlur(): void {
    this.touched = true;
    this.onTouched();
  }

  /** Affiche l'erreur si l'utilisateur a touche le champ (ou soumis) ET la longueur != 8. */
  get showError(): boolean {
    if (!(this.touched || this._submitted)) return false;
    if (this.localDigits.length === 0) return false; // gere par Validators.required du parent
    return this.localDigits.length !== 8;
  }

  /** Valeur emise dans le FormControl : "+216 XXXXXXXX" ou "" si vide. */
  private toEmittedValue(): string {
    return this.localDigits ? `+216 ${this.localDigits}` : '';
  }

  /** Retire le prefixe (+216, espaces, parentheses, tirets) et ne garde que les 8 derniers chiffres. */
  private stripToLocalDigits(value: string | null | undefined): string {
    if (!value) return '';
    const allDigits = String(value).replace(/\D+/g, '');
    // Si la valeur arrivait avec "216" devant (ex : 21620123456), on retire le code pays.
    const withoutCountryCode = allDigits.startsWith('216') && allDigits.length > 8
      ? allDigits.substring(3)
      : allDigits;
    return withoutCountryCode.slice(-8);
  }
}
