import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
<<<<<<< HEAD
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
import {
  UserManagementService,
  User,
  CreateUserRequest,
  UpdateUserRequest
} from '../../services/user-management.service';
<<<<<<< HEAD
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';
import { phoneValidator, strictEmailValidator } from '../admin-form-validators';

type FieldErrors = Record<string, string>;
=======
import { RoleUtilisateur } from '../../services/authentification.service';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

@Component({
  selector: 'app-users',
  standalone: true,
<<<<<<< HEAD
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatSnackBarModule],
=======
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
<<<<<<< HEAD
  availableFilieres: string[] = [];
  availableGrades: string[] = [];
  isLoading = false;
  isSubmitting = false;
=======
  isLoading = false;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  errorMessage = '';
  successMessage = '';
  showForm = false;
  isEditMode = false;
  searchQuery = '';
  selectedRole = 'ALL';
<<<<<<< HEAD
  selectedFiliere = 'ALL';
  selectedGrade = 'ALL';
  selectedSort = 'ALPHA_ASC';
  userForm!: FormGroup;
  editingUserId: number | null = null;
  selectedUser: User | null = null;
  formSubmitAttempted = false;
  fieldErrors: FieldErrors = {};
  currentUserId: number | null = null;

  roles = [
    { value: 'ALL', label: 'Tous les roles' },
    { value: RoleUtilisateur.ADMINISTRATEUR, label: 'Administrateur' },
    { value: RoleUtilisateur.STAGIAIRE, label: 'Stagiaire' },
    { value: RoleUtilisateur.ENCADRANT_ACADEMIQUE, label: 'Encadrant academique' },
    { value: RoleUtilisateur.RESPONSABLE_SERVICE_STAGES, label: 'Responsable service stages' },
    { value: RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES, label: 'Responsable universitaire stages' }
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  ];

  constructor(
    private userManagementService: UserManagementService,
<<<<<<< HEAD
    private authService: AuthentificationService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
=======
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    this.initForm();
    this.loadUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
<<<<<<< HEAD
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [phoneValidator()]],
=======
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      role: [RoleUtilisateur.STAGIAIRE, Validators.required]
    });
  }

<<<<<<< HEAD
  private clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const details = typeof error?.error?.details === 'string' ? error.error.details.trim() : '';
    const message = typeof error?.error?.message === 'string' ? error.error.message.trim() : '';

    if (message && details) {
      return `${message} ${details}`;
    }
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (message) return message;
    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error).find(
        (value) => typeof value === 'string' && value.trim().length > 0
      );
      if (typeof firstValue === 'string') return firstValue;
    }
=======
  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

