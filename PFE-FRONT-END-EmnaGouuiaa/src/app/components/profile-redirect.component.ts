import { Component, OnInit } from '@angular/core';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-redirect',
  standalone: true,
  template: ''
})
export class ProfileRedirectComponent implements OnInit {
  constructor(
    private authService: AuthentificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRoleUtilisateur();
    const target = this.resolveProfileRoute(role);
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }

  private resolveProfileRoute(role: RoleUtilisateur | null): string {
    switch (role) {
      case RoleUtilisateur.ADMINISTRATEUR:
      case RoleUtilisateur.AGENT_STAGE:
        return '/admin/profil';
      case RoleUtilisateur.STAGIAIRE:
        return '/etudiant/profil';
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return '/encadrant-academique/profil';
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return '/encadrant-professionnel/profil';
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return '/entreprise/profil';
      case RoleUtilisateur.RESPONSABLE_STAGE:
        return '/responsable/profil';
      default:
        return this.authService.getRouteTableauDeBord(role);
    }
  }
}
