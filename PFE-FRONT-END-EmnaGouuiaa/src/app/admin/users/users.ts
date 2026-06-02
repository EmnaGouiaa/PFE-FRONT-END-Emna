import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { personNameErrorMessage, personNameValidators } from '../../shared/validators/person-name.validators';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import {
  UserManagementService,
  User,
  Filiere,
  CreateUserRequest,
  UpdateUserRequest
} from '../../services/user-management.service';
import { RoleUtilisateur } from '../../services/authentification.service';
import { phoneValidator, strictEmailValidator } from '../admin-form-validators';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';

type FieldErrors = Record<string, string>;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatSnackBarModule, PhoneInputComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  filieres: Filiere[] = [];
  availableFilieres: string[] = [];
  availableGrades: string[] = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showForm = false;
  isEditMode = false;
  searchQuery = '';
  selectedRole = 'ALL';
  selectedFiliere = 'ALL';
  selectedGrade = 'ALL';
  selectedSort = 'ALPHA_ASC';
  userForm!: FormGroup;
  editingUserId: number | null = null;
  selectedUser: User | null = null;
  formSubmitAttempted = false;
  fieldErrors: FieldErrors = {};

  // Delete in progress (id of the user being deleted, null if idle)
  deletingUserId: number | null = null;
  deletingSignatureUserId: number | null = null;

  roles = [
    { value: 'ALL', label: 'Tous les roles' },
    { value: RoleUtilisateur.ADMINISTRATEUR, label: 'Administrateur' },
    { value: RoleUtilisateur.STAGIAIRE, label: 'Stagiaire' },
    { value: RoleUtilisateur.ENCADRANT_ACADEMIQUE, label: 'Encadrant academique' },
    { value: RoleUtilisateur.ENCADRANT_PROFESSIONNEL, label: 'Encadrant professionnel' },
    { value: RoleUtilisateur.RESPONSABLE_STAGE, label: 'Responsable des stages' },
    { value: RoleUtilisateur.RESPONSABLE_ENTREPRISE, label: 'Responsable entreprise' }
  ];

  /**
   * Roles disponibles uniquement a la creation d'un compte (non modifiables ensuite).
   * RESPONSABLE_ENTREPRISE et ENCADRANT_PROFESSIONNEL sont exclus — creation via Entreprises.
   */
  assignableRoles = [
    { value: RoleUtilisateur.ADMINISTRATEUR, label: 'Administrateur' },
    { value: RoleUtilisateur.STAGIAIRE, label: 'Stagiaire' },
    { value: RoleUtilisateur.ENCADRANT_ACADEMIQUE, label: 'Encadrant academique' },
    { value: RoleUtilisateur.RESPONSABLE_STAGE, label: 'Responsable des stages' }
  ];

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
    this.loadFilieres();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', personNameValidators()],
      nom: ['', personNameValidators()],
      email: ['', [Validators.required, strictEmailValidator()]],
      telephone: ['', [phoneValidator()]],
      role: [RoleUtilisateur.STAGIAIRE, Validators.required],
      // Le matricule est genere automatiquement par le backend pour les stagiaires —
      // aucun controle de formulaire dedié.
      filiereId: [null],
      niveau: [null]
    });

    // Les champs stagiaire ne sont requis que pour un nouveau stagiaire.
    this.userForm.get('role')?.valueChanges.subscribe((role) => this.updateStagiaireValidators(role));
    this.updateStagiaireValidators(RoleUtilisateur.STAGIAIRE);
  }

  /**
   * Active/désactive les validateurs filiere + niveau selon le rôle du formulaire.
   * Ces deux champs sont obligatoires pour un STAGIAIRE — aussi bien à la création
   * qu'à la modification (l'administrateur peut donc reaffecter filiere/niveau).
   */
  private updateStagiaireValidators(role: unknown): void {
    const isStagiaire = this.normalizeRole(role) === RoleUtilisateur.STAGIAIRE;

    const niveauControl   = this.userForm.get('niveau');
    const filiereControl  = this.userForm.get('filiereId');

    if (isStagiaire) {
      niveauControl?.setValidators([Validators.required, Validators.min(1)]);
      filiereControl?.setValidators([Validators.required]);
    } else {
      niveauControl?.clearValidators();
      filiereControl?.clearValidators();
    }

    niveauControl?.updateValueAndValidity({ emitEvent: false });
    filiereControl?.updateValueAndValidity({ emitEvent: false });
  }

  /** Vrai quand on crée un stagiaire (utilise notamment pour afficher l'info "matricule auto-genere"). */
  isStagiaireCreation(): boolean {
    return !this.isEditMode
      && this.normalizeRole(this.userForm?.get('role')?.value) === RoleUtilisateur.STAGIAIRE;
  }

  /**
   * Vrai quand le formulaire concerne un STAGIAIRE (création OU édition).
   * Sert à afficher les champs filière / niveau dans les deux cas.
   */
  isStagiaireForm(): boolean {
    return this.normalizeRole(this.userForm?.get('role')?.value) === RoleUtilisateur.STAGIAIRE;
  }

  loadFilieres(): void {
    this.userManagementService.getFilieres().subscribe({
      next: (data) => { this.filieres = data; },
      error: () => { this.filieres = []; }
    });
  }

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
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

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
      }
    });
  }

  normalizeRole(value: unknown): string {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.startsWith('ROLE_') ? normalized.slice('ROLE_'.length) : normalized;
    }
    if (value && typeof value === 'object') {
      const obj = value as any;
      const raw = String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '').trim();
      return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
    }
    return '';
  }

  private upsertUserInState(user: User): void {
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
    this.userForm.reset({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      role: RoleUtilisateur.STAGIAIRE,
      filiereId: null,
      niveau: null
    });
    this.updateStagiaireValidators(RoleUtilisateur.STAGIAIRE);
  }

  openEditForm(user: User): void {
    this.isEditMode = true;
    this.editingUserId = user.id;
    this.selectedUser = { ...user };
    this.showForm = true;
    this.formSubmitAttempted = false;
    this.clearFeedback();
    const normalizedRole = this.normalizeRole((user as any).role);

    // Pre-remplissage des champs stagiaire (filiere + niveau) pour permettre leur edition.
    const isStagiaire = normalizedRole === RoleUtilisateur.STAGIAIRE;
    const initialFiliereId = isStagiaire && user.filiereId != null ? Number(user.filiereId) : null;
    const initialNiveau = isStagiaire && user.niveau != null && user.niveau !== ''
      ? Number(user.niveau)
      : null;

    this.userForm.reset({
      prenom: user.prenom ?? '',
      nom: user.nom ?? '',
      email: user.email ?? '',
      telephone: user.telephone ?? '',
      role: normalizedRole || RoleUtilisateur.STAGIAIRE,
      filiereId: initialFiliereId,
      niveau: initialNiveau
    });
    this.userForm.get('email')?.disable({ emitEvent: false });
    this.userForm.get('role')?.disable({ emitEvent: false });
    // L'admin peut modifier filiere/niveau pour un stagiaire existant.
    this.updateStagiaireValidators(normalizedRole);
  }

  hasSignature(user: User | null): boolean {
    const url = String(user?.urlSignature ?? '').trim();
    const fileName = String(user?.nomFichierSignature ?? '').trim();
    return !!url || !!fileName;
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.selectedUser = null;
    this.formSubmitAttempted = false;
    this.fieldErrors = {};
    this.deletingSignatureUserId = null;
    this.userForm.reset();
    this.userForm.get('email')?.enable({ emitEvent: false });
    this.userForm.get('role')?.enable({ emitEvent: false });
  }

  private buildCreatePayload(): CreateUserRequest {
    const formData = this.userForm.getRawValue();
    const role = this.normalizeRole(formData.role);
    const payload: CreateUserRequest = {
      prenom: String(formData.prenom ?? '').trim(),
      nom: String(formData.nom ?? '').trim(),
      email: String(formData.email ?? '').trim(),
      telephone: String(formData.telephone ?? '').trim(),
      role
    };

    // Les champs suivants ne sont transmis que pour un stagiaire.
    // Note : le matricule n'est PAS transmis — il est genere automatiquement cote backend.
    if (role === RoleUtilisateur.STAGIAIRE) {
      const filiereId = Number(formData.filiereId);
      if (Number.isFinite(filiereId) && filiereId > 0) {
        payload.filiereId = filiereId;
      }

      const niveau = Number(formData.niveau);
      if (Number.isFinite(niveau) && niveau > 0) {
        payload.niveau = niveau;
      }
    }

    return payload;
  }

  private buildUpdatePayload(): UpdateUserRequest {
    const formData = this.userForm.getRawValue();
    const current = this.selectedUser;
    const role = this.normalizeRole(current?.role ?? formData.role);
    const payload: UpdateUserRequest = {
      prenom: String(formData.prenom ?? current?.prenom ?? '').trim(),
      nom: String(formData.nom ?? current?.nom ?? '').trim(),
      email: String(current?.email ?? formData.email ?? '').trim(),
      telephone: String(formData.telephone ?? current?.telephone ?? '').trim(),
      actif: typeof current?.actif === 'boolean' ? current.actif : true,
      nomFichierSignature: undefined,
      role
    };

    // Champs propres au stagiaire — uniquement transmis si la modification concerne un STAGIAIRE.
    if (role === RoleUtilisateur.STAGIAIRE) {
      const filiereId = Number(formData.filiereId);
      if (Number.isFinite(filiereId) && filiereId > 0) {
        payload.filiereId = filiereId;
      }
      const niveau = Number(formData.niveau);
      if (Number.isFinite(niveau) && niveau > 0) {
        payload.niveau = niveau;
      }
    }

    return payload;
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
        }
      });
      return;
    }

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
      }
    });
  }

  toggleActivation(user: User): void {
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

  /**
   * Supprime un utilisateur apres confirmation. Le backend renvoie un message d'erreur
   * explicite en cas de contrainte metier (auto-suppression interdite, etc.), qui est
   * remonte tel quel a l'utilisateur via la snackbar.
   */
  deleteUser(user: User): void {
    if (!user || !user.id || this.deletingUserId !== null) {
      return;
    }

    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email || `Utilisateur #${user.id}`;
    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir supprimer cet utilisateur ?\n\n${fullName}\n\nCette action est irreversible.`
    );
    if (!confirmation) {
      return;
    }

    this.deletingUserId = user.id;
    this.clearFeedback();

    this.userManagementService.deleteUser(user.id).pipe(
      timeout(15000)
    ).subscribe({
      next: () => {
        try {
          // Retrait optimiste de la liste locale (le backend a soft-delete : la ligne ne
          // sera plus retournee par getAllUsers).
          this.users = this.users.filter((item) => item.id !== user.id);
          this.filteredUsers = [...this.users];
          this.filterUsers();
          this.successMessage = `Utilisateur "${fullName}" supprime avec succes.`;
          this.snackBar.open(this.successMessage, 'Fermer', { duration: 3500 });
        } finally {
          this.deletingUserId = null;
        }
        // Rafraichissement complet pour s'assurer de la coherence avec le backend.
        this.loadUsers();
      },
      error: (error) => {
        try {
          this.errorMessage = this.extractErrorMessage(
            error,
            "Echec de la suppression de l'utilisateur."
          );
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 5000 });
        } finally {
          this.deletingUserId = null;
        }
      }
    });
  }

  deleteUserSignature(user: User): void {
    if (!user || !user.id || this.deletingSignatureUserId !== null) {
      return;
    }

    if (!this.hasSignature(user)) {
      this.snackBar.open('Aucune signature a supprimer pour cet utilisateur.', 'Fermer', { duration: 3500 });
      return;
    }

    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email || `Utilisateur #${user.id}`;
    const confirmation = window.confirm(
      `Confirmer la suppression definitive de la signature de ${fullName} ?\n\n`
      + `L'utilisateur devra ensuite televerser une nouvelle signature depuis son profil.`
    );
    if (!confirmation) {
      return;
    }

    this.deletingSignatureUserId = user.id;
    this.clearFeedback();

    this.userManagementService.deleteUserSignature(user.id).pipe(
      timeout(15000)
    ).subscribe({
      next: (updatedUser) => {
        try {
          const success = (updatedUser as any)?.message?.trim()
            || 'Signature supprimee avec succes.';
          this.successMessage = success;
          this.upsertUserInState(updatedUser);
          if (this.selectedUser?.id === updatedUser.id) {
            this.selectedUser = { ...updatedUser };
          }
          this.snackBar.open(success, 'Fermer', { duration: 4000 });
        } finally {
          this.deletingSignatureUserId = null;
        }
      },
      error: (error) => {
        try {
          this.errorMessage = this.extractErrorMessage(
            error,
            "Echec de la suppression de la signature de l'utilisateur."
          );
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 5000 });
        } finally {
          this.deletingSignatureUserId = null;
        }
      }
    });
  }

  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.userForm.get(fieldName);
    if (!control || !(control.touched || this.formSubmitAttempted)) {
      return '';
    }

    const personNameMessage = personNameErrorMessage(control.errors);
    if (personNameMessage) return personNameMessage;

    if (control.errors?.['required']) {
      if (fieldName === 'filiereId') return 'La filiere est obligatoire.';
      return 'Ce champ est obligatoire.';
    }
    if (control.errors?.['min']) return 'Le niveau doit etre un nombre positif.';
    if (control.errors?.['minlength']) return 'Minimum 2 caracteres.';
    if (control.errors?.['missingAt']) return "L'email doit contenir @.";
    if (control.errors?.['email']) return 'Format email invalide.';
    if (control.errors?.['phone']) return 'Numero de telephone invalide.';

    return '';
  }

  isReadonlyInEditMode(fieldName: string): boolean {
    return this.isEditMode && (fieldName === 'email' || fieldName === 'role');
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
      case RoleUtilisateur.RESPONSABLE_STAGE:
        return 'badge-manager';
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
      [RoleUtilisateur.RESPONSABLE_STAGE]: 'Responsable des stages'
    };
    return labels[normalized] || normalized || String(role);
  }
}
