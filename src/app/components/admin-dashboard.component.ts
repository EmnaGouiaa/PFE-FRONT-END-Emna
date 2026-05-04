import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 50px auto; border: 1px solid #ddd; border-radius: 8px;">
      <h1 style="color: #28a745; text-align: center;">👑 Admin Dashboard</h1>
      <p style="text-align: center; color: #666; margin: 20px 0;">Welcome to Admin Panel</p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <h3 style="color: #333; margin: 0 0 10px;">📊 User Information</h3>
        <p><strong>Email:</strong> {{ userEmail }}</p>
        <p><strong>Role:</strong> ADMIN</p>
        <button (click)="logout()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
          🚪 Logout
        </button>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
  userEmail: string = '';

  constructor() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userEmail = user.email || 'Unknown';
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
