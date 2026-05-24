import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../authentification.service';
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
  ) {
    // Clear the cached context whenever the logged-in user changes (login / logout / role switch).
    // Without this, a singleton cache built for user A would be reused for user B after re-login
    // without a full page reload, causing wrong entrepriseId values in every API call.
    this.authService.utilisateurActuel$
      .pipe(distinctUntilChanged((a, b) => a?.userId === b?.userId))
      .subscribe(() => {
        this.context$ = undefined;
      });
  }

  getContext(forceRefresh = false): Observable<CompanyContext> {
    if (!this.context$ || forceRefresh) {
      this.context$ = this.loadContext().pipe(shareReplay(1));
    }

    // Wrap in catchError so that a failed (cached) observable clears itself,
    // allowing the next call to retry instead of replaying the same error.
    return this.context$.pipe(
      catchError((err) => {
        this.context$ = undefined;
        return throwError(() => err);
      })
    );
  }

  refresh(): Observable<CompanyContext> {
    this.context$ = undefined;
    return this.getContext(true);
  }

  private loadContext(): Observable<CompanyContext> {
    const role = this.authService.getRoleUtilisateur();
    if (role && role !== RoleUtilisateur.RESPONSABLE_ENTREPRISE) {
      return throwError(
        () => new Error(
          `Accès refusé : cette section est réservée aux représentants d'entreprise (rôle actuel : ${role}).`
        )
      );
    }

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
          throw new Error(`Aucun responsable d'entreprise ne correspond à ${email}.`);
        }

        return responsable;
      })
    );
  }
}
