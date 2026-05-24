import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

interface DashboardStats {
  totalStudents: number;
  totalCompanies: number;
  totalInternships: number;
  totalUsers: number;
  pendingValidations: number;
  activeSupervisors: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboard implements OnInit {
  currentUser$: Observable<User | null>;
  userName$: Observable<string>;
  welcomeMessage$: Observable<string>;
  isLoading = false;
  errorMessage = '';

  dashboardStats$: Observable<DashboardStats>;

  // Mock data - replace with actual API calls
  private mockStats: DashboardStats = {
    totalStudents: 245,
    totalCompanies: 89,
    totalInternships: 312,
    totalUsers: 534,
    pendingValidations: 12,
    activeSupervisors: 45
  };

  recentUsers = [
    { id: 1, name: 'Ahmed Ben Ali', email: 'ahmed@univ.tn', role: 'STAGIAIRE', date: '2024-01-15' },
    { id: 2, name: 'Fatma Karray', email: 'fatma@entreprise.tn', role: 'RESPONSABLE_ENTREPRISE', date: '2024-01-14' },
    { id: 3, name: 'Mohamed Gharbi', email: 'mohamed@univ.tn', role: 'ENCADRANT_ACADEMIQUE', date: '2024-01-13' },
    { id: 4, name: 'Sarra Trabelsi', email: 'sarra@univ.tn', role: 'STAGIAIRE', date: '2024-01-12' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userName$ = this.currentUser$.pipe(
      map(user => user ? `${user.prenom} ${user.nom}` : '')
    );
    this.welcomeMessage$ = this.currentUser$.pipe(
      map(user => user ? `Welcome back, ${user.prenom}!` : 'Welcome')
    );

    // Initialize stats
    this.dashboardStats$ = new Observable<DashboardStats>(observer => {
      observer.next(this.mockStats);
      observer.complete();
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    // TODO: Replace with actual API call to fetch real statistics
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  logout(): void {
    this.authService.logout();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  getRoleBadgeClass(role: string): string {
    const roleClasses: { [key: string]: string } = {
      'ADMIN': 'badge-admin',
      'STAGIAIRE': 'badge-student',
      'ENCADRANT_PROFESSIONNEL': 'badge-supervisor',
      'ENCADRANT_ACADEMIQUE': 'badge-supervisor',
      'RESPONSABLE_ENTREPRISE': 'badge-company',
      'RESPONSABLE_STAGE': 'badge-responsable'
    };
    return roleClasses[role] || 'badge-default';
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'ADMIN': 'Administrator',
      'STAGIAIRE': 'Student',
      'ENCADRANT_PROFESSIONNEL': 'Professional Supervisor',
      'ENCADRANT_ACADEMIQUE': 'Academic Supervisor',
      'RESPONSABLE_ENTREPRISE': 'Company Manager',
      'RESPONSABLE_STAGE': 'Internship Service Manager'
    };
    return roleNames[role] || role;
  }
}
