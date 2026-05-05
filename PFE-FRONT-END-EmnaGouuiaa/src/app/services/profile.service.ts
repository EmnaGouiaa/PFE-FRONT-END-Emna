import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface ProfileData {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  telephone?: string;
  adresse?: string;
  poste?: string;
  specialite?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  message?: string;
}

export interface ProfileUpdate {
  prenom: string;
  nom: string;
  telephone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  adresse?: string;
  poste?: string;
  specialite?: string;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = `${API_BASE_URL}/profile`;

  constructor(private http: HttpClient) {}

  // Get current user's profile
  getProfile(): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.get<ProfileData>(this.API_URL, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error fetching profile:', error);
          return throwError(() => error);
        })
      );
  }

  // Update user profile
  updateProfile(profileData: ProfileUpdate): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.put<ProfileData>(this.API_URL, profileData, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error updating profile:', error);
          return throwError(() => error);
        })
      );
  }

  // Update password only
  updatePassword(passwordData: PasswordUpdate): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.put<ProfileData>(`${this.API_URL}/password`, passwordData, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error updating password:', error);
          return throwError(() => error);
        })
      );
  }

  // Deactivate account
  deactivateAccount(): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.put<ProfileData>(`${this.API_URL}/deactivate`, {}, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error deactivating account:', error);
          return throwError(() => error);
        })
      );
  }

  // Admin: Get user profile by ID
  getUserProfileById(userId: number): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.get<ProfileData>(`${this.API_URL}/admin/${userId}`, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error fetching user profile:', error);
          return throwError(() => error);
        })
      );
  }

  // Admin: Update user account status
  updateUserAccountStatus(userId: number, active: boolean): Observable<ProfileData> {
    const headers = this.getAuthHeaders();
    return this.http.put<ProfileData>(`${this.API_URL}/admin/${userId}/status`, { active }, { headers })
      .pipe(
        catchError(error => {
          console.error('❌ Error updating account status:', error);
          return throwError(() => error);
        })
      );
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwtToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Validation methods
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateProfileData(profileData: ProfileUpdate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // First name validation
    if (!profileData.prenom || profileData.prenom.trim().length === 0) {
      errors.push('First name is required');
    } else if (profileData.prenom.length < 2) {
      errors.push('First name must be at least 2 characters long');
    } else if (profileData.prenom.length > 50) {
      errors.push('First name must not exceed 50 characters');
    } else if (!/^[a-zA-Z\s\-']+$/.test(profileData.prenom)) {
      errors.push('First name can only contain letters, spaces, hyphens, and apostrophes');
    }
    
    // Last name validation
    if (!profileData.nom || profileData.nom.trim().length === 0) {
      errors.push('Last name is required');
    } else if (profileData.nom.length < 2) {
      errors.push('Last name must be at least 2 characters long');
    } else if (profileData.nom.length > 50) {
      errors.push('Last name must not exceed 50 characters');
    } else if (!/^[a-zA-Z\s\-']+$/.test(profileData.nom)) {
      errors.push('Last name can only contain letters, spaces, hyphens, and apostrophes');
    }
    
    // Phone validation (optional)
    if (profileData.telephone && profileData.telephone.trim().length > 0) {
      if (profileData.telephone.length > 20) {
        errors.push('Phone number must not exceed 20 characters');
      } else if (!/^[+]?[0-9\s\-\(\)]+$/.test(profileData.telephone)) {
        errors.push('Invalid phone number format');
      }
    }
    
    // Password validation (if updating password)
    if (profileData.newPassword && profileData.newPassword.trim().length > 0) {
      if (!profileData.currentPassword || profileData.currentPassword.trim().length === 0) {
        errors.push('Current password is required when setting a new password');
      }
      
      if (!profileData.confirmPassword || profileData.confirmPassword.trim().length === 0) {
        errors.push('Password confirmation is required');
      }
      
      if (profileData.newPassword !== profileData.confirmPassword) {
        errors.push('New password and confirmation do not match');
      }
      
      const passwordValidation = this.validatePassword(profileData.newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get display name for role
  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'STAGIAIRE': 'Student',
      'ADMIN': 'Administrator',
      'RESPONSABLE_ENTREPRISE': 'Company Representative',
      'ENCADRANT_PROFESSIONNEL': 'Professional Supervisor',
      'ENCADRANT_ACADEMIQUE': 'Academic Supervisor'
    };
    
    return roleMap[role] || role;
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
