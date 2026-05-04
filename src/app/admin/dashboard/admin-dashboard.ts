import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserManagementService, User } from '../../services/user-management.service';
import { Entreprise, EntreprisesService } from '../../services/entreprises.service';
import { RoleUtilisateur } from '../../services/authentification.service';

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
  isLoading = false;
  errorMessage = '';

  greeting = 'Bonjour';
  subtitle = 'Vue d’ensemble des utilisateurs, rôles et santé de la plateforme.';
  lastUpdatedAt: Date | null = null;

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
    private entreprisesService: EntreprisesService
  ) { }

  ngOnInit(): void {
    this.greeting = this.computeGreeting();
    this.loadStats();
  }

  loadStats(): void {
    console.log('[AdminDashboard] loadStats triggered');
    this.isLoading = true;
    this.errorMessage = '';
    this.apiStatus.users = 'loading';
    this.apiStatus.entreprises = 'loading';

    forkJoin({
      users: this.userManagementService.getAllUsers().pipe(
        catchError((error) => {
          console.error('Error loading users:', error);
          this.apiStatus.users = 'error';
          return of([] as User[]);
        })
      ),
      entreprises: this.entreprisesService.list().pipe(
        catchError((error) => {
          console.error('Error loading entreprises:', error);
          this.apiStatus.entreprises = 'error';
          return of([] as Entreprise[]);
        })
      )
    }).subscribe({
      next: ({ users, entreprises }) => {
        console.log('[AdminDashboard] loadStats success', { users: users?.length ?? 0, entreprises: entreprises?.length ?? 0 });
        const safeUsers = users ?? [];
        const safeEntreprises = entreprises ?? [];

        this.apiStatus.users = this.apiStatus.users === 'error' ? 'error' : 'ok';
        this.apiStatus.entreprises = this.apiStatus.entreprises === 'error' ? 'error' : 'ok';

        this.applyUserStats(safeUsers);
        this.applyEntrepriseStats(safeEntreprises);

        this.recentUsers = [...safeUsers].slice(-5).reverse();
        this.lastUpdatedAt = new Date();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.errorMessage = 'Erreur lors du chargement des statistiques.';
        this.apiStatus.users = 'error';
        this.apiStatus.entreprises = 'error';
        this.isLoading = false;
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
    this.kpis.managers = roles.filter((r) => r === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES).length;
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
    if (this.apiStatus.entreprises === 'ok') {
      this.entreprises.total = entreprises.length;
      this.entreprises.active = entreprises.filter((e) => e.actif !== false).length;
      this.stats.companies = entreprises.length;
    } else {
      this.entreprises.total = 0;
      this.entreprises.active = 0;
      this.stats.companies = this.kpis.entrepriseReps;
    }
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
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
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
      ENCADRANT_ACADEMIQUE: 'Encadrant académique',
      ENCADRANT_PROFESSIONNEL: 'Encadrant professionnel',
      RESPONSABLE_ENTREPRISE: 'Responsable entreprise',
      RESPONSABLE_SERVICE_STAGES: 'Responsable service stages'
    };

    return labels[normalized] || normalized || String(role);
  }
}
