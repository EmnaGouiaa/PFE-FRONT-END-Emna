import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-role-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-dashboard.html'
})
export class RoleDashboard implements OnInit {
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

  ngOnInit(): void {
    // Check if user has appropriate role for current dashboard
    this.userRole$.subscribe(role => {
      this.redirectBasedOnRole(role);
    });
  }

  private redirectBasedOnRole(role: string): void {
    const currentPath = this.router.url;
    
    // If user is on wrong dashboard, redirect to appropriate one
    switch (role) {
      case UserRole.ADMIN:
        if (!currentPath.startsWith('/admin')) {
          this.router.navigate(['/admin/dashboard']);
        }
        break;
      case UserRole.STAGIAIRE:
        if (!currentPath.startsWith('/student')) {
          this.router.navigate(['/student/dashboard']);
        }
        break;
      case UserRole.ENCADRANT_PROFESSIONNEL:
      case UserRole.ENCADRANT_ACADEMIQUE:
        if (!currentPath.startsWith('/encadrant')) {
          this.router.navigate(['/encadrant/dashboard']);
        }
        break;
      case UserRole.RESPONSABLE_SERVICE_STAGES:
      case UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES:
        if (!currentPath.startsWith('/responsable')) {
          this.router.navigate(['/responsable/dashboard']);
        }
        break;
      case UserRole.RESPONSABLE_ENTREPRISE:
        if (!currentPath.startsWith('/company')) {
          this.router.navigate(['/company/dashboard']);
        }
        break;
    }
  }

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

  navigateToInternships(): void {
    this.router.navigate(['/stages']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
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
}
