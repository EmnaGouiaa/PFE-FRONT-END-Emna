import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-role-based-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="dashboard-heading">
          <h1>
            <i [class]="getRoleIcon((userRole$ | async))" class="me-3"></i>
            {{ getRoleDisplayName((userRole$ | async)) }} Dashboard
          </h1>
          <p class="text-muted">{{ welcomeMessage$ | async }}</p>
        </div>
        <button class="logout-btn" type="button" (click)="logout()">
          <i class="fas fa-sign-out-alt"></i>
          Deconnexion
        </button>
      </div>

      <!-- Admin Dashboard -->
      <div *ngIf="(userRole$ | async) === 'ADMIN'" class="admin-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.totalUsers || 0 }}</h3>
            <p>Total Users</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.activeInternships || 0 }}</h3>
            <p>Active Internships</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.pendingApprovals || 0 }}</h3>
            <p>Pending Approvals</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.systemHealth || 'Good' }}</h3>
            <p>System Health</p>
          </div>
        </div>
        
        <div class="actions-grid">
          <div class="action-card" (click)="router.navigate(['/admin/users'])">
            <i class="fas fa-users"></i>
            <h4>Manage Users</h4>
            <p>Create and manage user accounts</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i>
            <h4>View Internships</h4>
            <p>Monitor all internship activities</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/admin/reports'])">
            <i class="fas fa-chart-bar"></i>
            <h4>Reports</h4>
            <p>Generate system reports</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/admin/demandes-stage'])">
            <i class="fas fa-file-signature"></i>
            <h4>Internship Requests</h4>
            <p>Process and validate internship requests</p>
          </div>
        </div>
      </div>

      <!-- Student Dashboard -->
      <div *ngIf="(userRole$ | async) === 'STAGIAIRE'" class="student-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.myInternship || 'N/A' }}</h3>
            <p>My Internship</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.completedTasks || 0 }}</h3>
            <p>Completed Tasks</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.pendingEvaluations || 0 }}</h3>
            <p>Pending Evaluations</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.daysRemaining || 0 }}</h3>
            <p>Days Remaining</p>
          </div>
        </div>
        
        <div class="actions-grid">
          <div class="action-card" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i>
            <h4>My Internships</h4>
            <p>View and manage my internships</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/student/internships'])">
            <i class="fas fa-tasks"></i>
            <h4>My Tasks</h4>
            <p>Track internship tasks and progress</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/student/evaluations'])">
            <i class="fas fa-clipboard-check"></i>
            <h4>Evaluations</h4>
            <p>View evaluation results</p>
          </div>
        </div>
      </div>

      <!-- Teacher/Supervisor Dashboard -->
      <div *ngIf="(userRole$ | async) === 'ENCADRANT_PROFESSIONNEL' || (userRole$ | async) === 'ENCADRANT_ACADEMIQUE'" class="teacher-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.supervisedStudents || 0 }}</h3>
            <p>Supervised Students</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.pendingEvaluations || 0 }}</h3>
            <p>Pending Evaluations</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.upcomingMeetings || 0 }}</h3>
            <p>Upcoming Meetings</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.averageRating || 0 }}</h3>
            <p>Average Rating</p>
          </div>
        </div>
        
        <div class="actions-grid">
          <div class="action-card" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i>
            <h4>Student Internships</h4>
            <p>Monitor student internship progress</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/teacher/evaluations'])">
            <i class="fas fa-clipboard-check"></i>
            <h4>Evaluations</h4>
            <p>Evaluate student performance</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/teacher/meetings'])">
            <i class="fas fa-calendar"></i>
            <h4>Meetings</h4>
            <p>Schedule and track meetings</p>
          </div>
        </div>
      </div>

      <!-- Company Dashboard -->
      <div *ngIf="(userRole$ | async) === 'RESPONSABLE_ENTREPRISE'" class="company-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.activeInternships || 0 }}</h3>
            <p>Active Internships</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.currentInterns || 0 }}</h3>
            <p>Current Interns</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.openPositions || 0 }}</h3>
            <p>Open Positions</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.conversionRate || '0%' }}</h3>
            <p>Conversion Rate</p>
          </div>
        </div>
        
        <div class="actions-grid">
          <div class="action-card" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i>
            <h4>Our Internships</h4>
            <p>Manage company internship programs</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/company/candidates'])">
            <i class="fas fa-users"></i>
            <h4>Candidates</h4>
            <p>Review internship applications</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/company/evaluations'])">
            <i class="fas fa-clipboard-check"></i>
            <h4>Evaluations</h4>
            <p>Evaluate intern performance</p>
          </div>
        </div>
      </div>

      <!-- Internship Service Dashboard -->
      <div *ngIf="(userRole$ | async) === 'RESPONSABLE_SERVICE_STAGES' || (userRole$ | async) === 'RESPONSABLE_UNIVERSITAIRE_STAGES'" class="service-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.totalInternships || 0 }}</h3>
            <p>Total Internships</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.activeStudents || 0 }}</h3>
            <p>Active Students</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.partnerCompanies || 0 }}</h3>
            <p>Partner Companies</p>
          </div>
          <div class="stat-card">
            <h3>{{ (dashboardStats$ | async)?.pendingApplications || 0 }}</h3>
            <p>Pending Applications</p>
          </div>
        </div>
        
        <div class="actions-grid">
          <div class="action-card" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i>
            <h4>All Internships</h4>
            <p>Manage all internship programs</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/responsable/applications'])">
            <i class="fas fa-file-alt"></i>
            <h4>Applications</h4>
            <p>Review internship applications</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/responsable/companies'])">
            <i class="fas fa-building"></i>
            <h4>Companies</h4>
            <p>Manage partner companies</p>
          </div>
          <div class="action-card" (click)="router.navigate(['/admin/demandes-stage'])">
            <i class="fas fa-file-signature"></i>
            <h4>Internship Requests</h4>
            <p>Process and validate internship requests</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .dashboard-heading {
      flex: 1;
      text-align: center;
    }

    .dashboard-header h1 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: none;
      border-radius: 999px;
      padding: 0.85rem 1.2rem;
      background: #104778;
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      box-shadow: 0 12px 24px rgba(16, 71, 120, 0.18);
    }

    .logout-btn:hover {
      background: #2596be;
      transform: translateY(-2px);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
      border-left: 4px solid #3498db;
    }

    .stat-card h3 {
      font-size: 2rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: #7f8c8d;
      margin: 0;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .action-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
    }

    .action-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 15px rgba(0,0,0,0.2);
    }

    .action-card i {
      font-size: 3rem;
      color: #3498db;
      margin-bottom: 1rem;
    }

    .action-card h4 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .action-card p {
      color: #7f8c8d;
      margin: 0;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
      }

      .dashboard-heading {
        text-align: left;
      }
      
      .stats-grid,
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RoleBasedDashboard implements OnInit {
  currentUser$: Observable<User | null>;
  userRole$: Observable<string>;
  welcomeMessage$: Observable<string>;
  dashboardStats$: Observable<any>;

  constructor(
    private authService: AuthService,
    public router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userRole$ = this.currentUser$.pipe(
      map(user => user?.role || '')
    );
    this.welcomeMessage$ = this.currentUser$.pipe(
      map(user => user ? `Welcome back, ${user.prenom} ${user.nom}!` : 'Welcome!')
    );
    this.dashboardStats$ = this.initializeDashboardStats();
  }

  ngOnInit(): void {}

  private initializeDashboardStats(): Observable<any> {
    return this.userRole$.pipe(
      map(role => {
        switch (role) {
          case UserRole.ADMIN:
            return {
              totalUsers: 150,
              activeInternships: 45,
              pendingApprovals: 12,
              systemHealth: 'Good'
            };
          case UserRole.STAGIAIRE:
            return {
              myInternship: 'In Progress',
              completedTasks: 8,
              pendingEvaluations: 2,
              daysRemaining: 45
            };
          case UserRole.ENCADRANT_PROFESSIONNEL:
          case UserRole.ENCADRANT_ACADEMIQUE:
            return {
              supervisedStudents: 8,
              pendingEvaluations: 3,
              upcomingMeetings: 2,
              averageRating: 4.2
            };
          case UserRole.RESPONSABLE_SERVICE_STAGES:
          case UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES:
            return {
              totalInternships: 45,
              activeStudents: 38,
              partnerCompanies: 25,
              pendingApplications: 7
            };
          case UserRole.RESPONSABLE_ENTREPRISE:
            return {
              activeInternships: 12,
              currentInterns: 8,
              openPositions: 3,
              conversionRate: '75%'
            };
          default:
            return {};
        }
      })
    );
  }

  getRoleIcon(role: string | null): string {
    if (!role) return 'fas fa-user';
    
    const roleIcons: { [key: string]: string } = {
      [UserRole.ADMIN]: 'fas fa-cogs',
      [UserRole.STAGIAIRE]: 'fas fa-user-graduate',
      [UserRole.ENCADRANT_PROFESSIONNEL]: 'fas fa-chalkboard-teacher',
      [UserRole.ENCADRANT_ACADEMIQUE]: 'fas fa-university',
      [UserRole.RESPONSABLE_SERVICE_STAGES]: 'fas fa-briefcase',
      [UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'fas fa-school',
      [UserRole.RESPONSABLE_ENTREPRISE]: 'fas fa-building'
    };
    return roleIcons[role] || 'fas fa-user';
  }

  getRoleDisplayName(role: string | null): string {
    if (!role) return 'User';
    
    const roleNames: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.STAGIAIRE]: 'Student',
      [UserRole.ENCADRANT_PROFESSIONNEL]: 'Professional Supervisor',
      [UserRole.ENCADRANT_ACADEMIQUE]: 'Academic Supervisor',
      [UserRole.RESPONSABLE_SERVICE_STAGES]: 'Internship Service Manager',
      [UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'University Internship Manager',
      [UserRole.RESPONSABLE_ENTREPRISE]: 'Company Manager'
    };
    return roleNames[role] || 'User';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}
