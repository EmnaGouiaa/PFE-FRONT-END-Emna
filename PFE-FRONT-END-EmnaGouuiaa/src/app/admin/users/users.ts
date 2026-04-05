import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserManagementService, User, CreateUserRequest, UpdateUserRequest } from '../../services/user-management.service';
import { UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = false;
  showForm = false;
  isEditMode = false;
  searchQuery = '';
  selectedRole = 'ALL';
  userForm!: FormGroup;
  editingUserId: number | null = null;

  roles = [
    { value: 'ALL', label: 'All Roles' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.STAGIAIRE, label: 'Student' },
    { value: UserRole.ENCADRANT_ACADEMIQUE, label: 'Academic Supervisor' },
    { value: UserRole.ENCADRANT_PROFESSIONNEL, label: 'Professional Supervisor' },
    { value: UserRole.RESPONSABLE_SERVICE_STAGES, label: 'Internship Manager' },
    { value: UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES, label: 'University Manager' },
    { value: UserRole.RESPONSABLE_ENTREPRISE, label: 'Company Manager' }
  ];

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: [UserRole.STAGIAIRE, Validators.required]
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userManagementService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.users;
        this.filteredUsers = [...this.users];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        alert('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch =
        user.prenom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesRole = this.selectedRole === 'ALL' || user.role === this.selectedRole;

      return matchesSearch && matchesRole;
    });
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingUserId = null;
    this.showForm = true;
    this.userForm.reset({
      prenom: '',
      nom: '',
      email: '',
      password: '',
      role: UserRole.STAGIAIRE
    });
  }

  openEditForm(user: User): void {
    this.isEditMode = true;
    this.editingUserId = user.id;
    this.showForm = true;
    this.userForm.patchValue({
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      password: '', // Don't show password
      role: user.role
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.userForm.reset();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.userForm.value;

    if (this.isEditMode && this.editingUserId) {
      // Update user
      const updateData: UpdateUserRequest = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        role: formData.role
      };

      // Only include password if provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      this.userManagementService.updateUser(this.editingUserId, updateData).subscribe({
        next: () => {
          alert('User updated successfully!');
          this.closeForm();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          alert(error.error?.message || 'Failed to update user');
          this.isLoading = false;
        }
      });
    } else {
      // Create new user
      const createData: CreateUserRequest = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };

      this.userManagementService.createUser(createData).subscribe({
        next: () => {
          alert('User created successfully!');
          this.closeForm();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error creating user:', error);
          alert(error.error?.message || 'Failed to create user');
          this.isLoading = false;
        }
      });
    }
  }

  deleteUser(userId: number, userName: string): void {
    if (confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      this.isLoading = true;
      this.userManagementService.deleteUser(userId).subscribe({
        next: () => {
          alert('User deleted successfully!');
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          alert(error.error?.message || 'Failed to delete user');
          this.isLoading = false;
        }
      });
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case UserRole.ADMIN: return 'badge-admin';
      case UserRole.STAGIAIRE: return 'badge-student';
      case UserRole.ENCADRANT_ACADEMIQUE:
      case UserRole.ENCADRANT_PROFESSIONNEL: return 'badge-teacher';
      case UserRole.RESPONSABLE_ENTREPRISE: return 'badge-company';
      case UserRole.RESPONSABLE_SERVICE_STAGES: return 'badge-manager';
      case UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES: return 'badge-university';
      default: return 'badge-default';
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'ADMIN': 'Admin',
      'STAGIAIRE': 'Student',
      'ENCADRANT_ACADEMIQUE': 'Academic Supervisor',
      'ENCADRANT_PROFESSIONNEL': 'Professional Supervisor',
      'RESPONSABLE_ENTREPRISE': 'Company Manager',
      'RESPONSABLE_SERVICE_STAGES': 'Internship Manager',
      'RESPONSABLE_UNIVERSITAIRE_STAGES': 'University Manager'
    };
    return labels[role] || role;
  }
}
