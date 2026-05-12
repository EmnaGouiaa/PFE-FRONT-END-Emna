import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DemandeStage, StatutValidation } from '../../models/demande-stage.model';
import { CurrentUserProfileService } from '../../services/current-user-profile.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';
import { ServiceDemandeStageService } from '../../services/service-demande-stage.service';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import {
  FacultyAgreement,
  FacultyInternship,
  FacultyOffer,
  FacultyStageDocumentsOverview
} from '../../services/faculty/faculty.models';

interface FacultyDashboardStats {
  totalInternships: number;
  ongoingInternships: number;
  completedInternships: number;
  agreementsAwaitingSignature: number;
  pendingOffers: number;
  pendingCompanyRequests: number;
  missingDocuments: number;
  internshipsWithoutAcademicSupervisor: number;
}

interface DashboardStatCard {
  label: string;
  value: number;
  detail: string;
  tone: 'blue' | 'green' | 'slate';
}

interface DashboardActionCard {
  title: string;
  subtitle: string;
  route: string;
  badge: string;
  tone: 'blue' | 'green' | 'slate';
}

interface DashboardQueueCard {
  title: string;
  count: number;
  description: string;
  route: string;
  tone: 'blue' | 'green' | 'slate';
}

interface RecentActivityItem {
  title: string;
  detail: string;
  route: string;
  tone: 'blue' | 'green' | 'slate';
  timestamp: number;
  dateLabel: string;
}

