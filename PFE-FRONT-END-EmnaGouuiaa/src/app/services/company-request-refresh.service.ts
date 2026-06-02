import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Bus léger pour synchroniser les écrans qui affichent les demandes entreprise
 * (liste responsable, dashboard, admin lecture seule).
 */
@Injectable({ providedIn: 'root' })
export class CompanyRequestRefreshService {
  private readonly changedSubject = new Subject<void>();

  /** Émis après création, approbation ou refus d'une demande. */
  readonly changed$ = this.changedSubject.asObservable();

  notifyChange(): void {
    this.changedSubject.next();
  }
}