<<<<<<< HEAD
  private applyBackendFieldErrors(error: any): void {
    const errors: FieldErrors = {};

    if (typeof error?.error?.field === 'string' && typeof error?.error?.message === 'string') {
      errors[error.error.field] = error.error.message;
    }

    if (error?.error && typeof error.error === 'object') {
      for (const [key, value] of Object.entries(error.error)) {
        if (typeof value === 'string' && this.userForm.contains(key)) {
          errors[key] = value;
        }
      }
    }

    this.fieldErrors = errors;
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.userManagementService.getAllUsers().pipe(
      timeout(15000)
    ).subscribe({
      next: (users) => {
        try {
          this.replaceUsers(users);
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          this.errorMessage = this.extractErrorMessage(error, 'Echec du chargement des utilisateurs.');
        } finally {
          this.isLoading = false;
        }
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    });
  }

  private normalizeRole(value: unknown): string {
<<<<<<< HEAD
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.startsWith('ROLE_') ? normalized.slice('ROLE_'.length) : normalized;
    }
    if (value && typeof value === 'object') {
      const obj = value as any;
      const raw = String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '').trim();
      return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
=======
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const obj = value as any;
      return String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    }
    return '';
  }

  private upsertUserInState(user: User): void {
<<<<<<< HEAD
=======
    console.log('[Users] API RESPONSE:', user);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
  }

  private replaceUsers(items: User[] | null | undefined): void {
    this.users = Array.isArray(items) ? [...items] : [];
    this.availableFilieres = this.extractDistinctValues(this.users, (user) => user.filiereNom ?? user.filiere);
    this.availableGrades = this.extractDistinctValues(this.users, (user) => user.grade);
    this.filteredUsers = [...this.users];
    this.filterUsers();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private extractDistinctValues(items: User[], selector: (user: User) => string | null | undefined): string[] {
    const values = items
      .map(selector)
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    return Array.from(new Set(values)).sort((left, right) =>
      this.normalizeText(left).localeCompare(this.normalizeText(right), 'fr')
    );
  }

  onRoleFilterChange(): void {
    if (this.selectedRole !== RoleUtilisateur.STAGIAIRE) {
      this.selectedFiliere = 'ALL';
    }

    if (this.selectedRole !== RoleUtilisateur.ENCADRANT_ACADEMIQUE) {
      this.selectedGrade = 'ALL';
    }

    this.filterUsers();
  }

  private resolveUserMessage(user: User | null | undefined, fallback: string): string {
    const message = user?.message?.trim();
    return message ? message : fallback;
  }

  private refreshAfterCreate(createdUser: User, message: string): void {
    this.userManagementService.getAllUsers().pipe(
      timeout(15000)
    ).subscribe({
      next: (users) => {
        try {
          this.replaceUsers(users);
          const exists = this.users.some((user) => user.id === createdUser.id);
          this.successMessage = exists
            ? message
            : `${message} La liste actualisee ne confirme pas encore la presence du compte.`;
          this.snackBar.open(this.successMessage, 'Fermer', { duration: exists ? 4000 : 5000 });
          this.closeForm();
        } finally {
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        try {
          this.successMessage = `${message} Impossible d'actualiser la liste pour confirmer la creation.`;
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 5000 });
          this.errorMessage = this.extractErrorMessage(error, "Impossible d'actualiser la liste des utilisateurs.");
          this.closeForm();
        } finally {
          this.isSubmitting = false;
        }
      }
    });
  }

  filterUsers(): void {
    const q = this.normalizeText(this.searchQuery);
    const selectedFiliere = this.normalizeText(this.selectedFiliere);
    const selectedGrade = this.normalizeText(this.selectedGrade);
    const selectedRole = this.normalizeRole(this.selectedRole);

    this.filteredUsers = this.users
      .filter((user) => {
        const prenom = this.normalizeText(user.prenom);
        const nom = this.normalizeText(user.nom);
        const email = this.normalizeText(user.email);
        const telephone = this.normalizeText(user.telephone);
        const role = this.normalizeRole((user as any).role);
        const filiere = this.normalizeText(user.filiereNom ?? user.filiere);
        const grade = this.normalizeText(user.grade);

        const matchesSearch = !q || prenom.includes(q) || nom.includes(q) || email.includes(q) || telephone.includes(q);
        const matchesRole = selectedRole === 'ALL' || role === selectedRole;
        const matchesFiliere = selectedRole !== RoleUtilisateur.STAGIAIRE
          || this.selectedFiliere === 'ALL'
          || filiere === selectedFiliere;
        const matchesGrade = selectedRole !== RoleUtilisateur.ENCADRANT_ACADEMIQUE
          || this.selectedGrade === 'ALL'
          || grade === selectedGrade;

        return matchesSearch && matchesRole && matchesFiliere && matchesGrade;
      })
      .sort((left, right) => {
        const leftLabel = this.normalizeText(`${left.prenom ?? ''} ${left.nom ?? ''}`);
        const rightLabel = this.normalizeText(`${right.prenom ?? ''} ${right.nom ?? ''}`);
        const comparison = leftLabel.localeCompare(rightLabel, 'fr');
        return this.selectedSort === 'ALPHA_DESC' ? -comparison : comparison;
      });
  }

  shouldShowFiliereFilter(): boolean {
    return this.selectedRole === RoleUtilisateur.STAGIAIRE;
  }

  shouldShowGradeFilter(): boolean {
    return this.selectedRole === RoleUtilisateur.ENCADRANT_ACADEMIQUE;
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingUserId = null;
    this.selectedUser = null;
    this.showForm = true;
    this.formSubmitAttempted = false;
    this.clearFeedback();
    this.userForm.get('email')?.enable({ emitEvent: false });
    this.userForm.get('role')?.enable({ emitEvent: false });
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    this.userForm.reset({
      prenom: '',
      nom: '',
      email: '',
<<<<<<< HEAD
      telephone: '',
=======
      password: '',
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      role: RoleUtilisateur.STAGIAIRE
    });
  }

  openEditForm(user: User): void {
<<<<<<< HEAD
    this.isEditMode = true;
    this.editingUserId = user.id;
    this.selectedUser = { ...user };
    this.showForm = true;
    this.formSubmitAttempted = false;
    this.clearFeedback();
    const normalizedRole = this.normalizeRole((user as any).role);

    this.userForm.reset({
      prenom: user.prenom ?? '',
      nom: user.nom ?? '',
      email: user.email ?? '',
      telephone: user.telephone ?? '',
      role: normalizedRole || RoleUtilisateur.STAGIAIRE
    });
    this.userForm.get('email')?.disable({ emitEvent: false });
    this.userForm.get('role')?.disable({ emitEvent: false });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.selectedUser = null;
    this.formSubmitAttempted = false;
    this.fieldErrors = {};
    this.userForm.reset();
    this.userForm.get('email')?.enable({ emitEvent: false });
    this.userForm.get('role')?.enable({ emitEvent: false });
  }

  private buildCreatePayload(): CreateUserRequest {
    const formData = this.userForm.getRawValue();
    return {
      prenom: String(formData.prenom ?? '').trim(),
      nom: String(formData.nom ?? '').trim(),
      email: String(formData.email ?? '').trim(),
      telephone: String(formData.telephone ?? '').trim(),
      role: this.normalizeRole(formData.role)
    };
  }

  private buildUpdatePayload(): UpdateUserRequest {
    const formData = this.userForm.getRawValue();
    const current = this.selectedUser;
    return {
      prenom: String(formData.prenom ?? current?.prenom ?? '').trim(),
      nom: String(formData.nom ?? current?.nom ?? '').trim(),
      email: String(current?.email ?? formData.email ?? '').trim(),
      telephone: String(formData.telephone ?? current?.telephone ?? '').trim(),
      actif: typeof current?.actif === 'boolean' ? current.actif : true,
      nomFichierSignature: undefined,
      role: this.normalizeRole(current?.role ?? formData.role)
    };
  }

  onSubmit(): void {
    this.formSubmitAttempted = true;
    this.clearFeedback();

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.errorMessage = 'Verifiez les champs obligatoires avant de continuer.';
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.editingUserId !== null) {
      const updateData = this.buildUpdatePayload();

      this.userManagementService.updateUser(this.editingUserId, updateData).pipe(
        timeout(15000)
      ).subscribe({
        next: (updatedUser) => {
          try {
            this.successMessage = this.resolveUserMessage(updatedUser, 'Utilisateur mis a jour avec succes.');
            this.upsertUserInState(updatedUser);
            this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
            this.closeForm();
          } finally {
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          try {
            this.applyBackendFieldErrors(error);
            this.errorMessage = this.extractErrorMessage(error, 'Echec de la mise a jour.');
            this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
          } finally {
            this.isSubmitting = false;
          }
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        }
      });
      return;
    }

<<<<<<< HEAD
    const createData = this.buildCreatePayload();
    this.userManagementService.createUser(createData).pipe(
      timeout(15000)
    ).subscribe({
      next: (createdUser) => {
        const message = this.resolveUserMessage(
          createdUser,
          'Utilisateur cree avec succes. Un email contenant le mot de passe temporaire a ete envoye.'
        );
        this.refreshAfterCreate(createdUser, message);
      },
      error: (error) => {
        try {
          this.applyBackendFieldErrors(error);
          this.errorMessage = this.extractErrorMessage(error, 'Echec de la creation.');
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isSubmitting = false;
        }
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    });
  }

  toggleActivation(user: User): void {
<<<<<<< HEAD
    const shouldActivate = !user?.actif;
    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
    const confirmationMessage = shouldActivate
      ? `Voulez-vous activer le compte de ${fullName} ?`
      : `Voulez-vous desactiver le compte de ${fullName} ?`;

    if (!confirm(confirmationMessage)) return;

    this.isLoading = true;
    this.clearFeedback();

    const request$ = shouldActivate
      ? this.userManagementService.activerUser(user.id)
      : this.userManagementService.desactiverUser(user.id);

    request$.pipe(
      timeout(15000)
    ).subscribe({
      next: () => {
        try {
          this.successMessage = 'Statut utilisateur mis a jour avec succes.';
          this.users = this.users.map((item) =>
            item.id === user.id ? { ...item, actif: shouldActivate } : item
          );
          this.filteredUsers = [...this.users];
          this.filterUsers();
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          this.errorMessage = this.extractErrorMessage(error, 'Echec de la modification du statut.');
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  canDeleteUser(user: User): boolean {
    return Boolean(user?.id) && user.id !== this.currentUserId;
  }

  deleteUser(user: User): void {
    if (!this.canDeleteUser(user)) {
      this.errorMessage = 'Vous ne pouvez pas supprimer votre propre compte.';
      this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
      return;
    }

    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email;
    if (!confirm(`Confirmer la suppression de l'utilisateur ${fullName} ? Cette action retire immediatement son acces.`)) {
      return;
    }

    this.isLoading = true;
    this.clearFeedback();

    this.userManagementService.deleteUser(user.id).pipe(
      timeout(15000)
    ).subscribe({
      next: () => {
        try {
          this.users = this.users.filter((item) => item.id !== user.id);
          this.filteredUsers = [...this.users];
          this.filterUsers();
          this.successMessage = 'Utilisateur supprime avec succes.';
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        try {
          this.errorMessage = this.extractErrorMessage(error, "Impossible de supprimer cet utilisateur.");
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4500 });
        } finally {
          this.isLoading = false;
        }
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    });
  }

<<<<<<< HEAD
  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.userForm.get(fieldName);
    if (!control || !(control.touched || this.formSubmitAttempted)) {
      return '';
    }

    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['minlength']) return 'Minimum 2 caracteres.';
    if (control.errors?.['missingAt']) return "L'email doit contenir @.";
    if (control.errors?.['email']) return 'Format email invalide.';
    if (control.errors?.['phone']) return 'Numero de telephone invalide.';

    return '';
  }

  isReadonlyInEditMode(fieldName: string): boolean {
    return this.isEditMode && (fieldName === 'email' || fieldName === 'role');
  }

=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD

  get hasActiveFilters(): boolean {
    return Boolean(
      this.searchQuery.trim() ||
      this.selectedRole !== 'ALL' ||
      this.selectedFiliere !== 'ALL' ||
      this.selectedGrade !== 'ALL'
    );
  }

  get emptyStateMessage(): string {
    if (this.isLoading) {
      return 'Chargement des utilisateurs en cours...';
    }

    if (this.errorMessage) {
      return this.errorMessage;
    }

    if (!this.users.length) {
      return 'Aucun utilisateur n a ete trouve.';
    }

    if (this.hasActiveFilters) {
      return 'Aucun utilisateur ne correspond aux filtres selectionnes.';
    }

    return 'Aucun utilisateur n a ete trouve.';
  }
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
