import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
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
  successMessage = '';
  rejectModalOpen = false;
  rejectComment = '';
  rejectValidationMessage = '';
  demandeEnCoursDeRefus: DemandeStage | null = null;

  searchQuery = '';
  filtreAdmin: FiltreValidation = 'ALL';
  filtreResponsable: FiltreValidation = 'ALL';

  constructor(
    private serviceDemandeStage: ServiceDemandeStageService,
    private serviceAuthentification: AuthentificationService
  ) {}

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

  private upsertDemandeInState(demande: DemandeStage): void {
    console.log('[AdminDemandesStage] API RESPONSE:', demande);
    if (!demande || !Number.isFinite(demande.id) || demande.id <= 0) return;

    const index = this.demandes.findIndex((item) => item.id === demande.id);
    if (index >= 0) {
      const nextItems = [...this.demandes];
      nextItems[index] = demande;
      this.demandes = nextItems;
    } else {
      this.demandes = [demande, ...this.demandes];
    }

    this.demandesFiltrees = [...this.demandes];
    this.appliquerFiltres();
    console.log('[AdminDemandesStage] UPDATED LIST:', this.demandes);
  }

  chargerDemandes(): void {
    console.log('[AdminDemandesStage] chargerDemandes triggered');
    this.isLoading = true;
    this.errorMessage = '';

    this.serviceDemandeStage.getToutesDemandes().pipe(
      timeout(15000)
    ).subscribe({
      next: (demandes) => {
        try {
          console.log('[AdminDemandesStage] getToutesDemandes success', demandes?.length ?? 0);
          this.demandes = Array.isArray(demandes) ? [...demandes] : [];
          this.appliquerFiltres();
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          console.error('Erreur chargement demandes-stage:', error);
          this.errorMessage = this.extractErrorMessage(error, 'Erreur lors du chargement des demandes.');
        } finally {
          this.isLoading = false;
        }
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
      const matchAdmin = this.matchValidation(this.filtreAdmin, this.getEffectiveAdminStatus(d));
      const statutResp = d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
      const matchResp = this.matchValidation(this.filtreResponsable, statutResp);

      return matchRecherche && matchAdmin && matchResp;
    });
  }

  approuverAdmin(demande: DemandeStage): void {
    console.log('[AdminDemandesStage] approuverAdmin click', demande?.id);
    const adminId = this.serviceAuthentification.getUserId();
    if (!adminId) {
      this.errorMessage = 'Identifiant admin introuvable (session).';
      return;
    }

    if (!confirm(`Valider la demande #${demande.id} en tant qu'administrateur ?`)) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.serviceDemandeStage.validerAdmin(demande.id, adminId).pipe(
      timeout(15000)
    ).subscribe({
      next: (updatedDemande) => {
        try {
          console.log('[AdminDemandesStage] validerAdmin success', demande?.id);
          this.successMessage = this.isFullyValidated(updatedDemande)
            ? `Demande #${demande.id} completement validee. L'entreprise a ete creee automatiquement.`
            : `Demande #${demande.id} validee cote administrateur.`;
          this.upsertDemandeInState(updatedDemande);

          if (!updatedDemande || !Number.isFinite(updatedDemande.id) || updatedDemande.id <= 0) {
            this.chargerDemandes();
          }
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          console.error('Validation admin echouee:', error);
          this.errorMessage = this.extractErrorMessage(error, 'Echec de la validation admin.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  refuserAdmin(demande: DemandeStage): void {
    this.demandeEnCoursDeRefus = demande;
    this.rejectComment = '';
    this.rejectValidationMessage = '';
    this.rejectModalOpen = true;
  }

  fermerFenetreRefus(): void {
    this.rejectModalOpen = false;
    this.rejectComment = '';
    this.rejectValidationMessage = '';
    this.demandeEnCoursDeRefus = null;
  }

  confirmerRefusAdmin(): void {
    const demande = this.demandeEnCoursDeRefus;
    if (!demande) return;

    const adminId = this.serviceAuthentification.getUserId();
    if (!adminId) {
      this.errorMessage = 'Identifiant admin introuvable (session).';
      return;
    }

    const commentaire = this.rejectComment.trim();
    if (!commentaire) {
      this.rejectValidationMessage = 'Veuillez saisir le motif du refus';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.rejectValidationMessage = '';

    this.serviceDemandeStage.refuserAdmin(demande.id, adminId, commentaire).pipe(
      timeout(15000)
    ).subscribe({
      next: (updatedDemande) => {
        try {
          console.log('[AdminDemandesStage] refuserAdmin success', demande?.id);
          this.successMessage = 'La demande a été refusée avec succès';
          this.upsertDemandeInState(updatedDemande);
          this.fermerFenetreRefus();

          if (!updatedDemande || !Number.isFinite(updatedDemande.id) || updatedDemande.id <= 0) {
            this.chargerDemandes();
          }
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          console.error('Refus admin echoue:', error);
          this.errorMessage = this.extractErrorMessage(error, 'Echec du refus admin.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  getTotal(): number {
    return this.demandes.length;
  }

  countDemandesCompletes(): number {
    return this.demandes.filter((d) => this.isFullyValidated(d)).length;
  }

  countAdmin(status: StatutValidation): number {
    return this.demandes.filter((d) => this.getEffectiveAdminStatus(d) === status).length;
  }

  countResponsable(status: StatutValidation): number {
    return this.demandes.filter(
      (d) => (d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === status
    ).length;
  }

  canAdminAct(d: DemandeStage): boolean {
    return d.statut === 'EN_ATTENTE'
      && d.statutValidationAdmin === StatutValidation.EN_ATTENTE
      && (d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) !== StatutValidation.REJETEE;
  }

  getEffectiveAdminStatus(d: DemandeStage): StatutValidation {
    if (d.statut === 'REJETEE' && d.statutValidationAdmin === StatutValidation.EN_ATTENTE) {
      return StatutValidation.REJETEE;
    }
    return d.statutValidationAdmin ?? StatutValidation.EN_ATTENTE;
  }

  badgeClass(statut: StatutValidation | undefined): string {
    switch (statut) {
      case StatutValidation.APPROUVEE:
        return 'badge badge-approved';
      case StatutValidation.REJETEE:
        return 'badge badge-rejected';
      case StatutValidation.EN_ATTENTE:
      default:
        return 'badge badge-pending';
    }
  }

  private matchValidation(filtre: FiltreValidation, statut: StatutValidation | undefined): boolean {
    if (filtre === 'ALL') return true;
    return filtre === (statut ?? StatutValidation.EN_ATTENTE);
  }

  isFullyValidated(d: DemandeStage): boolean {
    const resp = d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
    return d.statutValidationAdmin === StatutValidation.APPROUVEE && resp === StatutValidation.APPROUVEE;
  }

  getGlobalStatusLabel(d: DemandeStage): string {
    if (d.statut === 'REJETEE') return 'REFUSEE';
    if (this.isFullyValidated(d)) return 'VALIDEE';
    if (d.statutValidationAdmin === StatutValidation.APPROUVEE) return 'VALIDEE PAR ADMIN';
    if ((d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE) {
      return 'VALIDEE PAR RESPONSABLE';
    }
    return 'EN ATTENTE';
  }

  badgeClassForDemande(d: DemandeStage): string {
    const label = this.getGlobalStatusLabel(d);
    if (label === 'VALIDEE') return 'badge badge-approved';
    if (label === 'REFUSEE') return 'badge badge-rejected';
    return 'badge badge-pending';
  }
}
