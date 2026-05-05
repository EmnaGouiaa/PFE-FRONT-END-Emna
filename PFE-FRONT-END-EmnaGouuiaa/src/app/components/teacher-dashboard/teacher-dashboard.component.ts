import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';

type StageSujetStatus = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | string;
type StageStatus = string;

type StageBackend = {
  id: number;
  titre?: string | null;
  sujet?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: StageStatus | null;
  statutSujet?: StageSujetStatus | null;
  stagiaire?: { nom?: string | null; prenom?: string | null; email?: string | null } | null;
  entreprise?: { nom?: string | null } | null;
};

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: [
    '../../admin/layout/admin-layout.component.css',
    '../../company/company-shared.css',
    './teacher-dashboard.component.css'
  ]
})
export class TeacherDashboard implements OnInit {
  stages: StageBackend[] = [];
  isLoading = false;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';
  profileCompletionMissingFields: string[] = [];

  private role: RoleUtilisateur | null = null;

  constructor(
    private auth: AuthentificationService,
    private http: HttpClient,
    private router: Router,
    private currentUserProfileService: CurrentUserProfileService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  ngOnInit(): void {
    this.role = this.auth.getRoleUtilisateur();
    this.currentUserProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.profileCompletionMissingFields =
          this.profileCompletionService.getMissingFieldsForCurrentProfile(profile);
      },
      error: () => {
        this.profileCompletionMissingFields = [];
      }
    });
    this.loadStages();
  }

  get fullName(): string {
    return this.auth.getNomComplet() || 'Encadrant';
  }

  get roleLabel(): string {
    switch (this.role) {
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return 'Encadrant academique';
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return 'Encadrant professionnel';
      default:
        return 'Encadrant';
    }
  }

  get totalStages(): number {
    return this.stages.length;
  }

  get activeStages(): number {
    return this.stages.filter((stage) => {
      const status = String(stage.statut ?? '').toUpperCase();
      return ['EN_COURS', 'VALIDE_PAR_ENTREPRISE', 'VALIDE_PAR_RESPONSABLE', 'AFFECTEE'].includes(status);
    }).length;
  }

  get pendingTopics(): number {
    return this.stages.filter((stage) =>
      String(stage.statutSujet ?? '') === 'EN_ATTENTE' && !!(stage.sujet ?? '').trim()
    ).length;
  }

  get validatedTopics(): number {
    return this.stages.filter((stage) => String(stage.statutSujet ?? '') === 'VALIDEE').length;
  }

  get pendingTopicStages(): StageBackend[] {
    return this.stages.filter((stage) =>
      String(stage.statutSujet ?? '') === 'EN_ATTENTE' && !!(stage.sujet ?? '').trim()
    ).slice(0, 4);
  }

  get isAcademicSupervisor(): boolean {
    return this.role === RoleUtilisateur.ENCADRANT_ACADEMIQUE;
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  loadStages(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const userId = this.auth.getUserId();
    const url = this.getStagesUrl(userId);
    if (!url) {
      this.stages = [];
      this.errorMessage = 'Impossible de determiner le role ou l identifiant utilisateur.';
      this.isLoading = false;
      return;
    }

    this.http.get<StageBackend[]>(url).pipe(
      catchError((error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de charger les stages.';
        return of([] as StageBackend[]);
      })
    ).subscribe((stages) => {
      this.stages = Array.isArray(stages) ? stages : [];
      this.isLoading = false;
    });
  }

  validerSujet(stage: StageBackend): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put(`${API_BASE_URL}/stages/${stage.id}/valider-sujet/${userId}`, {}).pipe(
      catchError((error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de valider le sujet.';
        return of(null);
      })
    ).subscribe(() => {
      if (!this.errorMessage) {
        this.successMessage = 'Sujet valide avec succes.';
      }
      this.isUpdating = false;
      this.loadStages();
    });
  }

  refuserSujet(stage: StageBackend): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put(`${API_BASE_URL}/stages/${stage.id}/refuser-sujet/${userId}`, {}).pipe(
      catchError((error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de refuser le sujet.';
        return of(null);
      })
    ).subscribe(() => {
      if (!this.errorMessage) {
        this.successMessage = 'Sujet refuse.';
      }
      this.isUpdating = false;
      this.loadStages();
    });
  }

  peutValiderSujet(stage: StageBackend): boolean {
    const userId = this.auth.getUserId();
    if (!userId) return false;
    if (this.role !== RoleUtilisateur.ENCADRANT_ACADEMIQUE) return false;
    return String(stage.statutSujet ?? '') === 'EN_ATTENTE' && !!(stage.sujet ?? '').trim();
  }

  getStagiaireNom(stage: StageBackend): string {
    const prenom = stage.stagiaire?.prenom ?? '';
    const nom = stage.stagiaire?.nom ?? '';
    const full = `${prenom} ${nom}`.trim();
    return full || '-';
  }

  statutSujetLabel(statutSujet: StageSujetStatus | null | undefined): string {
    switch (String(statutSujet ?? '')) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'VALIDEE':
        return 'Valide';
      case 'REFUSEE':
        return 'Refuse';
      default:
        return statutSujet ? String(statutSujet) : '-';
    }
  }

  statutSujetClass(statutSujet: StageSujetStatus | null | undefined): string {
    switch (String(statutSujet ?? '')) {
      case 'VALIDEE':
        return 'status-positive';
      case 'REFUSEE':
        return 'status-negative';
      case 'EN_ATTENTE':
        return 'status-warning';
      default:
        return 'status-neutral';
    }
  }

  statutStageClass(statut: StageStatus | null | undefined): string {
    const normalized = String(statut ?? '').toUpperCase();
    return normalized ? `status-${normalized}` : 'status-neutral';
  }

  formatPeriod(stage: StageBackend): string {
    const start = stage.dateDebut || '-';
    const end = stage.dateFin || '-';
    return `${start} -> ${end}`;
  }

  private getStagesUrl(userId: number | null): string | null {
    if (!userId) return null;
    if (this.role === RoleUtilisateur.ENCADRANT_ACADEMIQUE) {
      return `${API_BASE_URL}/stages/encadrant-academique/${userId}`;
    }
    if (this.role === RoleUtilisateur.ENCADRANT_PROFESSIONNEL) {
      return `${API_BASE_URL}/stages/encadrant-professionnel/${userId}`;
    }
    return null;
  }

  logout(): void {
    this.auth.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
