import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const rolesAutorises = route.data?.['roles'] as RoleUtilisateur[] || [];

    return this.serviceAuthentification.estAuthentifie$.pipe(
      take(1),
      map(estAuthentifie => {
        if (!estAuthentifie) {
          this.router.navigate(['/connexion'], {
            queryParams: { retourUrl: state.url }
          });
          return false;
        }

        if (this.serviceAuthentification.doitChangerMotDePasse()) {
          this.router.navigate(['/premiere-connexion'], {
            queryParams: { retourUrl: state.url }
          });
          return false;
        }

        const roleUtilisateur = this.serviceAuthentification.getRoleUtilisateur();

        if (!roleUtilisateur) {
          this.router.navigate(['/non-autorise']);
          return false;
        }

        const aLeRoleRequis = rolesAutorises.includes(roleUtilisateur as RoleUtilisateur);

        if (!aLeRoleRequis) {
          this.router.navigate(['/non-autorise'], {
            state: { rolesRequis: rolesAutorises }
          });
          return false;
        }

        return true;
      })
    );
  }
}
