import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-global-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="global-error-container" *ngIf="showError">
      <div class="error-backdrop" (click)="hideError()"></div>
      <div class="error-modal">
        <div class="error-header">
          <h3>⚠️ Session Expired</h3>
          <button class="close-btn" (click)="hideError()">×</button>
        </div>
        <div class="error-body">
          <p>Your session has expired due to inactivity.</p>
          <p>Please login again to continue.</p>
        </div>
        <div class="error-footer">
          <button class="btn btn-primary" (click)="redirectToLogin()">
            Go to Login
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .global-error-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
    }

    .error-modal {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      position: relative;
      animation: slideIn 0.3s ease-out;
    }

    .error-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 1rem;
    }

    .error-header h3 {
      margin: 0;
      color: #dc3545;
      font-size: 1.2rem;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6c757d;
      padding: 0;
      line-height: 1;
    }

    .close-btn:hover {
      color: #dc3545;
    }

    .error-body {
      margin-bottom: 1.5rem;
    }

    .error-body p {
      margin: 0.5rem 0;
      color: #6c757d;
      line-height: 1.5;
    }

    .error-footer {
      text-align: center;
    }

    .btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class GlobalErrorComponent implements OnInit {
  showError = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Listen for global error events
    this.setupGlobalErrorHandler();
  }

  private setupGlobalErrorHandler(): void {
    // Handle uncaught errors globally
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (event.reason?.message?.includes('Session expired')) {
        this.showError = true;
      }
    });

    // Handle HTTP errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
          this.showError = true;
        }
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };
  }

  hideError(): void {
    this.showError = false;
  }

  redirectToLogin(): void {
    this.hideError();
    this.router.navigate(['/login']);
  }
}
