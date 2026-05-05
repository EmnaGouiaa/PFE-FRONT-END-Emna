import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit {
  userName = '';
  userRole = '';
  isAdmin = false;
  isStagiaire = false;
  isEncadrant = false;
  isResponsableEntreprise = false;
  isResponsableUniversitaire = false;

  constructor(
    private authService: AuthentificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    this.userName = this.authService.getNomComplet() || 'Utilisateur';
    this.userRole = this.authService.getRole() || '';

    this.isAdmin = this.userRole === RoleUtilisateur.ADMINISTRATEUR;
    this.isStagiaire = this.userRole === RoleUtilisateur.STAGIAIRE;
    this.isEncadrant =
      this.userRole === RoleUtilisateur.ENCADRANT_ACADEMIQUE ||
      this.userRole === RoleUtilisateur.ENCADRANT_PROFESSIONNEL;
    this.isResponsableEntreprise = this.userRole === RoleUtilisateur.RESPONSABLE_ENTREPRISE;
    this.isResponsableUniversitaire =
      this.userRole === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES ||
      this.userRole === RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES;
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profil']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  getRoleDisplayName(role: string | null): string {
    if (!role) return 'Utilisateur';

    const roleNames: { [key: string]: string } = {
      [RoleUtilisateur.ADMINISTRATEUR]: 'Administrateur',
      [RoleUtilisateur.STAGIAIRE]: 'Stagiaire',
      [RoleUtilisateur.ENCADRANT_PROFESSIONNEL]: 'Encadrant professionnel',
      [RoleUtilisateur.ENCADRANT_ACADEMIQUE]: 'Encadrant académique',
      [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES]: 'Responsable des stages',
      [RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'Responsable universitaire des stages',
      [RoleUtilisateur.RESPONSABLE_ENTREPRISE]: 'Responsable entreprise'
    };

    return roleNames[role] || role;
  }
}
