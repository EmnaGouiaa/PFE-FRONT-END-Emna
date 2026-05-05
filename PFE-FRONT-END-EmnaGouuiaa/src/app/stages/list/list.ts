import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { ConventionStage } from '../../models/convention-stage.model';
import { ServiceConventionService } from '../../services/service-convention.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './list.html',
  styleUrls: ['./list.css', '../../company/company-shared.css'],
})
export class List implements OnInit {
  stages: any[] = [];
  stagesFiltres: any[] = [];
  stageSelectionne: any | null = null;

  conventionSelectionnee: ConventionStage | null = null;
  chargementConvention = false;

  chargement = false;
  messageErreur = '';
  recherche = '';

  constructor(
    private http: HttpClient,
    private auth: AuthentificationService,
    private conventions: ServiceConventionService
  ) {}

  ngOnInit(): void {
    this.chargerStages();
  }

  chargerStages(): void {
    this.chargement = true;
    this.messageErreur = '';
    this.stageSelectionne = null;
    this.conventionSelectionnee = null;

    const url = this.getStagesUrl();
    if (!url) {
      this.stages = [];
      this.stagesFiltres = [];
      this.messageErreur = 'Impossible de déterminer le rôle ou l’identifiant utilisateur.';
      this.chargement = false;
      return;
    }

    this.http.get<any[]>(url).pipe(
      catchError((error) => {
        this.messageErreur = error?.error?.message ?? 'Impossible de charger les stages.';
        return of([] as any[]);
      })
    ).subscribe((stages) => {
      this.stages = Array.isArray(stages) ? stages : [];
      this.stagesFiltres = this.stages;
      this.stageSelectionne = this.stages[0] ?? null;

      if (this.stageSelectionne) {
        this.chargerConvention(this.stageSelectionne.id);
      }

      this.appliquerFiltre();
      this.chargement = false;
    });
  }

  appliquerFiltre(): void {
    const q = this.recherche.trim().toLowerCase();
    if (!q) {
      this.stagesFiltres = this.stages;
      return;
    }

    this.stagesFiltres = this.stages.filter((stage) => {
      const pieces = [
        stage?.titre,
        stage?.sujet,
        stage?.entreprise?.nom,
        stage?.stagiaire?.prenom,
        stage?.stagiaire?.nom,
        stage?.stagiaire?.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return pieces.includes(q);
    });
  }

  selectionner(stage: any): void {
    this.stageSelectionne = stage;
    this.chargerConvention(stage?.id);
  }

  private chargerConvention(stageId: number): void {
    const id = Number(stageId);
    if (!Number.isFinite(id) || id <= 0) {
      this.conventionSelectionnee = null;
      return;
    }

    this.chargementConvention = true;
    this.conventionSelectionnee = null;

    this.conventions.getConventionParStage(id).subscribe({
      next: (convention) => {
        this.conventionSelectionnee = convention;
        this.chargementConvention = false;
      },
      error: () => {
        this.conventionSelectionnee = null;
        this.chargementConvention = false;
      }
    });
  }

  private getStagesUrl(): string | null {
    const role = this.auth.getRoleUtilisateur();
    const userId = this.auth.getUserId();

    if (!role) return null;

    switch (role) {
      case RoleUtilisateur.STAGIAIRE:
        return userId ? `${API_BASE_URL}/stages/stagiaire/${userId}` : null;
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return userId ? `${API_BASE_URL}/stages/encadrant-academique/${userId}` : null;
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return userId ? `${API_BASE_URL}/stages/encadrant-professionnel/${userId}` : null;
      case RoleUtilisateur.ADMINISTRATEUR:
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        return `${API_BASE_URL}/stages`;
      default:
        return `${API_BASE_URL}/stages`;
    }
  }
}
