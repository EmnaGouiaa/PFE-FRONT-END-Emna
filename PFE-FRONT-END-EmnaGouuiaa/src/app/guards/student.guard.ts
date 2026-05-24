import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';

/**
 * Garde d'accès réservé aux stagiaires.
 * Utilise AuthentificationService (source de vérité) et les routes françaises.
 */
@Injectable({ providedIn: 'root' })
export class StudentGuard implements CanActivate {
  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.serviceAuthentification.estAuthentifie$.pipe(
      take(1),
      map((estAuthentifie) => {
        if (!estAuthentifie) {
          return this.router.createUrlTree(['/connexion']);
        }

        if (this.serviceAuthentification.doitChangerMotDePasse()) {
          return this.router.createUrlTree(['/premiere-connexion']);
        }

        const role = this.serviceAuthentification.getRoleUtilisateur();
        if (role !== RoleUtilisateur.STAGIAIRE) {
          return this.router.createUrlTree(['/non-autorise']);
        }

        return true;
      })
    );
  }
}
