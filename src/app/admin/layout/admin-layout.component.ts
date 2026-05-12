import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
<<<<<<< HEAD
import { Router, RouterModule } from '@angular/router';
=======
import { RouterModule } from '@angular/router';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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

<<<<<<< HEAD
  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {}
=======
  constructor(private serviceAuthentification: AuthentificationService) {}
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

  ngOnInit(): void {
    const role = this.serviceAuthentification.getRoleUtilisateur();
    this.isAdmin = role === RoleUtilisateur.ADMINISTRATEUR;
<<<<<<< HEAD
    this.isResponsableStages =
      role === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES ||
      role === RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES;
  }

  logout(): void {
    this.serviceAuthentification.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
=======
    this.isResponsableStages = role === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES;
  }
}

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
