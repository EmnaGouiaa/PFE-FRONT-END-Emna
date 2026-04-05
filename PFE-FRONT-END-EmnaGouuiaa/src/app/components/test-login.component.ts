// STEP 1: Create a simple test login component

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-test-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="padding: 20px; max-width: 400px; margin: 50px auto; border: 2px solid #007bff;">
      <h2>🧪 ULTIMATE TEST LOGIN</h2>
      
      <div style="margin: 10px 0;">
        <label>Email:</label>
        <input type="email" [(ngModel)]="email" style="width: 100%; padding: 8px;" value="admin@pfe.tn">
      </div>
      
      <div style="margin: 10px 0;">
        <label>Password:</label>
        <input type="password" [(ngModel)]="password" style="width: 100%; padding: 8px;" value="admin123">
      </div>
      
      <button (click)="testLogin()" style="padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">
        🧪 TEST LOGIN (FORCE REDIRECT)
      </button>
      
      <div *ngIf="message" style="margin: 10px 0; padding: 10px;" [style.background]="messageType === 'error' ? '#ffe8e8' : '#e8ffe8'">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    
  `]
})
export class TestLoginComponent {
  email = 'admin@pfe.tn';
  password = 'admin123';
  message = '';
  messageType = '';

  constructor(private authService: AuthService, private router: Router) {}

  testLogin() {
    console.log('🧪 STARTING ULTIMATE TEST...');
    
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        console.log("🔥 RESPONSE:", res);
        this.message = 'Login successful! Forcing redirect to /admin...';
        this.messageType = 'success';
        
        // 🔴 FORCER LA REDIRECTION (sans condition)
        console.log('🔴 FORCING REDIRECT TO /admin...');
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        console.error("❌ ERROR:", err);
        this.message = `Login failed: ${err.message || 'Unknown error'}`;
        this.messageType = 'error';
      }
    });
  }
}
