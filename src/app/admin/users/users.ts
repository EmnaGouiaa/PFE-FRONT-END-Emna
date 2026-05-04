import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  UserManagementService,
  User,
  CreateUserRequest,
  UpdateUserRequest
} from '../../services/user-management.service';
import { RoleUtilisateur } from '../../services/authentification.service';

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
  errorMessage = '';
  successMessage = '';
  showForm = false;
  isEditMode = false;
  searchQuery = '';
  selectedRole = 'ALL';
  userForm!: FormGroup;
  editingUserId: number | null = null;

  roles = [
    { value: 'ALL', label: 'All Roles' },
    { value: RoleUtilisateur.ADMINISTRATEUR, label: 'Administrateur' },
    { value: RoleUtilisateur.STAGIAIRE, label: 'Stagiaire' },
    { value: RoleUtilisateur.ENCADRANT_ACADEMIQUE, label: 'Encadrant academique' },
    { value: RoleUtilisateur.ENCADRANT_PROFESSIONNEL, label: 'Encadrant professionnel' },
    { value: RoleUtilisateur.RESPONSABLE_SERVICE_STAGES, label: 'Responsable service stages' },
    { value: RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES, label: 'Responsable universitaire stages' },
    { value: RoleUtilisateur.RESPONSABLE_ENTREPRISE, label: 'Responsable entreprise' }
  ];

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      role: [RoleUtilisateur.STAGIAIRE, Validators.required]
    });
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

  loadUsers(): void {
    console.log('[Users] loadUsers triggered');
    this.isLoading = true;
    this.errorMessage = '';

    this.userManagementService.getAllUsers().subscribe({
      next: (users) => {
        this.users = Array.isArray(users) ? users : [];
        this.filteredUsers = [...this.users];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec du chargement des utilisateurs.');
        this.isLoading = false;
      }
    });
  }

  private normalizeRole(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const obj = value as any;
      return String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '');
    }
    return '';
  }

  private upsertUserInState(user: User): void {
    console.log('[Users] API RESPONSE:', user);
    if (!user || !Number.isFinite(user.id) || user.id <= 0) return;

    const index = this.users.findIndex((item) => item.id === user.id);
    if (index >= 0) {
      const nextUsers = [...this.users];
      nextUsers[index] = user;
      this.users = nextUsers;
    } else {
      this.users = [user, ...this.users];
    }

    this.filteredUsers = [...this.users];
    this.filterUsers();
    console.log('[Users] UPDATED LIST:', this.users);
  }

  filterUsers(): void {
    const q = (this.searchQuery ?? '').trim().toLowerCase();
    this.filteredUsers = this.users.filter((user) => {
      const prenom = (user.prenom ?? '').toLowerCase();
      const nom = (user.nom ?? '').toLowerCase();
      const email = (user.email ?? '').toLowerCase();
      const role = this.normalizeRole((user as any).role);

      const matchesSearch = !q || prenom.includes(q) || nom.includes(q) || email.includes(q);
      const matchesRole = this.selectedRole === 'ALL' || role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
  }

  openCreateForm(): void {
    console.log('[Users] openCreateForm');
    this.isEditMode = false;
    this.editingUserId = null;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.setPasswordRequired(true);
    this.userForm.reset({
      prenom: '',
      nom: '',
      email: '',
      password: '',
      role: RoleUtilisateur.STAGIAIRE
    });
  }

  openEditForm(user: User): void {
    console.log('[Users] openEditForm', user?.id);
    this.isEditMode = true;
    this.editingUserId = user.id;
    this.showForm = true;
    this.setPasswordRequired(false);
    const normalizedRole = this.normalizeRole((user as any).role);

    this.userForm.patchValue({
      prenom: user.prenom ?? '',
      nom: user.nom ?? '',
      email: user.email ?? '',
      password: '',
      role: normalizedRole || RoleUtilisateur.STAGIAIRE
    });
  }

  closeForm(): void {
    console.log('[Users] closeForm');
    this.showForm = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.userForm.reset();
  }

  private setPasswordRequired(required: boolean): void {
    const control = this.userForm.get('password');
    if (!control) return;

    control.setValidators(required ? [Validators.required, Validators.minLength(6)] : [Validators.minLength(6)]);
    control.updateValueAndValidity();
  }

  onSubmit(): void {
    console.log('[Users] onSubmit', { isEditMode: this.isEditMode, editingUserId: this.editingUserId });
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const formData = this.userForm.value;
    const role = this.normalizeRole(formData.role);
    const submittedPassword = String(formData.password ?? '').trim();

    if (this.isEditMode && this.editingUserId !== null) {
      const updateData: UpdateUserRequest = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        role
      };

      if (submittedPassword !== '') {
        updateData.motDePasse = submittedPassword;
      }

      this.userManagementService.updateUser(this.editingUserId, updateData).subscribe({
        next: (updatedUser) => {
          console.log('[Users] updateUser success', this.editingUserId);
          this.successMessage = 'Utilisateur mis a jour avec succes.';
          this.closeForm();
          this.upsertUserInState(updatedUser);
          this.isLoading = false;

          if (!updatedUser || !Number.isFinite(updatedUser.id) || updatedUser.id <= 0) {
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error updating user:', error);
          if (error?.status === 400 && submittedPassword === '') {
            this.errorMessage = this.extractErrorMessage(
              error,
              'Le backend semble exiger un mot de passe pour la mise a jour. Veuillez remplir le champ mot de passe.'
            );
          } else {
            this.errorMessage = this.extractErrorMessage(error, 'Echec de la mise a jour.');
          }
          this.isLoading = false;
        }
      });
      return;
    }

    const createData: CreateUserRequest = {
      prenom: formData.prenom,
      nom: formData.nom,
      email: formData.email,
      motDePasse: submittedPassword,
      role
    };

    this.userManagementService.createUser(createData).subscribe({
      next: (createdUser) => {
        console.log('[Users] createUser success');
        this.successMessage = 'Utilisateur cree avec succes.';
        this.closeForm();
        this.upsertUserInState(createdUser);
        this.isLoading = false;

        if (!createdUser || !Number.isFinite(createdUser.id) || createdUser.id <= 0) {
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec de la creation.');
        this.isLoading = false;
      }
    });
  }

  toggleActivation(user: User): void {
    console.log('[Users] toggleActivation click', user?.id);
    if (!user?.actif) {
      this.errorMessage = 'Ce compte est deja desactive.';
      return;
    }

    if (!confirm(`Voulez-vous desactiver le compte de ${user.prenom ?? ''} ${user.nom ?? ''} ?`)) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userManagementService.desactiverUser(user.id).subscribe({
      next: () => {
        console.log('[Users] desactiverUser success', user?.id);
        this.successMessage = 'Statut utilisateur mis a jour avec succes.';
        this.users = this.users.map((item) =>
          item.id === user.id ? { ...item, actif: false } : item
        );
        this.filteredUsers = [...this.users];
        this.filterUsers();
        this.isLoading = false;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error toggling activation:', error);
        this.errorMessage = this.extractErrorMessage(error, 'Echec de la modification du statut.');
        this.isLoading = false;
      }
    });
  }

  getRoleBadgeClass(role: string): string {
    const normalized = this.normalizeRole(role);
    switch (normalized) {
      case RoleUtilisateur.ADMINISTRATEUR:
        return 'badge-admin';
      case RoleUtilisateur.STAGIAIRE:
        return 'badge-student';
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return 'badge-teacher';
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return 'badge-company';
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
        return 'badge-manager';
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        return 'badge-university';
      default:
        return 'badge-default';
    }
  }

  getRoleLabel(role: string): string {
    const normalized = this.normalizeRole(role);
    const labels: { [key: string]: string } = {
      [RoleUtilisateur.ADMINISTRATEUR]: 'Administrateur',
      [RoleUtilisateur.STAGIAIRE]: 'Stagiaire',
      [RoleUtilisateur.ENCADRANT_ACADEMIQUE]: 'Encadrant academique',
      [RoleUtilisateur.ENCADRANT_PROFESSIONNEL]: 'Encadrant professionnel',
      [RoleUtilisateur.RESPONSABLE_ENTREPRISE]: 'Responsable entreprise',
      [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES]: 'Responsable service stages',
      [RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES]: 'Responsable universitaire stages'
    };
    return labels[normalized] || normalized || String(role);
  }
}
