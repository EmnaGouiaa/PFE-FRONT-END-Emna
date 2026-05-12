import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { ServiceDemandeStageService } from '../services/service-demande-stage.service';
import { DemandeStage, StatutDemande } from '../models/demande-stage.model';
import { AuthentificationService } from '../services/authentification.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  
  demandesStage: DemandeStage[] = [];
  isLoading = false;
  currentUser: any;
  
  constructor(
    private serviceDemandeStage: ServiceDemandeStageService,
    private authService: AuthService,
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDemandesStage();
  }

  loadDemandesStage(): void {
    this.isLoading = true;

    const stagiaireId = (this.currentUser?.id as number | null) ?? this.serviceAuthentification.getUserId();

    const requete$ = stagiaireId
      ? this.serviceDemandeStage.getDemandesParStagiaire(stagiaireId)
      : this.serviceDemandeStage.getDemandesEtudiant();

    requete$.subscribe({
      next: (demandes) => {
        this.demandesStage = demandes ?? [];
        this.isLoading = false;
<<<<<<< HEAD
      },
      error: (error) => {
        console.error('Erreur lors du chargement des demandes de stage :', error);
        this.isLoading = false;
        alert('Erreur lors du chargement des demandes de stage.');
=======
        console.log('📋 Loaded demandes-stage:', demandes);
      },
      error: (error) => {
        console.error('❌ Error loading demandes-stage:', error);
        this.isLoading = false;
        alert('Erreur lors du chargement des demandes de stage');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    });
  }

  navigateToForm(): void {
    this.router.navigate(['/etudiant/demande-stage']);
  }

  viewRequestDetails(requestId: number): void {
<<<<<<< HEAD
    alert(`Détails de la demande #${requestId} : cette fonctionnalité n’est pas disponible pour le moment.`);
=======
    alert(`Viewing details for request #${requestId}. Feature coming soon!`);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  }

  getStatusColor(status: string): string {
    switch (status) {
      case StatutDemande.EN_ATTENTE:
        return '#ff9800';
      case StatutDemande.APPROUVEE:
      case StatutDemande.APPROUVEE_ADMIN:
        return '#4caf50';
      case StatutDemande.REJETEE:
      case StatutDemande.REJETEE_ADMIN:
        return '#f44336';
      case StatutDemande.EN_COURS:
        return '#2196f3';
      case StatutDemande.TERMINEE:
        return '#9c27b0';
      default:
        return '#666';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case StatutDemande.EN_ATTENTE:
        return '⏳';
      case StatutDemande.APPROUVEE:
      case StatutDemande.APPROUVEE_ADMIN:
        return '✅';
      case StatutDemande.REJETEE:
      case StatutDemande.REJETEE_ADMIN:
        return '❌';
      case StatutDemande.EN_COURS:
        return '🔄';
      case StatutDemande.TERMINEE:
        return '🎉';
      default:
        return '📋';
    }
  }

  formatDate(dateString: string): string {
<<<<<<< HEAD
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('fr-FR', {
=======
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}
