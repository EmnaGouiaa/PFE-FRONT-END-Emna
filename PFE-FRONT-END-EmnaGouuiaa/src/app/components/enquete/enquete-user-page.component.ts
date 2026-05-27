import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnqueteStageDto, EnqueteService } from '../../services/enquete.service';
import { StagePeriodService } from '../../services/stage-period.service';

/**
 * Page dédiée à la consultation et réponse à l'enquête de satisfaction.
 * Accessible aux rôles : STAGIAIRE, ENCADRANT_PROFESSIONNEL,
 * ENCADRANT_ACADEMIQUE, RESPONSABLE_ENTREPRISE.
 *
 * Flux nominal :
 *   1. Résolution du stageId de l'utilisateur connecté (via StagePeriodService).
 *   2. Appel à GET /api/enquete/stage/{stageId} qui applique la règle des 7 jours.
 *   3. Affichage selon le statut retourné par le backend :
 *        "Ouverte"        → bouton "Répondre à l'enquête" actif
 *        "Fermée"         → "La période de réponse à l'enquête est expirée."
 *        "En attente"     → "L'enquête sera accessible à la fin de votre stage."
 *        "Désactivée"     → "L'enquête est temporairement désactivée."
 *        "Non configurée" → "L'enquête n'est pas encore configurée."
 *
 * Sécurité :
 *   - L'URL du formulaire n'est transmise par le backend QUE si la fenêtre est active.
 *   - GET /api/enquete/acteur ne retourne plus l'URL (masquée côté backend).
 *   - Aucun contournement possible via un autre endpoint.
 */
@Component({
  selector: 'app-enquete-user-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enquete-user-page.component.html',
  styleUrls: ['./enquete-user-page.component.css']
})
export class EnqueteUserPageComponent implements OnInit {

  enquete: EnqueteStageDto | null = null;
  isLoading = false;
  errorMessage = '';
  formOpened = false;

  constructor(
    private enqueteService: EnqueteService,
    private stagePeriodService: StagePeriodService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.formOpened = false;
    this.enquete = null;

    // Étape 1 : résoudre le stageId de l'utilisateur
    this.stagePeriodService.getRelevantStageIdForEnquete().subscribe({
      next: (stageId) => {
        if (!stageId) {
          // Aucun stage trouvé → afficher état "En attente" sans URL
          this.enquete = {
            titre: 'Enquête de satisfaction',
            description: '',
            urlFormulaire: '',
            statut: 'En attente',
            sectionEnqueteOuverte: false,
            message: "Aucun stage actif trouvé. L'enquête sera accessible après la fin de votre stage."
          };
          this.isLoading = false;
          return;
        }

        // Étape 2 : appeler /api/enquete/stage/{id} pour obtenir le statut calculé
        this.enqueteService.getEnqueteParStage(stageId).subscribe({
          next: (data) => {
            this.enquete = data;
            this.isLoading = false;
          },
          error: (err) => {
            this.errorMessage = this.describeError(err);
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Impossible de déterminer votre stage actuel. Vérifiez votre connexion.';
        this.isLoading = false;
      }
    });
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  /** true si la fenêtre de 7 jours est expirée (statut "Fermée"). */
  get isExpired(): boolean {
    return this.enquete?.statut === 'Fermée';
  }

  /** true si l'enquête est ouverte ET que l'URL est valide. */
  get isOpen(): boolean {
    return this.enquete?.sectionEnqueteOuverte === true && this.urlValide;
  }

  /** true si l'URL fournie par le backend est un lien http(s) valide. */
  get urlValide(): boolean {
    const url = (this.enquete?.urlFormulaire ?? '').trim();
    if (!url) return false;
    try {
      const p = new URL(url);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch {
      return false;
    }
  }

  get statusLabel(): string {
    return this.enquete?.statut ?? '';
  }

  get statusClass(): string {
    switch (this.enquete?.statut) {
      case 'Ouverte':        return 'badge-open';
      case 'Fermée':         return 'badge-closed';
      case 'Désactivée':     return 'badge-closed';
      case 'Non configurée': return 'badge-warning';
      default:               return 'badge-neutral';
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Ouvre le formulaire dans un nouvel onglet (session conservée). */
  ouvrirFormulaire(): void {
    if (!this.urlValide || !this.isOpen) return;
    window.open(this.enquete!.urlFormulaire!, '_blank', 'noopener,noreferrer');
    this.formOpened = true;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private describeError(err: any): string {
    if (err?.status === 401)
      return 'E3 — Votre session a expiré. Veuillez vous reconnecter.';
    if (err?.status === 403)
      return 'E3 — Vous n\'êtes pas autorisé à consulter cette enquête.';
    if (err?.status === 404)
      return 'E1 — Stage introuvable ou enquête non configurée.';
    if (err?.status === 0 || err?.status >= 500)
      return 'E2 — Impossible d\'accéder au serveur. Vérifiez votre connexion Internet.';
    return 'Problème de connexion. Veuillez réessayer.';
  }
}
