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

<<<<<<< HEAD
=======
    console.log('🔒 RoleGuard vérification de l\'accès à :', state.url);
    console.log('🔒 Rôles requis :', rolesAutorises);

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    return this.serviceAuthentification.estAuthentifie$.pipe(
      take(1),
      map(estAuthentifie => {
        if (!estAuthentifie) {
<<<<<<< HEAD
=======
          console.warn('🔒 Non authentifié, redirection vers connexion');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
          this.router.navigate(['/connexion'], {
            queryParams: { retourUrl: state.url }
          });
          return false;
        }

<<<<<<< HEAD
        if (this.serviceAuthentification.doitChangerMotDePasse()) {
          this.router.navigate(['/premiere-connexion'], {
            queryParams: { retourUrl: state.url }
          });
          return false;
        }

        const roleUtilisateur = this.serviceAuthentification.getRoleUtilisateur();

        if (!roleUtilisateur) {
=======
        const roleUtilisateur = this.serviceAuthentification.getRoleUtilisateur();
        console.log('🔒 Rôle utilisateur :', roleUtilisateur);

        if (!roleUtilisateur) {
          console.error('🔒 Aucun rôle trouvé, redirection vers non-autorisé');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
          this.router.navigate(['/non-autorise']);
          return false;
        }

        const aLeRoleRequis = rolesAutorises.includes(roleUtilisateur as RoleUtilisateur);
<<<<<<< HEAD

        if (!aLeRoleRequis) {
=======
        console.log('🔒 Possède le rôle requis :', aLeRoleRequis);

        if (!aLeRoleRequis) {
          console.warn('🔒 Permissions insuffisantes. Requis :', rolesAutorises, 'Obtenu :', roleUtilisateur);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
          this.router.navigate(['/non-autorise'], {
            state: { rolesRequis: rolesAutorises }
          });
          return false;
        }

<<<<<<< HEAD
=======
        console.log('✅ RoleGuard : Accès autorisé');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        return true;
      })
    );
  }
<<<<<<< HEAD
=======

  private redirigerVersTableauDeBord(role: string): void {
    const routesTableauDeBord: { [key: string]: string } = {
      [RoleUtilisateur.ADMINISTRATEUR]: '/admin/tableau-de-bord',
      [RoleUtilisateur.STAGIAIRE]: '/etudiant/tableau-de-bord',
      [RoleUtilisateur.ENCADRANT_PROFESSIONNEL]: '/encadrant/tableau-de-bord',
      [RoleUtilisateur.ENCADRANT_ACADEMIQUE]: '/encadrant/tableau-de-bord',
      [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES]: '/responsable/tableau-de-bord',
      [RoleUtilisateur.RESPONSABLE_ENTREPRISE]: '/entreprise/tableau-de-bord'
    };

    const dashboard = routesTableauDeBord[role] || '/tableau-de-bord';
    this.router.navigate([dashboard]);
  }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
