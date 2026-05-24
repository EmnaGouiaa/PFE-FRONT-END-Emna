import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  isAdmin = false;
  isResponsableStages = false;

  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const role = this.serviceAuthentification.getRoleUtilisateur();
    this.isAdmin = role === RoleUtilisateur.ADMINISTRATEUR;
    this.isResponsableStages =
      role === RoleUtilisateur.RESPONSABLE_STAGE;
  }

  logout(): void {
    this.serviceAuthentification.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
