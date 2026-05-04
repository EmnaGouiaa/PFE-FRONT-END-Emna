import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

    this.serviceDemandeStage.getToutesDemandes().subscribe({
      next: (demandes) => {
        console.log('[AdminDemandesStage] getToutesDemandes success', demandes?.length ?? 0);
        this.demandes = Array.isArray(demandes) ? [...demandes] : [];
        this.appliquerFiltres();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement demandes-stage:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Erreur lors du chargement des demandes.');
        this.isLoading = false;
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
      const matchAdmin = this.matchValidation(this.filtreAdmin, d.statutValidationAdmin);
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

    this.serviceDemandeStage.validerAdmin(demande.id, adminId).subscribe({
      next: (updatedDemande) => {
        console.log('[AdminDemandesStage] validerAdmin success', demande?.id);
        this.successMessage = `Demande #${demande.id} validee.`;
        this.upsertDemandeInState(updatedDemande);
        this.isLoading = false;

        if (!updatedDemande || !Number.isFinite(updatedDemande.id) || updatedDemande.id <= 0) {
          this.chargerDemandes();
        }
      },
      error: (error) => {
        console.error('Validation admin echouee:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec de la validation admin.');
        this.isLoading = false;
      }
    });
  }

  refuserAdmin(demande: DemandeStage): void {
    console.log('[AdminDemandesStage] refuserAdmin click', demande?.id);
    const adminId = this.serviceAuthentification.getUserId();
    if (!adminId) {
      this.errorMessage = 'Identifiant admin introuvable (session).';
      return;
    }

    const commentaire = prompt('Motif de refus (optionnel) :') ?? undefined;
    if (!confirm(`Refuser la demande #${demande.id} en tant qu'administrateur ?`)) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.serviceDemandeStage.refuserAdmin(demande.id, adminId, commentaire).subscribe({
      next: (updatedDemande) => {
        console.log('[AdminDemandesStage] refuserAdmin success', demande?.id);
        this.successMessage = `Demande #${demande.id} refusee.`;
        this.upsertDemandeInState(updatedDemande);
        this.isLoading = false;

        if (!updatedDemande || !Number.isFinite(updatedDemande.id) || updatedDemande.id <= 0) {
          this.chargerDemandes();
        }
      },
      error: (error) => {
        console.error('Refus admin echoue:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec du refus admin.');
        this.isLoading = false;
      }
    });
  }

  creerEntreprise(demande: DemandeStage): void {
    console.log('[AdminDemandesStage] creerEntreprise click', demande?.id);
    if (!confirm(`Creer l'entreprise pour la demande #${demande.id} ?`)) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.serviceDemandeStage.creerEntreprise(demande.id).subscribe({
      next: (updatedDemande) => {
        console.log('[AdminDemandesStage] creerEntreprise success', demande?.id);
        this.successMessage = `Entreprise creee depuis la demande #${demande.id}.`;
        this.upsertDemandeInState(updatedDemande as DemandeStage);
        this.isLoading = false;

        const hasValidId = Number.isFinite((updatedDemande as any)?.id) && Number((updatedDemande as any)?.id) > 0;
        if (!hasValidId) {
          this.chargerDemandes();
        }
      },
      error: (error) => {
        console.error('Creation entreprise echouee:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec de la creation entreprise.');
        this.isLoading = false;
      }
    });
  }

  getTotal(): number {
    return this.demandes.length;
  }

  countAdmin(status: StatutValidation): number {
    return this.demandes.filter((d) => d.statutValidationAdmin === status).length;
  }

  countResponsable(status: StatutValidation): number {
    return this.demandes.filter(
      (d) => (d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) === status
    ).length;
  }

  canAdminAct(d: DemandeStage): boolean {
    return d.statutValidationAdmin === StatutValidation.EN_ATTENTE;
  }

  canCreerEntreprise(d: DemandeStage): boolean {
    const resp = d.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
    return d.statutValidationAdmin === StatutValidation.APPROUVEE && resp === StatutValidation.APPROUVEE;
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
}
