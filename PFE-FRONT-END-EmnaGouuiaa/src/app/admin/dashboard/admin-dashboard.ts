import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { UserManagementService, User } from '../../services/user-management.service';
import { Entreprise, EntreprisesService } from '../../services/entreprises.service';
import { RoleUtilisateur } from '../../services/authentification.service';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';

type ApiStatus = 'loading' | 'ok' | 'error';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
  stats = {
    totalUsers: 0,
    students: 0,
    teachers: 0,
    companies: 0
  };

  recentUsers: User[] = [];
  errorMessage = '';
  profileCompletionMissingFields: string[] = [];

  greeting = 'Bonjour';
  subtitle = "Vue d'ensemble des utilisateurs, rôles et santé de la plateforme.";
  lastUpdatedAt: Date | null = null;
  isLoadingUsers = false;
  isLoadingEntreprises = false;

  apiStatus: { users: ApiStatus; entreprises: ApiStatus } = {
    users: 'loading',
    entreprises: 'loading'
  };

  kpis = {
    activeUsers: 0,
    inactiveUsers: 0,
    admins: 0,
    managers: 0,
    entrepriseReps: 0,
    activationRate: 0
  };

  entreprises = {
    total: 0,
    active: 0
  };

  roleDistribution: Array<{
    role: string;
    label: string;
    count: number;
    pct: number;
    badgeClass: string;
  }> = [];

  constructor(
    private userManagementService: UserManagementService,
    private entreprisesService: EntreprisesService,
    private currentUserProfileService: CurrentUserProfileService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  get isLoading(): boolean {
    return this.isLoadingUsers || this.isLoadingEntreprises;
  }

  ngOnInit(): void {
    this.greeting = this.computeGreeting();
    this.loadProfileCompletion();
    this.loadStats();
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  // ── Display helpers (logic extracted from template) ──────────────────────

  get syncStatusLabel(): string {
    if (this.isLoading && !this.lastUpdatedAt) return 'Synchronisation…';
    if (this.lastUpdatedAt) return this.formatShortDate(this.lastUpdatedAt);
    return 'En attente';
  }

  get entreprisesStatusChip(): string {
    if (this.apiStatus.entreprises === 'ok') return `${this.entreprises.active} actives`;
    if (this.apiStatus.entreprises === 'loading') return 'Chargement…';
    return 'API indisponible';
  }

  get usersApiStatusLabel(): string {
    if (this.apiStatus.users === 'ok') return 'Connectée';
    if (this.apiStatus.users === 'error') return 'Erreur / indisponible';
    return 'Connexion…';
  }

  get entreprisesApiStatusLabel(): string {
    if (this.apiStatus.entreprises === 'ok') return `${this.entreprises.total} entreprise(s)`;
    if (this.apiStatus.entreprises === 'error') return 'Erreur / indisponible';
    return 'Connexion…';
  }

  get derniereMAJLabel(): string {
    return this.lastUpdatedAt ? this.formatShortDate(this.lastUpdatedAt) : '-';
  }

  formatShortDate(date: Date): string {
    return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  loadStats(): void {
    console.log('[AdminDashboard] loadStats triggered');
    this.errorMessage = '';
    this.loadUsers();
    this.loadEntreprises();
  }

  private loadProfileCompletion(): void {
    this.currentUserProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.profileCompletionMissingFields =
          this.profileCompletionService.getMissingFieldsForCurrentProfile(profile);
      },
      error: () => {
        this.profileCompletionMissingFields = [];
      }
    });
  }

  private loadUsers(): void {
    this.isLoadingUsers = true;
    this.apiStatus.users = 'loading';

    this.userManagementService.getAllUsers().pipe(
      timeout(15000)
    ).subscribe({
      next: (users) => {
        try {
          const safeUsers = Array.isArray(users) ? [...users] : [];
          console.log('[AdminDashboard] loadUsers success', safeUsers.length);
          this.apiStatus.users = 'ok';
          this.applyUserStats(safeUsers);
          this.recentUsers = [...safeUsers].slice(-5).reverse();
          this.lastUpdatedAt = new Date();
          this.errorMessage = this.computeErrorMessage();
        } finally {
          this.isLoadingUsers = false;
        }
      },
      error: (error) => {
        try {
          console.error('Error loading users:', error);
          this.apiStatus.users = 'error';
          this.applyUserStats([]);
          this.recentUsers = [];
          this.errorMessage = this.computeErrorMessage();
        } finally {
          this.isLoadingUsers = false;
        }
      }
    });
  }

  private loadEntreprises(): void {
    this.isLoadingEntreprises = true;
    this.apiStatus.entreprises = 'loading';

    this.entreprisesService.list().pipe(
      timeout(15000)
    ).subscribe({
      next: (entreprises) => {
        try {
          const safeEntreprises = Array.isArray(entreprises) ? [...entreprises] : [];
          console.log('[AdminDashboard] loadEntreprises success', safeEntreprises.length);
          this.apiStatus.entreprises = 'ok';
          this.applyEntrepriseStats(safeEntreprises);
          this.lastUpdatedAt = new Date();
          this.errorMessage = this.computeErrorMessage();
        } finally {
          this.isLoadingEntreprises = false;
        }
      },
      error: (error) => {
        try {
          console.error('Error loading entreprises:', error);
          this.apiStatus.entreprises = 'error';
          this.applyEntrepriseStats([]);
          this.errorMessage = this.computeErrorMessage();
        } finally {
          this.isLoadingEntreprises = false;
        }
      }
    });
  }

  private normalizeRole(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const obj = value as any;
      return String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '');
    }
    return '';
  }

  private applyUserStats(users: User[]): void {
    this.stats.totalUsers = users.length;

    const roles = users.map((u) => this.normalizeRole((u as any).role));

    this.stats.students = roles.filter((r) => r === RoleUtilisateur.STAGIAIRE).length;
    this.stats.teachers = roles.filter((r) =>
      r === RoleUtilisateur.ENCADRANT_ACADEMIQUE || r === RoleUtilisateur.ENCADRANT_PROFESSIONNEL
    ).length;

    this.kpis.activeUsers = users.filter((u) => u.actif).length;
    this.kpis.inactiveUsers = users.filter((u) => !u.actif).length;
    this.kpis.admins = roles.filter((r) => r === RoleUtilisateur.ADMINISTRATEUR).length;
    this.kpis.managers = roles.filter((r) => r === RoleUtilisateur.RESPONSABLE_STAGE).length;
    this.kpis.entrepriseReps = roles.filter((r) => r === RoleUtilisateur.RESPONSABLE_ENTREPRISE).length;
    this.kpis.activationRate = this.stats.totalUsers > 0
      ? Math.round((this.kpis.activeUsers / this.stats.totalUsers) * 100)
      : 0;

    const roleCounts = new Map<string, number>();
    for (const r of roles) {
      roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
    }

    this.roleDistribution = Array.from(roleCounts.entries())
      .map(([role, count]) => ({
        role,
        label: this.getRoleLabel(role),
        count,
        pct: this.stats.totalUsers > 0 ? (count / this.stats.totalUsers) * 100 : 0,
        badgeClass: this.getRoleBadgeClass(role)
      }))
      .sort((a, b) => b.count - a.count);
  }

  private applyEntrepriseStats(entreprises: Entreprise[]): void {
    this.entreprises.total = entreprises.length;
    this.entreprises.active = entreprises.filter((e) => e.actif !== false).length;
    this.stats.companies = this.apiStatus.entreprises === 'error'
      ? this.kpis.entrepriseReps
      : entreprises.length;
  }

  private computeErrorMessage(): string {
    const statuses = Object.values(this.apiStatus);
    if (statuses.every((status) => status === 'error')) {
      return 'Impossible de charger les données du tableau de bord.';
    }

    if (statuses.some((status) => status === 'error')) {
      return 'Certaines données sont indisponibles. Les informations chargées restent affichées.';
    }

    return '';
  }

  private computeGreeting(now: Date = new Date()): string {
    const hour = now.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  getInitials(user: User): string {
    const first = (user?.prenom ?? '').trim().slice(0, 1).toUpperCase();
    const last = (user?.nom ?? '').trim().slice(0, 1).toUpperCase();
    return `${first}${last}`.trim() || 'U';
  }

  getRoleBadgeClass(role: string): string {
    const normalized = this.normalizeRole(role);
    switch (normalized) {
      case RoleUtilisateur.ADMINISTRATEUR:
        return 'badge-admin';
      case RoleUtilisateur.STAGIAIRE:
        return 'badge-student';
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return 'badge-teacher';
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return 'badge-company';
      case RoleUtilisateur.RESPONSABLE_STAGE:
        return 'badge-manager';
      default:
        return 'badge-default';
    }
  }

  getRoleLabel(role: string): string {
    const normalized = this.normalizeRole(role);
    const labels: { [key: string]: string } = {
      ADMINISTRATEUR: 'Administrateur',
      STAGIAIRE: 'Stagiaire',
      ENCADRANT_ACADEMIQUE: 'Encadrant academique',
      ENCADRANT_PROFESSIONNEL: 'Encadrant professionnel',
      RESPONSABLE_ENTREPRISE: 'Responsable entreprise',
      RESPONSABLE_STAGE: 'Responsable service stages'
    };

    return labels[normalized] || normalized || String(role);
  }
}
