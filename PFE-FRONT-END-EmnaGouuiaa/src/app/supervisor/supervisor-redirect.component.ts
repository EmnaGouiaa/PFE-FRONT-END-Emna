import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthentificationService, RoleUtilisateur } from '../services/authentification.service';

@Component({
  selector: 'app-supervisor-redirect',
  standalone: true,
  template: ''
})
export class SupervisorRedirectComponent implements OnInit {
  constructor(private authService: AuthentificationService, private router: Router) {}

  ngOnInit(): void {
    const role = this.authService.getRoleUtilisateur();
    const target =
      role === RoleUtilisateur.ENCADRANT_ACADEMIQUE
        ? '/encadrant-academique/tableau-de-bord'
        : '/encadrant-professionnel/tableau-de-bord';
    this.router.navigate([target]);
  }
}
