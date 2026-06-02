import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { StageSignatureSyncService } from '../../services/stage-signature-sync.service';
import { StudentPortalService } from '../../services/student/student-portal.service';
import {
  canSignLogbook,
  getLogbookSignBlockedReason,
} from '../../shared/stage-documents/stage-document-signature-eligibility.util';

interface CahierContenu {
  cahier: any | null;
  informationsGenerales: {
    titre: string;
    sujet: string;
    dateDebut: string;
    dateFin: string;
    stagiaireNom: string;
    stagiaireEmail: string;
    encadrantAcademiqueNom: string;
    encadrantAcademiqueEmail: string;
    encadrantProfessionnelNom: string;
    encadrantProfessionnelEmail: string;
    entrepriseNom: string;
    entrepriseEmail: string;
    entrepriseTelephone: string;
    entrepriseSecteur: string;
  };
  reunionsHebdomadaires: Array<{
    numReunion: string;
    date: string;
    heure: string;
    observationEncadrant: string;
    nomEncadrantCreateur: string;
    typeEncadrantCreateur: string;
  }>;
  tachesTrelloParColonne: Record<string, Array<{ nom: string; description: string }>>;
  trelloSynchronise: boolean;
  absences: Array<{
    date: string;
    nombreJours: number;
    statut: string;
    justification: string;
    commentaire: string;
  }>;
  pdfDisponible: boolean;
  raisonsPdfIndisponible: string[];
}

@Component({
  selector: 'app-logbook',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './logbook.html',
  styleUrls: ['./logbook.css', '../../company/company-shared.css'],
})
export class Logbook implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly signatureSync = inject(StageSignatureSyncService);
  private readonly studentPortal = inject(StudentPortalService);
  private liveSyncStageId: number | null = null;

  stageId: number | null = null;
  cahier: any | null = null;
  contenu: CahierContenu | null = null;
  trelloColumns: string[] = ['A faire', 'En cours', 'Termine'];
  chargement = true;
  signatureEnCours = false;
  pdfEnCours = false;
  messageErreur = '';
  messageSucces = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthentificationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.stageId = Number.isFinite(id) && id > 0 ? id : null;

    if (!this.stageId) {
      this.messageErreur = 'Identifiant de stage invalide.';
      this.chargement = false;
      return;
    }

    this.chargerContenu();
  }

  get role(): RoleUtilisateur | null {
    return this.auth.getRoleUtilisateur();
  }

  recharger(): void {
    this.chargerContenu();
  }

  signer(): void {
    if (!this.cahier) return;

    const id = Number(this.cahier.id);
    if (!Number.isFinite(id) || id <= 0) return;

    if (!this.peutSigner()) {
      return;
    }

    const endpoint = this.getEndpointSignature(id);
    if (!endpoint) return;

    this.signatureEnCours = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.http.put<any>(endpoint, {}).pipe(
      catchError((error) => {
        this.messageErreur = this.extractErrorMessage(error, 'La signature a échoué.');
        return of(null);
      })
    ).subscribe((updated) => {
      if (updated) {
        this.cahier = updated;
        if (this.stageId) {
          this.signatureSync.notifyStageUpdated(this.stageId);
        }
        this.messageSucces = 'Cahier de stage signé avec succès.';
        this.chargerContenu();
      }
      this.signatureEnCours = false;
    });
  }

  telechargerPdf(): void {
    if (!this.stageId || !this.contenu?.pdfDisponible) {
      return;
    }
    this.pdfEnCours = true;
    this.studentPortal.downloadStageDocumentPdf(this.stageId, 'cahier-stage').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `cahier-stage-${this.stageId}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.pdfEnCours = false;
      },
      error: (error) => {
        this.pdfEnCours = false;
        this.messageErreur = this.extractErrorMessage(error, 'Impossible de télécharger le PDF du cahier.');
      }
    });
  }

  formatSignatureDate(raw: string | null | undefined): string {
    if (!raw) return '—';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString('fr-FR');
  }

  signatureLabel(roleKey: string): string {
    const map: Record<string, string> = {
      STAGIAIRE: 'Stagiaire',
      ENCADRANT_ACADEMIQUE: 'Encadrant académique',
      ENCADRANT_PROFESSIONNEL: 'Encadrant professionnel',
      RESPONSABLE_ENTREPRISE: 'Responsable entreprise'
    };
    return map[roleKey] ?? roleKey;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const msg = error?.error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    if (typeof error?.error === 'string' && error.error.trim()) return error.error.trim();
    return fallback;
  }

  peutSigner(): boolean {
    if (!this.cahier || !this.role) return false;

    const info = this.contenu?.informationsGenerales;
    const alreadySigned = (() => {
      switch (this.role) {
        case RoleUtilisateur.STAGIAIRE:
          return Boolean(this.cahier.signeeStagiaire);
        case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
          return Boolean(this.cahier.signeeEncAcad);
        case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
          return Boolean(this.cahier.signeeEncPro);
        case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
          return Boolean(this.cahier.signeeRespEntreprise);
        default:
          return true;
      }
    })();

    if (alreadySigned) {
      return false;
    }

    return canSignLogbook({
      dateFin: info?.dateFin,
      dateDebut: info?.dateDebut,
      alreadySigned: false,
      hasDocument: true,
    });
  }

  get logbookSignBlockedReason(): string {
    const info = this.contenu?.informationsGenerales;
    return getLogbookSignBlockedReason(info?.dateFin, info?.dateDebut);
  }

  private chargerContenu(): void {
    if (!this.stageId) return;

    this.chargement = true;
    this.messageErreur = '';
    this.messageSucces = '';
    this.contenu = null;
    this.cahier = null;

    this.http.get<CahierContenu>(`${API_BASE_URL}/cahiers-stage/stage/${this.stageId}/contenu`).pipe(
      catchError((error) => {
        this.messageErreur = this.extractErrorMessage(error, 'Impossible de charger le cahier de stage.');
        return of(null);
      })
    ).subscribe((contenu) => {
      this.contenu = contenu;
      this.cahier = contenu?.cahier ?? null;
      this.chargement = false;
      if (this.stageId && this.cahier) {
        this.startLiveSignatureSync(this.stageId);
      }
    });
  }

  private startLiveSignatureSync(stageId: number): void {
    if (this.liveSyncStageId === stageId) {
      return;
    }
    this.liveSyncStageId = stageId;

    this.signatureSync
      .watchSignatureBundle(stageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bundle) => {
        if (bundle.cahier) {
          this.cahier = bundle.cahier;
        }
      });
  }

  private getEndpointSignature(cahierId: number): string | null {
    switch (this.role) {
      case RoleUtilisateur.STAGIAIRE:
        return `${API_BASE_URL}/cahiers-stage/${cahierId}/signer-stagiaire`;
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return `${API_BASE_URL}/cahiers-stage/${cahierId}/signer-encadrant-academique`;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return `${API_BASE_URL}/cahiers-stage/${cahierId}/signer-encadrant-professionnel`;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return `${API_BASE_URL}/cahiers-stage/${cahierId}/signer-responsable-entreprise`;
      default:
        return null;
    }
  }
}
