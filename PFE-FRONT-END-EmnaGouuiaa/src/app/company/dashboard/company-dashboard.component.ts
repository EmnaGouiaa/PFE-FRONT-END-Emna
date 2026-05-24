import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyOffersService } from '../../services/company/company-offers.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyContext, CompanyInternship, CompanyOffer } from '../../services/company/company.models';
import { ProfileCompletionService } from '../../services/profile-completion.service';
@Component({
  selector: 'app-company-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-dashboard.component.html',
  styleUrls: ['../company-shared.css']
})
export class CompanyDashboardPageComponent implements OnInit {
  context: CompanyContext | null = null;
  offers: CompanyOffer[] = [];
  internships: CompanyInternship[] = [];
  recentOffers: CompanyOffer[] = [];
  recentInternships: CompanyInternship[] = [];
  isLoading = false;
  errorMessage = '';
  profileCompletionMissingFields: string[] = [];

  stats = {
    totalOffers: 0,
    activeOffers: 0,
    assignedInterns: 0,
    ongoingInternships: 0
  };

  constructor(
    private companyContextService: CompanyContextService,
    private companyOffersService: CompanyOffersService,
    private companyInternshipsService: CompanyInternshipsService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.profileCompletionMissingFields = [];

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;
        this.profileCompletionMissingFields =
          this.profileCompletionService.getMissingFieldsForCompany(context);

        const entrepriseId = context.responsable.entrepriseId;
        if (!entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachée à ce compte.";
          this.isLoading = false;
          return;
        }

        forkJoin({
          offers: this.companyOffersService.listByEntreprise(entrepriseId),
          internships: this.companyInternshipsService.listByEntreprise(entrepriseId)
        })
          .pipe(timeout(15000))
          .subscribe({
            next: ({ offers, internships }) => {
              this.offers = offers;
              this.internships = internships;
              this.recentOffers = [...offers]
                .sort((a, b) => this.compareDates(b.datePublication || b.dateDebutPrevue, a.datePublication || a.dateDebutPrevue))
                .slice(0, 4);
              this.recentInternships = [...internships]
                .sort((a, b) => this.compareDates(b.dateDebut, a.dateDebut))
                .slice(0, 4);
              this.computeStats();
              this.isLoading = false;
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? 'Impossible de charger le tableau de bord entreprise.';
              this.isLoading = false;
            }
          });
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  private computeStats(): void {
    this.stats.totalOffers = this.offers.length;
    this.stats.activeOffers = this.offers.filter((offer) =>
      ['PUBLIEE', 'VALIDEE'].includes(offer.statut)
    ).length;
    this.stats.assignedInterns = this.internships.length;
    this.stats.ongoingInternships = this.internships.filter((internship) =>
      ['EN_COURS', 'VALIDE_PAR_ENTREPRISE', 'VALIDE_PAR_RESPONSABLE'].includes(internship.statut)
    ).length;
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  // ── Display helpers (moved from template to keep HTML clean) ─────────────

  get nomEntrepriseDashboard(): string {
    return this.context?.entreprise?.nomEntreprise
      || this.context?.responsable?.entrepriseNom
      || 'votre entreprise';
  }

  getTitreStage(internship: CompanyInternship): string {
    return internship?.titre || internship?.sujet || 'Stage sans titre';
  }

  getStagiaireNom(internship: CompanyInternship): string {
    return internship?.stagiaireNom || 'Stagiaire non affecté';
  }

  getEncadrantNom(internship: CompanyInternship): string {
    return internship?.encadrantAcademiqueNom || '-';
  }

  getTitreOffre(offer: CompanyOffer): string {
    return offer?.titre || 'Offre sans titre';
  }

  getProfilOffre(offer: CompanyOffer): string {
    return offer?.profilRecherche || 'Profil non précisé';
  }

  getDescriptionOffre(offer: CompanyOffer): string {
    return offer?.descriptionMissions || 'Aucune description renseignée pour cette offre.';
  }

  getDateDebutOffre(offer: CompanyOffer): string {
    return offer?.dateDebutPrevue || '-';
  }

  formatDureeOffre(offer: CompanyOffer): string {
    return offer?.duree ? `${offer.duree} mois` : '-';
  }

  getDatePublicationOffre(offer: CompanyOffer): string {
    return offer?.datePublication || '-';
  }

  private compareDates(left: string, right: string): number {
    const leftTime = Date.parse(left || '');
    const rightTime = Date.parse(right || '');

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return 0;
    }
    if (Number.isNaN(leftTime)) {
      return -1;
    }
    if (Number.isNaN(rightTime)) {
      return 1;
    }

    return leftTime - rightTime;
  }
}
