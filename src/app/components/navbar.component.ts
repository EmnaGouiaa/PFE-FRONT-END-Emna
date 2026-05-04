import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav style="background: #333; padding: 10px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <a routerLink="/" style="color: white; text-decoration: none; font-size: 20px; font-weight: bold;">
            PFE System
          </a>
        </div>
        
        <div style="display: flex; gap: 20px; align-items: center;">
          <!-- Not logged in -->
          <ng-container *ngIf="!isLoggedIn()">
            <a routerLink="/login" style="color: white; text-decoration: none;">Login</a>
            <a routerLink="/register" style="color: white; text-decoration: none;">Register</a>
          </ng-container>
          
          <!-- Logged in - Role based menu -->
          <ng-container *ngIf="isLoggedIn()">
            <!-- Admin Menu -->
            <ng-container *ngIf="isAdmin()">
              <a routerLink="/admin/dashboard" style="color: white; text-decoration: none;">Admin Dashboard</a>
              <a routerLink="/admin/users" style="color: white; text-decoration: none;">Users</a>
            </ng-container>
            
            <!-- Student Menu -->
            <ng-container *ngIf="isStudent()">
              <a routerLink="/student/dashboard" style="color: white; text-decoration: none;">My Dashboard</a>
              <a routerLink="/stages" style="color: white; text-decoration: none;">Internships</a>
            </ng-container>
            
            <!-- Teacher Menu -->
            <ng-container *ngIf="isTeacher()">
              <a routerLink="/teacher/dashboard" style="color: white; text-decoration: none;">Dashboard</a>
              <a routerLink="/stages" style="color: white; text-decoration: none;">Stages</a>
            </ng-container>
            
            <!-- User info & logout -->
            <span style="color: #ccc;">|</span>
            <a routerLink="/profile" style="color: white; text-decoration: none;">👤 Profile</a>
            <span style="color: #ccc;">|</span>
            <span style="color: #aaa;">{{ userEmail }}</span>
            <button (click)="logout()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">
              Logout
            </button>
          </ng-container>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  userEmail: string = '';

  constructor(private authService: AuthService, private router: Router) {
    this.updateUserEmail();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isStudent(): boolean {
    return this.authService.isStagiaire();
  }

  isTeacher(): boolean {
    return this.authService.isEncadrant();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private updateUserEmail(): void {
    const user = this.authService.getCurrentUser();
    this.userEmail = user?.email || '';
  }
}
