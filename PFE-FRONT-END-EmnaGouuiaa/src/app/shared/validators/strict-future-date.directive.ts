import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { isStrictlyFutureDate } from './strict-future-date.validators';

@Directive({
  selector: '[appStrictFutureDate][ngModel],[appStrictFutureDate][formControlName]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: StrictFutureDateValidatorDirective,
      multi: true,
    },
  ],
})
export class StrictFutureDateValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }
    return isStrictlyFutureDate(value) ? null : { strictFutureDate: true };
  }
}
