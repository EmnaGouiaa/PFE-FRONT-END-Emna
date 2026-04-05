import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  demoAccounts = [
    { email: 'admin@pfe.tn', password: 'Password123!', role: 'Administrator' },
    { email: 'student@pfe.tn', password: 'Password123!', role: 'Student' },
    { email: 'teacher@pfe.tn', password: 'Password123!', role: 'Teacher' },
    { email: 'company@pfe.tn', password: 'Password123!', role: 'Company Manager' },
    { email: 'internship@pfe.tn', password: 'Password123!', role: 'Internship Service Manager' }
  ];

  ngOnInit(): void {
    // Check for logout message
    const logoutMessage = this.authService.getLogoutMessage();
    if (logoutMessage) {
      this.successMessage = logoutMessage;
    }
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    console.log('🔹 Submit called');
    console.log('🔹 Form status:', {
      valid: this.loginForm.valid,
      value: this.loginForm.value
    });

    if (this.loginForm.invalid) {
      console.warn('⚠️ Form is invalid');
      this.loginForm.markAllAsTouched();
      return;
    }

    // Clear messages
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const { email, password } = this.loginForm.value;

    console.log('🔐 Attempting login with:', { email: email.trim() });
    console.log('🌐 Backend URL:', 'http://localhost:9999/api/v1/auth/authenticate');

    this.authService.login({ email: email.trim(), password })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          console.log('✅ Login attempt completed');
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Login successful:', response);
          console.log('🎯 User role from response:', response.user?.role);

          // Small delay to ensure auth state is updated before navigation
          setTimeout(() => {
            this.handleSuccessfulLogin(response);
          }, 100);
        },
        error: (error) => {
          console.error('❌ Login error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          this.handleLoginError(error);
        }
      });
  }

  private handleSuccessfulLogin(response: any): void {
    console.log('🎯 Handling successful login with role:', response.user?.role);
    const userRole = response.user?.role;

    // Redirect based on user role
    switch (userRole) {
      case UserRole.ADMIN:
        console.log('➡️ Redirecting to admin dashboard');
        this.router.navigate(['/admin/dashboard']);
        break;
      case UserRole.STAGIAIRE:
        console.log('➡️ Redirecting to student dashboard');
        this.router.navigate(['/student/dashboard']);
        break;
      case UserRole.ENCADRANT_PROFESSIONNEL:
      case UserRole.ENCADRANT_ACADEMIQUE:
        console.log('➡️ Redirecting to teacher dashboard');
        this.router.navigate(['/encadrant/dashboard']);
        break;
      case UserRole.RESPONSABLE_SERVICE_STAGES:
        console.log('➡️ Redirecting to responsable dashboard');
        this.router.navigate(['/responsable/dashboard']);
        break;
      case UserRole.RESPONSABLE_ENTREPRISE:
        console.log('➡️ Redirecting to company dashboard');
        this.router.navigate(['/company/dashboard']);
        break;
      default:
        console.log('➡️ Redirecting to default dashboard');
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  private handleLoginError(error: any): void {
    console.error('Login error:', error);

    if (error.status === 401 || error.status === 403) {
      // Get detailed error message from backend if available
      const backendMessage = error.error?.message || error.error?.error;
      this.errorMessage = backendMessage || 'Invalid email or password.';
    } else if (error.status === 0) {
      this.errorMessage = 'Cannot reach the server. Please check your connection.';
      console.error('Server unreachable - is the backend running on http://localhost:9999?');
    } else {
      const apiMessage = error.error?.message || error.error?.error;
      this.errorMessage = apiMessage || 'Login failed. Please try again.';
    }

    this.isLoading = false;
  }
}
