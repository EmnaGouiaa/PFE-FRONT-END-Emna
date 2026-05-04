import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  constructor(private serviceAuthentification: AuthentificationService) {}

  ngOnInit(): void {
    const role = this.serviceAuthentification.getRoleUtilisateur();
    this.isAdmin = role === RoleUtilisateur.ADMINISTRATEUR;
    this.isResponsableStages = role === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES;
  }
}

