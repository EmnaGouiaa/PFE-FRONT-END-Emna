import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-card">
        <div class="icon-section">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        
        <div class="content-section">
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          
          <div class="user-info" *ngIf="(currentUser$ | async)">
            <p><strong>Your Role:</strong> {{ getRoleDisplayName((userRole$ | async) || '') }}</p>
            <p><strong>Required Roles:</strong> {{ getRequiredRoles() }}</p>
          </div>
          
          <div class="actions">
            <button class="btn btn-primary" (click)="goToDashboard()">
              <i class="fas fa-home"></i>
              Go to My Dashboard
            </button>
            <button class="btn btn-secondary" (click)="logout()">
              <i class="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .unauthorized-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
      max-width: 500px;
      width: 100%;
    }

    .icon-section {
      background: #f8f9fa;
      padding: 3rem;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }

    .icon-section i {
      font-size: 4rem;
      color: #dc3545;
    }

    .content-section {
      padding: 2rem;
    }

    .content-section h1 {
      color: #2c3e50;
      margin-bottom: 1rem;
      text-align: center;
    }

    .content-section p {
      color: #6c757d;
      text-align: center;
      margin-bottom: 2rem;
    }

    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .user-info p {
      text-align: left;
      margin: 0.5rem 0;
      color: #495057;
    }

    .user-info strong {
      color: #2c3e50;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .unauthorized-container {
        padding: 1rem;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class Unauthorized implements OnInit {
  currentUser$: Observable<any>;
  userRole$: Observable<string>;
  requiredRoles: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userRole$ = this.currentUser$.pipe(
      map(user => user?.role || '')
    );
  }

  ngOnInit(): void {
    // Get required roles from router state if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['requiredRoles']) {
      this.requiredRoles = navigation.extras.state['requiredRoles'];
    }
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.STAGIAIRE]: 'Student',
      [UserRole.ENCADRANT_PROFESSIONNEL]: 'Professional Supervisor',
      [UserRole.ENCADRANT_ACADEMIQUE]: 'Academic Supervisor',
      [UserRole.RESPONSABLE_SERVICE_STAGES]: 'Internship Service Manager',
      [UserRole.RESPONSABLE_ENTREPRISE]: 'Company Manager'
    };
    return roleNames[role] || role;
  }

  getRequiredRoles(): string {
    if (this.requiredRoles.length === 0) return 'Unknown';
    return this.requiredRoles.map(role => this.getRoleDisplayName(role)).join(', ');
  }

  goToDashboard(): void {
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
      case UserRole.ADMIN:
        this.router.navigate(['/admin/dashboard']);
        break;
      case UserRole.STAGIAIRE:
        this.router.navigate(['/student/dashboard']);
        break;
      case UserRole.ENCADRANT_PROFESSIONNEL:
      case UserRole.ENCADRANT_ACADEMIQUE:
        this.router.navigate(['/encadrant/dashboard']);
        break;
      case UserRole.RESPONSABLE_SERVICE_STAGES:
        this.router.navigate(['/responsable/dashboard']);
        break;
      case UserRole.RESPONSABLE_ENTREPRISE:
        this.router.navigate(['/company/dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
