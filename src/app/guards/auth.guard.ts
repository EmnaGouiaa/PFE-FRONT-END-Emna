import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
<<<<<<< HEAD
import { AuthentificationService } from '../services/authentification.service';
=======
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

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
<<<<<<< HEAD
        const premiereConnexionUrl = '/premiere-connexion';

        if (!estAuthentifie) {
          console.warn('AuthGuard: Non authentifie, redirection vers connexion depuis :', destinationUrl);
=======

        if (!estAuthentifie) {
          console.warn('AuthGuard: Non authentifié, redirection vers connexion depuis :', destinationUrl);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
          this.serviceAuthentification.effacerDonneesAuthentification();
          return this.router.createUrlTree(['/connexion'], {
            queryParams: { retourUrl: destinationUrl }
          });
        }

<<<<<<< HEAD
        if (this.serviceAuthentification.doitChangerMotDePasse() && !destinationUrl.startsWith(premiereConnexionUrl)) {
          return this.router.createUrlTree([premiereConnexionUrl], {
            queryParams: { retourUrl: destinationUrl }
          });
        }

=======
        console.log('AuthGuard: Authentifié, accès autorisé à :', destinationUrl);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        return true;
      })
    );
  }
<<<<<<< HEAD
=======

  private getRedirectionSelonRole(): UrlTree {
    const role = this.serviceAuthentification.getRoleUtilisateur();

    switch (role) {
      case RoleUtilisateur.ADMINISTRATEUR:
        return this.router.parseUrl('/admin/tableau-de-bord');
      case RoleUtilisateur.STAGIAIRE:
        return this.router.parseUrl('/etudiant/tableau-de-bord');
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return this.router.parseUrl('/encadrant/tableau-de-bord');
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
        return this.router.parseUrl('/responsable/tableau-de-bord');
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return this.router.parseUrl('/entreprise/tableau-de-bord');
      default:
        return this.router.parseUrl('/connexion');
    }
  }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
