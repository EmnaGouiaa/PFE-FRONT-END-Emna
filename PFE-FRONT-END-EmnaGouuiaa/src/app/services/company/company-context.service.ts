import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { AuthentificationService } from '../authentification.service';
import { EntreprisesService } from '../entreprises.service';
import { ResponsablesEntrepriseService, ResponsableEntreprise } from '../responsables-entreprise.service';
import { CompanyContext } from './company.models';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private context$?: Observable<CompanyContext>;

  constructor(
    private authService: AuthentificationService,
    private responsablesEntrepriseService: ResponsablesEntrepriseService,
    private entreprisesService: EntreprisesService
  ) {}

  getContext(forceRefresh = false): Observable<CompanyContext> {
    if (!this.context$ || forceRefresh) {
      this.context$ = this.loadContext().pipe(shareReplay(1));
    }

    return this.context$;
  }

  refresh(): Observable<CompanyContext> {
    this.context$ = undefined;
    return this.getContext(true);
  }

  private loadContext(): Observable<CompanyContext> {
    const userId = this.authService.getUserId();
    const email = (this.authService.getEmail() ?? '').trim().toLowerCase();

    if (!userId && !email) {
      return throwError(() => new Error('Impossible de déterminer le compte entreprise connecté.'));
    }

    const responsable$ = userId
      ? this.responsablesEntrepriseService.getById(userId).pipe(
          catchError(() => this.findResponsableByEmail(email))
        )
      : this.findResponsableByEmail(email);

    return responsable$.pipe(
      switchMap((responsable) => {
        const entreprise$ = responsable.entrepriseId
          ? this.entreprisesService.getById(responsable.entrepriseId).pipe(catchError(() => of(null)))
          : of(null);

        return entreprise$.pipe(
          map((entreprise) => ({
            userId: userId ?? responsable.id,
            email,
            responsable,
            entreprise
          }))
        );
      })
    );
  }

  private findResponsableByEmail(email: string): Observable<ResponsableEntreprise> {
    if (!email) {
      return throwError(() => new Error('Aucun email disponible pour identifier le responsable entreprise.'));
    }

    return this.responsablesEntrepriseService.list().pipe(
      map((responsables) => {
        const responsable = responsables.find(
          (item) => (item.email ?? '').trim().toLowerCase() === email
        );

        if (!responsable) {
          throw new Error(`Aucun responsable d’entreprise ne correspond à ${email}.`);
        }

        return responsable;
      })
    );
  }
}
