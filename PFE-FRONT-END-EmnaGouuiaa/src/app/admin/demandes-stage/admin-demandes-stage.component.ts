import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs/operators';
import { ServiceDemandeStageService } from '../../services/service-demande-stage.service';
import { DemandeStage, StatutValidation } from '../../models/demande-stage.model';

type FiltreValidation = 'ALL' | 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';

@Component({
  selector: 'app-admin-demandes-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demandes-stage.component.html',
  styleUrls: ['./admin-demandes-stage.component.css']
})
export class AdminDemandesStageComponent implements OnInit {
  readonly StatutValidation = StatutValidation;

  demandes: DemandeStage[] = [];
  demandesFiltrees: DemandeStage[] = [];
  isLoading = false;
  errorMessage = '';

  searchQuery = '';
  filtreValidationResponsable: FiltreValidation = 'ALL';

  constructor(private serviceDemandeStage: ServiceDemandeStageService) {}

  ngOnInit(): void {
    this.chargerDemandes();
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

  chargerDemandes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.serviceDemandeStage.getToutesDemandes().pipe(
      timeout(15000),
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      next: (demandes) => {
        this.demandes = Array.isArray(demandes) ? [...demandes] : [];
        this.appliquerFiltres();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(
          error,
          error?.name === 'TimeoutError'
            ? 'Le serveur met trop de temps à répondre. Veuillez réessayer.'
            : 'Erreur lors du chargement des demandes.'
        );
      }
    });
  }

  appliquerFiltres(): void {
    const recherche = this.searchQuery.trim().toLowerCase();

    this.demandesFiltrees = (this.demandes ?? []).filter((d) => {
      const cible = [
        d.nomEntreprise,
        d.emailEntreprise,
        d.etudiant?.prenom,
        d.etudiant?.nom,
        d.etudiant?.email,
        d.nomEncadrant,
        d.emailEncadrant,
        d.sujetStage
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchRecherche = !recherche || cible.includes(recherche);
      const statutResp = d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
      const matchResp = this.matchValidation(this.filtreValidationResponsable, statutResp);

      return matchRecherche && matchResp;
    });
  }

  getTotal(): number {
    return this.demandes.length;
  }

  countResponsable(status: StatutValidation): number {
    return this.demandes.filter(
      (d) => (d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === status
    ).length;
  }

  countDemandesCompletes(): number {
    return this.demandes.filter((d) => this.isFullyValidated(d)).length;
  }

  isFullyValidated(d: DemandeStage): boolean {
    return (d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE;
  }

  getGlobalStatusLabel(d: DemandeStage): string {
    if (d.statut === 'REJETEE') return 'REFUSEE';
    if (this.isFullyValidated(d)) return 'VALIDEE';
    return 'EN ATTENTE';
  }

  badgeClass(statut: StatutValidation | undefined): string {
    switch (statut) {
      case StatutValidation.APPROUVEE: return 'badge badge-approved';
      case StatutValidation.REJETEE:   return 'badge badge-rejected';
      default:                          return 'badge badge-pending';
    }
  }

  badgeClassForDemande(d: DemandeStage): string {
    const label = this.getGlobalStatusLabel(d);
    if (label === 'VALIDEE') return 'badge badge-approved';
    if (label === 'REFUSEE') return 'badge badge-rejected';
    return 'badge badge-pending';
  }

  private matchValidation(filtre: FiltreValidation, statut: StatutValidation | undefined): boolean {
    if (filtre === 'ALL') return true;
    return filtre === (statut ?? StatutValidation.EN_ATTENTE);
  }
}