@Component({
  selector: 'app-faculty-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="company-page">
      <header class="page-hero dashboard-hero dashboard-top-header">
        <div>
          <div class="dashboard-kicker">Pilotage des stages</div>
          <h1>Tableau de bord</h1>
          <p>Vue d'ensemble plus nette des stages, documents et validations a traiter sans surcharge visuelle.</p>
          <div class="hero-badges">
            <span class="hero-badge" *ngIf="lastUpdatedAt">Mis a jour {{ lastUpdatedAt | date: 'short' }}</span>
            <span class="hero-badge subtle-badge">{{ documentCoverageRate }}% de couverture documentaire</span>
          </div>
        </div>

        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadDashboard()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="warningMessage" class="support-banner warning-banner">{{ warningMessage }}</div>

      <div *ngIf="isLoading" class="loading">Chargement du tableau de bord...</div>

      <ng-container *ngIf="!isLoading">
        <section class="signature-reminder-card" *ngIf="showProfileCompletionReminder">
          <div class="signature-reminder-copy">
            <span class="dashboard-kicker">Profil incomplet</span>
            <h2>{{ profileCompletionService.alertTitle }}</h2>
            <p>{{ profileCompletionService.alertMessage }}</p>
            <div class="missing-fields-list" aria-label="Informations manquantes">
              <span class="missing-field-chip" *ngFor="let field of profileCompletionMissingFields">{{ field }}</span>
            </div>
          </div>
          <a routerLink="/profil" class="btn btn-primary">Compléter mon profil</a>
        </section>

        <section class="stats-grid">
          <article
            class="stat-card compact-stat tonal-stat"
            *ngFor="let item of statCards"
            [ngClass]="'tone-' + item.tone"
          >
            <div class="stat-top">
              <span class="stat-card-icon" [ngClass]="'tone-' + item.tone" aria-hidden="true">
                <svg *ngIf="item.tone === 'blue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 14l3-3 4 4 6-8" />
                </svg>
                <svg *ngIf="item.tone === 'green'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <svg *ngIf="item.tone === 'slate'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 2 6 2 9 0v-5" />
                </svg>
              </span>
              <span class="stat-label">{{ item.label }}</span>
            </div>
            <span class="stat-value">{{ item.value }}</span>
            <div class="stat-subtitle">{{ item.detail }}</div>
          </article>
        </section>

        <section class="dashboard-layout">
          <article class="section-card overview-card">
            <div class="section-head">
              <div>
                <h2>Resume general</h2>
                <p>Les chiffres cles pour suivre l'avancement du portefeuille de stages.</p>
              </div>
            </div>

            <div class="overview-grid">
              <div class="overview-item">
                <span class="overview-label">Stages termines</span>
                <strong>{{ completionRate }}%</strong>
                <p>{{ stats.completedInternships }} stage(s) cloture(s) sur {{ stats.totalInternships }}.</p>
              </div>
              <div class="overview-item">
                <span class="overview-label">Documents disponibles</span>
                <strong>{{ availableDocumentsCount }}</strong>
                <p>{{ stats.missingDocuments }} document(s) restent a regulariser.</p>
              </div>
              <div class="overview-item">
                <span class="overview-label">Charge immediate</span>
                <strong>{{ immediateWorkload }}</strong>
                <p>Somme des validations et signatures prioritaires en attente.</p>
              </div>
            </div>
          </article>

          <article class="section-card focus-card">
            <div class="section-head">
              <div>
                <h2>Priorites du moment</h2>
                <p>Les sujets les plus urgents pour fluidifier le parcours administratif.</p>
              </div>
            </div>

            <div class="focus-list">
              <a class="focus-item" *ngFor="let item of priorityCards" [routerLink]="item.route" [ngClass]="'tone-' + item.tone">
                <div class="focus-value">{{ item.count }}</div>
                <div class="focus-body">
                  <div class="focus-title">{{ item.title }}</div>
                  <div class="focus-text">{{ item.description }}</div>
                </div>
              </a>
            </div>
          </article>
        </section>


        <section class="dashboard-section dashboard-split">
          <article class="section-card">
            <div class="section-head">
              <div>
                <h2>Documents a traiter</h2>
                <p>Les pieces qui demandent encore une generation, une verification ou une signature.</p>
              </div>
            </div>

            <div class="queue-grid">
              <a class="queue-card" *ngFor="let item of documentQueueCards" [routerLink]="item.route" [ngClass]="'tone-' + item.tone">
                <div class="queue-count">{{ item.count }}</div>
                <div class="queue-title">{{ item.title }}</div>
                <div class="queue-description">{{ item.description }}</div>
              </a>
            </div>
          </article>

          <article class="section-card">
            <div class="section-head">
              <div>
                <h2>Validations en attente</h2>
                <p>Les decisions qui bloquent encore la progression de certains dossiers.</p>
              </div>
            </div>

            <div class="queue-grid">
              <a class="queue-card" *ngFor="let item of validationQueueCards" [routerLink]="item.route" [ngClass]="'tone-' + item.tone">
                <div class="queue-count">{{ item.count }}</div>
                <div class="queue-title">{{ item.title }}</div>
                <div class="queue-description">{{ item.description }}</div>
              </a>
            </div>
          </article>
        </section>

        <section class="dashboard-section">
          <div class="section-head">
            <div>
              <h2>Activite recente</h2>
              <p>Derniers elements dates recuperes depuis les offres, conventions, demandes et stages.</p>
            </div>
          </div>

          <div class="activity-list" *ngIf="recentActivity.length > 0; else emptyActivity">
            <a class="activity-item" *ngFor="let item of recentActivity" [routerLink]="item.route" [ngClass]="'tone-' + item.tone">
              <div class="activity-date">{{ item.dateLabel }}</div>
              <div class="activity-content">
                <div class="activity-title">{{ item.title }}</div>
                <div class="activity-detail">{{ item.detail }}</div>
              </div>
            </a>
          </div>

          <ng-template #emptyActivity>
            <div class="empty-card">Aucune activite datee n'est disponible pour le moment.</div>
          </ng-template>
        </section>
      </ng-container>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css'],
  styles: [`
    .dashboard-hero {
      align-items: center;
    }

    .subtle-badge {
      background: rgba(16, 71, 120, 0.04);
      border-color: rgba(16, 71, 120, 0.08);
    }

    .dashboard-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
      gap: 20px;
      margin-top: 24px;
    }

    .dashboard-split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    .dashboard-section {
      margin-top: 24px;
    }

    .section-card {
      padding: 22px;
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
      border: 1px solid rgba(15, 76, 129, 0.08);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section-head h2 {
      font-size: 1.22rem;
      font-weight: 800;
    }

    .section-head p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-weight: 500;
    }

    .compact-stat {
      min-height: 150px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .tonal-stat {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96));
    }

    .tonal-stat::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 6px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--primary-color), var(--secondary-color));
    }

    .tonal-stat.tone-green::before,
    .action-card.tone-green::before,
    .queue-card.tone-green::before,
    .focus-item.tone-green::before,
    .activity-item.tone-green::before {
      background: linear-gradient(180deg, var(--secondary-color), #1f7aa0);
    }

    .tonal-stat.tone-slate::before,
    .action-card.tone-slate::before,
    .queue-card.tone-slate::before,
    .focus-item.tone-slate::before,
    .activity-item.tone-slate::before {
      background: linear-gradient(180deg, #64748b, var(--primary-color));
    }

    .stat-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-card-icon {
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: rgba(16, 71, 120, 0.08);
      color: var(--primary-color);
      flex-shrink: 0;
    }

    .stat-card-icon.tone-green {
      background: rgba(37, 150, 190, 0.12);
      color: var(--secondary-color);
    }

    .stat-card-icon.tone-slate {
      background: rgba(100, 116, 139, 0.12);
      color: #475569;
    }

    .stat-card-icon svg {
      width: 20px;
      height: 20px;
    }

    .stat-subtitle {
      margin-top: 8px;
      color: #52606d;
      font-size: 0.92rem;
      line-height: 1.4;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .overview-item {
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(237, 246, 255, 0.94));
      border: 1px solid rgba(15, 76, 129, 0.08);
    }

    .overview-label {
      display: block;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .overview-item strong {
      display: block;
      margin-top: 10px;
      color: #0f4c81;
      font-size: 1.8rem;
      font-weight: 900;
    }

    .overview-item p {
      margin: 8px 0 0;
      color: #52606d;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .focus-list {
      display: grid;
      gap: 12px;
    }

    .focus-item,
    .queue-card,
    .activity-item,
    .action-card {
      position: relative;
      overflow: hidden;
      text-decoration: none;
    }

    .focus-item::before,
    .queue-card::before,
    .activity-item::before,
    .action-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      border-radius: 999px;
      background: linear-gradient(180deg, #0f4c81, #155e75);
    }

    .focus-item {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 14px;
      padding: 16px 18px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.94));
      border: 1px solid rgba(15, 76, 129, 0.08);
      box-shadow: 0 12px 28px rgba(15, 76, 129, 0.08);
    }

    .focus-value {
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: rgba(15, 76, 129, 0.08);
      color: #0f4c81;
      font-size: 1.45rem;
      font-weight: 900;
    }

    .focus-title {
      color: #0f172a;
      font-weight: 800;
    }

    .focus-text {
      margin-top: 6px;
      color: #52606d;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .action-card {
      display: block;
      padding: 18px 18px 18px 22px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.96));
      border: 1px solid rgba(15, 76, 129, 0.1);
      box-shadow: 0 18px 36px rgba(15, 76, 129, 0.08);
      transition: var(--transition);
    }

    .action-card:hover,
    .queue-card:hover,
    .activity-item:hover,
    .focus-item:hover {
      transform: translateY(-3px);
      box-shadow: 0 22px 42px rgba(15, 76, 129, 0.12);
    }

    .action-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .action-title {
      color: #0f4c81;
      font-weight: 800;
      font-size: 1rem;
    }

    .action-subtitle {
      margin-top: 6px;
      color: #52606d;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .action-badge {
      flex-shrink: 0;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(15, 76, 129, 0.1);
      color: #0f4c81;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .queue-grid {
      display: grid;
      gap: 14px;
    }

    .queue-card {
      display: block;
      padding: 18px 18px 18px 22px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.97));
      border: 1px solid rgba(15, 76, 129, 0.08);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
      transition: var(--transition);
    }

    .queue-count {
      color: #0f4c81;
      font-size: 1.8rem;
      font-weight: 900;
      line-height: 1;
    }

    .queue-title {
      margin-top: 12px;
      color: #0f172a;
      font-weight: 800;
    }

    .queue-description {
      margin-top: 6px;
      color: #52606d;
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .activity-list {
      display: grid;
      gap: 14px;
    }

    .activity-item {
      display: grid;
      grid-template-columns: 132px 1fr;
      gap: 16px;
      align-items: start;
      padding: 16px 18px 16px 22px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
      border: 1px solid rgba(15, 76, 129, 0.08);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
      transition: var(--transition);
    }

    .activity-date {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 44px;
      padding: 0 12px;
      border-radius: 14px;
      background: rgba(15, 76, 129, 0.08);
      color: #0f4c81;
      font-size: 0.84rem;
      font-weight: 800;
      text-align: center;
    }

    .activity-title {
      color: #0f172a;
      font-weight: 800;
    }

    .activity-detail {
      margin-top: 6px;
      color: #52606d;
      font-size: 0.94rem;
      line-height: 1.45;
    }

    @media (max-width: 1080px) {
      .dashboard-layout,
      .dashboard-split,
      .overview-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .activity-item {
        grid-template-columns: 1fr;
      }

      .activity-date {
        justify-content: flex-start;
      }
    }
  `]
})
export class FacultyDashboardPageComponent implements OnInit {
  stats: FacultyDashboardStats = {
    totalInternships: 0,
    ongoingInternships: 0,
    completedInternships: 0,
    agreementsAwaitingSignature: 0,
    pendingOffers: 0,
    pendingCompanyRequests: 0,
    missingDocuments: 0,
    internshipsWithoutAcademicSupervisor: 0
  };

