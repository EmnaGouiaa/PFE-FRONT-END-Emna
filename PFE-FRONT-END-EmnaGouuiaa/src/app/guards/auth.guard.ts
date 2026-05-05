import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.serviceAuthentification.estAuthentifie$.pipe(
      take(1),
      map(estAuthentifie => {
        const destinationUrl = state.url;

        if (!estAuthentifie) {
          console.warn('AuthGuard: Non authentifié, redirection vers connexion depuis :', destinationUrl);
          this.serviceAuthentification.effacerDonneesAuthentification();
          return this.router.createUrlTree(['/connexion'], {
            queryParams: { retourUrl: destinationUrl }
          });
        }

        console.log('AuthGuard: Authentifié, accès autorisé à :', destinationUrl);
        return true;
      })
    );
  }

  private getRedirectionSelonRole(): UrlTree {
    const role = this.serviceAuthentification.getRoleUtilisateur();
    return this.router.parseUrl(this.serviceAuthentification.getRouteTableauDeBord(role));
  }
}
