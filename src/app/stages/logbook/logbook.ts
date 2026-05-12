<<<<<<< HEAD
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

@Component({
  selector: 'app-logbook',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './logbook.html',
  styleUrls: ['./logbook.css', '../../company/company-shared.css'],
})
export class Logbook implements OnInit {
  stageId: number | null = null;
  cahier: any | null = null;
  chargement = true;
  signatureEnCours = false;
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

    this.chargerCahier();
  }

  get role(): RoleUtilisateur | null {
    return this.auth.getRoleUtilisateur();
  }

  recharger(): void {
    this.chargerCahier();
  }

  signer(): void {
    if (!this.cahier) return;

    const id = Number(this.cahier.id);
    if (!Number.isFinite(id) || id <= 0) return;

    const endpoint = this.getEndpointSignature(id);
    if (!endpoint) return;

    this.signatureEnCours = true;
    this.messageErreur = '';
    this.messageSucces = '';

    this.http.put<any>(endpoint, {}).pipe(
      catchError((error) => {
        this.messageErreur = error?.error?.message ?? 'La signature a échoué.';
        return of(null);
      })
    ).subscribe((updated) => {
      if (updated) {
        this.cahier = updated;
        this.messageSucces = 'Journal de bord signé.';
      }
      this.signatureEnCours = false;
    });
  }

  peutSigner(): boolean {
    if (!this.cahier) return false;
    if (!this.role) return false;

    switch (this.role) {
      case RoleUtilisateur.STAGIAIRE:
        return !this.cahier.signeeStagiaire;
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return !this.cahier.signeeEncAcad;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return !this.cahier.signeeEncPro;
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return !this.cahier.signeeRespEntreprise;
      default:
        return false;
    }
  }

  private chargerCahier(): void {
    if (!this.stageId) return;

    this.chargement = true;
    this.messageErreur = '';
    this.messageSucces = '';
    this.cahier = null;

    this.http.get<any>(`${API_BASE_URL}/cahiers-stage/stage/${this.stageId}`).pipe(
      catchError((error) => {
        if (error?.status !== 400) {
          this.messageErreur = error?.error?.message ?? 'Impossible de charger le journal de bord.';
        }
        return of(null);
      })
    ).subscribe((cahier) => {
      this.cahier = cahier;
      this.chargement = false;
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
=======
import { Component } from '@angular/core';

@Component({
  selector: 'app-logbook',
  imports: [],
  templateUrl: './logbook.html',
  styleUrl: './logbook.css',
})
export class Logbook {

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