  stageDocuments: FacultyStageDocumentsOverview[] = [];
  recentActivity: RecentActivityItem[] = [];
  stagesWithMissingConvention = 0;
  stagesWithMissingEvaluation = 0;
  stagesWithMissingLogbook = 0;

  isLoading = false;
  errorMessage = '';
  warningMessage = '';
  lastUpdatedAt: Date | null = null;
  profileCompletionMissingFields: string[] = [];

  constructor(
    private demandeStageService: ServiceDemandeStageService,
    private facultyPortalService: FacultyPortalService,
    private currentUserProfileService: CurrentUserProfileService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  get statCards(): DashboardStatCard[] {
    return [
      {
        label: 'Total des stages',
        value: this.stats.totalInternships,
        detail: 'Portefeuille global actuellement visible.',
        tone: 'blue'
      },
      {
        label: 'Stages en cours',
        value: this.stats.ongoingInternships,
        detail: 'Stages a suivre activement.',
        tone: 'green'
      },
      {
        label: 'Stages termines',
        value: this.stats.completedInternships,
        detail: 'Stages clotures administrativement ou pedagogiquement.',
        tone: 'slate'
      },
      {
        label: 'Conventions a signer',
        value: this.stats.agreementsAwaitingSignature,
        detail: 'Convention incomplete ou signature responsable manquante.',
        tone: 'blue'
      },
      {
        label: 'Offres en attente',
        value: this.stats.pendingOffers,
        detail: 'Offres a approuver ou refuser.',
        tone: 'green'
      },
      {
        label: 'Demandes entreprise',
        value: this.stats.pendingCompanyRequests,
        detail: 'Demandes encore en attente cote responsable.',
        tone: 'slate'
      },
      {
        label: 'Documents manquants',
        value: this.stats.missingDocuments,
        detail: 'PDF ou pieces encore a generer.',
        tone: 'blue'
      }
    ];
  }

  get primaryActions(): DashboardActionCard[] {
    return [
      {
        title: 'Documents de stage',
        subtitle: 'Generer, verifier et signer les conventions, fiches et cahiers.',
        route: '/responsable/documents-stage',
        badge: `${this.stats.missingDocuments} manquant(s)`,
        tone: 'blue'
      },
      {
        title: 'Validation des offres',
        subtitle: 'Traiter rapidement les offres soumises par les entreprises.',
        route: '/responsable/validation-offres',
        badge: `${this.stats.pendingOffers} en attente`,
        tone: 'green'
      },
      {
        title: 'Demandes entreprise',
        subtitle: 'Suivre les demandes de creation de compte ou de validation.',
        route: '/responsable/demandes-entreprises',
        badge: `${this.stats.pendingCompanyRequests} a traiter`,
        tone: 'slate'
      },
      {
        title: 'Affectation encadrants',
        subtitle: 'Completer les affectations academiques manquantes.',
        route: '/responsable/affectations-encadrants',
        badge: `${this.stats.internshipsWithoutAcademicSupervisor} a affecter`,
        tone: 'blue'
      },
      {
        title: 'Suivi des stages',
        subtitle: 'Consulter les stages en cours, termines et leur progression.',
        route: '/responsable/stages',
        badge: `${this.stats.totalInternships} stage(s)`,
        tone: 'green'
      },
      {
        title: 'Enquête de satisfaction',
        subtitle: 'Configurer l’enquête générale de satisfaction.',
        route: '/responsable/enquete-satisfaction',
        badge: 'accès direct',
        tone: 'slate'
      }
    ];
  }

  get priorityCards(): DashboardQueueCard[] {
    return [
      {
        title: 'Conventions en attente',
        count: this.stats.agreementsAwaitingSignature,
        description: 'Le responsable des stages doit encore signer ou finaliser certaines conventions.',
        route: '/responsable/documents-stage',
        tone: 'blue'
      },
      {
        title: 'Offres a arbitrer',
        count: this.stats.pendingOffers,
        description: 'Ces offres attendent encore une validation ou un refus.',
        route: '/responsable/validation-offres',
        tone: 'green'
      },
      {
        title: 'Encadrants a affecter',
        count: this.stats.internshipsWithoutAcademicSupervisor,
        description: 'Des stages restent sans encadrant academique associe.',
        route: '/responsable/affectations-encadrants',
        tone: 'slate'
      }
    ];
  }

  get documentQueueCards(): DashboardQueueCard[] {
    return [
      {
        title: 'Conventions PDF manquantes',
        count: this.stagesWithMissingConvention,
        description: 'Stages qui n ont pas encore de convention disponible au format PDF.',
        route: '/responsable/documents-stage',
        tone: 'blue'
      },
      {
        title: 'Fiches d evaluation manquantes',
        count: this.stagesWithMissingEvaluation,
        description: 'Fiches a generer ou a regulariser apres le stage.',
        route: '/responsable/documents-stage',
        tone: 'green'
      },
      {
        title: 'Cahiers de stage manquants',
        count: this.stagesWithMissingLogbook,
        description: 'Cahiers de stage encore absents pour certains dossiers.',
        route: '/responsable/documents-stage',
        tone: 'slate'
      }
    ];
  }

  get validationQueueCards(): DashboardQueueCard[] {
    return [
      {
        title: 'Offres a valider',
        count: this.stats.pendingOffers,
        description: 'Validation en attente avant publication ou refus.',
        route: '/responsable/validation-offres',
        tone: 'green'
      },
      {
        title: 'Demandes entreprise',
        count: this.stats.pendingCompanyRequests,
        description: 'Demandes en attente cote responsable des stages.',
        route: '/responsable/demandes-entreprises',
        tone: 'blue'
      },
      {
        title: 'Stages sans encadrant',
        count: this.stats.internshipsWithoutAcademicSupervisor,
        description: 'Affectations encore necessaires pour finaliser le suivi.',
        route: '/responsable/affectations-encadrants',
        tone: 'slate'
      }
    ];
  }

  get availableDocumentsCount(): number {
    return Math.max((this.stageDocuments.length * 3) - this.stats.missingDocuments, 0);
  }

  get completionRate(): number {
    if (!this.stats.totalInternships) {
      return 0;
    }

    return Math.round((this.stats.completedInternships / this.stats.totalInternships) * 100);
  }

  get documentCoverageRate(): number {
    const totalSlots = this.stageDocuments.length * 3;
    if (!totalSlots) {
      return 0;
    }

    return Math.round((this.availableDocumentsCount / totalSlots) * 100);
  }

  get immediateWorkload(): number {
    return this.stats.agreementsAwaitingSignature + this.stats.pendingOffers + this.stats.pendingCompanyRequests;
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  ngOnInit(): void {
    this.currentUserProfileService.getCurrentProfile().subscribe({
      next: (profile) => {
        this.profileCompletionMissingFields =
          this.profileCompletionService.getMissingFieldsForCurrentProfile(profile);
      },
      error: () => {
        this.profileCompletionMissingFields = [];
      }
    });
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.warningMessage = '';
    const unavailableSources: string[] = [];

    forkJoin({
      internships: this.facultyPortalService.listInternships().pipe(catchError((error) => {
        console.error('[FacultyDashboardPageComponent] internships unavailable', error);
        unavailableSources.push('stages');
        return of([] as FacultyInternship[]);
      })),
      requests: this.demandeStageService.getToutesDemandes().pipe(catchError((error) => {
        console.error('[FacultyDashboardPageComponent] company requests unavailable', error);
        unavailableSources.push('demandes entreprise');
        return of([] as DemandeStage[]);
      })),
      agreements: this.facultyPortalService.listAgreements().pipe(catchError((error) => {
        console.error('[FacultyDashboardPageComponent] agreements unavailable', error);
        unavailableSources.push('conventions');
        return of([] as FacultyAgreement[]);
      })),
      offers: this.facultyPortalService.listPendingOffers().pipe(catchError((error) => {
        console.error('[FacultyDashboardPageComponent] pending offers unavailable', error);
        unavailableSources.push('offres');
        return of([] as FacultyOffer[]);
      })),
      documents: this.facultyPortalService.listStageDocuments().pipe(catchError((error) => {
        console.error('[FacultyDashboardPageComponent] stage documents unavailable', error);
        unavailableSources.push('documents');
        return of([] as FacultyStageDocumentsOverview[]);
      }))
    }).subscribe({
      next: ({ internships, requests, agreements, offers, documents }) => {
        this.stageDocuments = documents;
        this.stats = this.buildStats(internships, agreements, offers, requests, documents);
        this.stagesWithMissingConvention = documents.filter((item) => item.convention && !item.convention.disponible).length;
        this.stagesWithMissingEvaluation = documents.filter((item) => item.ficheEvaluation && !item.ficheEvaluation.disponible).length;
        this.stagesWithMissingLogbook = documents.filter((item) => item.cahierStage && !item.cahierStage.disponible).length;
        this.recentActivity = this.buildRecentActivity(internships, agreements, requests, offers);
        this.lastUpdatedAt = new Date();
        this.warningMessage = unavailableSources.length
          ? `Certaines donnees n'ont pas pu etre chargees : ${Array.from(new Set(unavailableSources)).join(', ')}.`
          : '';
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le dashboard responsable.';
        this.isLoading = false;
      }
    });
  }

  private buildStats(
    internships: FacultyInternship[],
    agreements: FacultyAgreement[],
    offers: FacultyOffer[],
    requests: DemandeStage[],
    documents: FacultyStageDocumentsOverview[]
  ): FacultyDashboardStats {
    return {
      totalInternships: internships.length,
      ongoingInternships: internships.filter((item) => item.statut === 'EN_COURS').length,
      completedInternships: internships.filter((item) => item.statut === 'TERMINE').length,
      agreementsAwaitingSignature: agreements.filter((item) => !item.statutSignatures || !item.signeeResp).length,
      pendingOffers: offers.length,
      pendingCompanyRequests: requests.filter((item) => !this.isCompanyRequestFullyValidated(item) && !this.isRejectedRequest(item)).length,
      missingDocuments: documents.reduce((total, item) => total + this.countMissingDocuments(item), 0),
      internshipsWithoutAcademicSupervisor: internships.filter((item) => !item.academicSupervisor?.id).length
    };
  }

  private buildRecentActivity(
    internships: FacultyInternship[],
    agreements: FacultyAgreement[],
    requests: DemandeStage[],
    offers: FacultyOffer[]
  ): RecentActivityItem[] {
    const items: RecentActivityItem[] = [];

    requests.forEach((item) => {
      const date = this.parseDate(item.misAJourLe || item.creeLe);
      if (!date) {
        return;
      }

      items.push({
        title: item.nomEntreprise || `Demande #${item.id}`,
        detail: `Demande entreprise ${this.isCompanyRequestFullyValidated(item) ? 'validee' : 'a suivre'} pour ${item.sujetStage || 'un stage'}.`,
        route: '/responsable/demandes-entreprises',
        tone: 'slate',
        timestamp: date.getTime(),
        dateLabel: this.formatDateLabel(date)
      });
    });

    offers.forEach((item) => {
      const date = this.parseDate(item.datePublication);
      if (!date) {
        return;
      }

      items.push({
        title: item.titre || `Offre #${item.id}`,
        detail: `Offre en attente de validation pour ${item.entrepriseNom || 'une entreprise'}.`,
        route: '/responsable/validation-offres',
        tone: 'green',
        timestamp: date.getTime(),
        dateLabel: this.formatDateLabel(date)
      });
    });

    agreements.forEach((item) => {
      const date = this.parseDate(item.dateSignatureResponsableUniversitaire);
      if (!date) {
        return;
      }

      items.push({
        title: item.stageTitre || `Convention #${item.id}`,
        detail: `Convention signee par le responsable des stages.`,
        route: '/responsable/documents-stage',
        tone: 'blue',
        timestamp: date.getTime(),
        dateLabel: this.formatDateLabel(date)
      });
    });

    internships.forEach((item) => {
      const date = this.parseDate(item.dateDebut);
      if (!date) {
        return;
      }

      items.push({
        title: item.titre || `Stage #${item.id}`,
        detail: `${item.student.fullName || 'Stagiaire non renseigne'} chez ${item.company.nom || 'une entreprise'}.`,
        route: '/responsable/stages',
        tone: item.statut === 'TERMINE' ? 'slate' : 'blue',
        timestamp: date.getTime(),
        dateLabel: this.formatDateLabel(date)
      });
    });

    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6);
  }

  private countMissingDocuments(item: FacultyStageDocumentsOverview): number {
    return [item.convention, item.ficheEvaluation, item.cahierStage]
      .filter((doc) => doc && !doc.disponible)
      .length;
  }

  private isCompanyRequestFullyValidated(item: DemandeStage): boolean {
    const responsibleStatus = item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
    return item.statutValidationAdmin === StatutValidation.APPROUVEE && responsibleStatus === StatutValidation.APPROUVEE;
  }

  private isRejectedRequest(item: DemandeStage): boolean {
    const responsibleStatus = item.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE;
    return item.statutValidationAdmin === StatutValidation.REJETEE || responsibleStatus === StatutValidation.REJETEE;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value || !value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDateLabel(value: Date): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(value);
  }
}
