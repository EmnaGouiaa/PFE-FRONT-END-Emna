import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-minimal-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-form" style="max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc;">
      <h2>🔐 Minimal Login Test</h2>
      
      <div style="margin: 10px 0;">
        <input [(ngModel)]="email" placeholder="Email" style="width: 100%; padding: 8px;">
      </div>
      
      <div style="margin: 10px 0;">
        <input [(ngModel)]="password" type="password" placeholder="Password" style="width: 100%; padding: 8px;">
      </div>
      
      <button (click)="login()" style="padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">
        Se connecter
      </button>
      
      <p *ngIf="error" style="color: red; margin-top: 10px;">{{ error }}</p>
      
      <p *ngIf="success" style="color: green; margin-top: 10px;">{{ success }}</p>
    </div>
  `
})
export class MinimalLoginComponent {
  email = 'admin@pfe.tn';
  password = 'admin123';
  error = '';
  success = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    console.log('🚀 Minimal login attempt...');
    
    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res: any) => {
          console.log('✅ Login success:', res);
          localStorage.setItem('token', res.token);
          this.success = 'Login successful! Redirecting...';
          this.error = '';
          
          setTimeout(() => {
            this.router.navigate(['/admin']);
          }, 1000);
        },
        error: (err) => {
          console.error('❌ Login error:', err);
          this.error = 'Email ou mot de passe incorrect';
          this.success = '';
        }
      });
  }
}
