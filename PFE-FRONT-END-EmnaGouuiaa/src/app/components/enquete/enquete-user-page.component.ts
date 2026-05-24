import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnqueteSatisfaction, EnqueteService } from '../../services/enquete.service';
import { StagePeriodService, StagePeriodStatus } from '../../services/stage-period.service';

/**
 * Page dédiée à la consultation et réponse à l'enquête de satisfaction.
 * Accessible à tous les acteurs : STAGIAIRE, ENCADRANT_PROFESSIONNEL,
 * ENCADRANT_ACADEMIQUE, RESPONSABLE_ENTREPRISE.
 *
 * Utilise GET /api/enquete/acteur (ouvert à tous les rôles authentifiés)
 * pour ne pas provoquer de 401 → déconnexion intempestive.
 *
 * Scénario nominal :
 *   1. Chargement de la configuration de l'enquête.
 *   2. Affichage du statut et du formulaire si l'enquête est active.
 *   3. Clic "Répondre" → ouverture dans un NOUVEL ONGLET (session conservée).
 *   4. Confirmation visible à l'utilisateur après ouverture.
 *
 * Exceptions :
 *   E1 — Enquête non configurée / lien absent.
 *   E2 — URL invalide ou inaccessible.
 *   E3 — Accès refusé (401/403) → message non bloquant, pas de déconnexion.
 */
@Component({
  selector: 'app-enquete-user-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enquete-user-page.component.html',
  styleUrls: ['./enquete-user-page.component.css']
})
export class EnqueteUserPageComponent implements OnInit {

  enquete: EnqueteSatisfaction | null = null;
  isLoading = false;
  errorMessage = '';
  formOpened = false;

  /** null = vérification en cours, true/false = résultat connu. */
  periodStatus: StagePeriodStatus | null = null;

  constructor(
    private enqueteService: EnqueteService,
    private stagePeriodService: StagePeriodService
  ) {}

  ngOnInit(): void {
    this.load();
    this.checkPeriod();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.formOpened = false;

    this.enqueteService.getEnqueteActeur().subscribe({
      next: (data) => {
        this.enquete = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err);
        this.isLoading = false;
      }
    });
  }

  /** Vérifie si la date du jour satisfait la condition d'accès à l'enquête. */
  private checkPeriod(): void {
    this.periodStatus = null;
    this.stagePeriodService.checkAnyPeriodOpen().subscribe({
      next: (status) => {
        this.periodStatus = status;
      },
      error: () => {
        // En cas d'erreur réseau, on laisse l'accès ouvert (best-effort)
        this.periodStatus = { open: true, openDate: null };
      }
    });
  }

  /** True si la vérification de période est terminée et la période est ouverte. */
  get isPeriodOpen(): boolean {
    return this.periodStatus?.open ?? false;
  }

  /** True pendant le chargement de la vérification de période. */
  get isPeriodChecking(): boolean {
    return this.periodStatus === null;
  }

  /** True si l'enquête est active ET que l'URL est un lien http(s) valide. */
  get urlValide(): boolean {
    if (!this.enquete?.active) return false;
    const url = (this.enquete.urlFormulaire ?? '').trim();
    if (!url) return false;
    try {
      const p = new URL(url);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /** Ouvre le formulaire dans un nouvel onglet (session conservée). */
  ouvrirFormulaire(): void {
    if (!this.urlValide) return;
    window.open(this.enquete!.urlFormulaire!, '_blank', 'noopener,noreferrer');
    this.formOpened = true;
  }

  get statusLabel(): string {
    if (!this.enquete) return '';
    if (this.enquete.active && this.urlValide) return 'Ouverte';
    if (this.enquete.active && !this.urlValide) return 'Active (lien absent)';
    return 'Inactive';
  }

  get statusClass(): string {
    if (!this.enquete) return 'badge-neutral';
    if (this.enquete.active && this.urlValide) return 'badge-open';
    if (this.enquete.active) return 'badge-warning';
    return 'badge-closed';
  }

  private describeError(err: any): string {
    if (err?.status === 401)
      return 'E3 — Votre session a expiré. Veuillez vous reconnecter.';
    if (err?.status === 403)
      return 'E3 — Vous n\'êtes pas autorisé à consulter cette enquête.';
    if (err?.status === 404)
      return 'E1 — Lien invalide ou expiré.';
    if (err?.status === 0 || err?.status >= 500)
      return 'E2 — Impossible d\'accéder au formulaire externe. Vérifiez votre connexion Internet.';
    return 'E3 — Problème de connexion Internet.';
  }
}
