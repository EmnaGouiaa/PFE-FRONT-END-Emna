import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import {
  ResponsablesEntrepriseService,
  ResponsableEntreprise,
  CreateResponsableEntrepriseRequest,
  UpdateResponsableEntrepriseRequest
} from '../../services/responsables-entreprise.service';

@Component({
  selector: 'app-admin-representants',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-representants.component.html',
  styleUrls: ['./admin-representants.component.css']
})
export class AdminRepresentantsComponent implements OnInit {
  representants: ResponsableEntreprise[] = [];
  filtered: ResponsableEntreprise[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';
  showForm = false;
  isEditMode = false;
  editingId: number | null = null;
  form!: FormGroup;

  constructor(private service: ResponsablesEntrepriseService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      entrepriseId: ['']
    });
    this.load();
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (Array.isArray(error?.error?.errors) && error.error.errors.length > 0) {
      return String(error.error.errors[0]);
    }
    return fallback;
  }

  private upsertRepresentantInState(representant: ResponsableEntreprise): void {
    console.log('[AdminRepresentants] API RESPONSE:', representant);
    if (!representant || !Number.isFinite(representant.id) || representant.id <= 0) return;

    const index = this.representants.findIndex((item) => item.id === representant.id);
    if (index >= 0) {
      const nextItems = [...this.representants];
      nextItems[index] = representant;
      this.representants = nextItems;
    } else {
      this.representants = [representant, ...this.representants];
    }

    this.filtered = [...this.representants];
    this.filter();
    console.log('[AdminRepresentants] UPDATED LIST:', this.representants);
  }

  load(): void {
    console.log('[AdminRepresentants] load triggered');
    this.isLoading = true;
    this.errorMessage = '';
    this.service.list().pipe(
      timeout(15000)
    ).subscribe({
      next: (items) => {
        try {
          console.log('[AdminRepresentants] list success', items?.length ?? 0);
          this.representants = [...(items ?? [])];
          this.filtered = [...this.representants];
        } finally {
          this.isLoading = false;
        }
      },
      error: (err) => {
        try {
          console.error('Error loading representants:', err);
          this.errorMessage = this.extractErrorMessage(err, 'Echec du chargement des representants.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  filter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = this.representants.filter((r) => {
      if (!q) return true;
      const text = [r.prenom, r.nom, r.email, String(r.entrepriseId ?? '')].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  openCreate(): void {
    console.log('[AdminRepresentants] openCreate');
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.reset({ prenom: '', nom: '', email: '', telephone: '', entrepriseId: '' });
  }

  openEdit(r: ResponsableEntreprise): void {
    console.log('[AdminRepresentants] openEdit', r?.id);
    this.isEditMode = true;
    this.editingId = r.id;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.patchValue({
      prenom: r.prenom ?? '',
      nom: r.nom ?? '',
      email: r.email ?? '',
      telephone: r.telephone ?? '',
      entrepriseId: r.entrepriseId ?? ''
    });
  }

  closeForm(): void {
    console.log('[AdminRepresentants] closeForm');
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
  }

  submit(): void {
    console.log('[AdminRepresentants] submit', { isEditMode: this.isEditMode, editingId: this.editingId });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const v = this.form.value;
    const entrepriseId = v.entrepriseId ? Number(v.entrepriseId) : undefined;

    if (this.isEditMode && this.editingId !== null) {
      const payload: UpdateResponsableEntrepriseRequest = {
        prenom: v.prenom,
        nom: v.nom,
        email: v.email,
        telephone: v.telephone,
        entrepriseId
      };

      this.service.update(this.editingId, payload).pipe(
        timeout(15000)
      ).subscribe({
        next: (updatedRepresentant) => {
          try {
            console.log('[AdminRepresentants] update success', this.editingId);
            this.successMessage = 'Representant mis a jour avec succes.';
            this.closeForm();
            this.upsertRepresentantInState(updatedRepresentant);

            if (!updatedRepresentant || !Number.isFinite(updatedRepresentant.id) || updatedRepresentant.id <= 0) {
              this.load();
            }
          } finally {
            this.isLoading = false;
          }
        },
        error: (err) => {
          try {
            console.error('Error updating representant:', err);
            this.errorMessage = this.extractErrorMessage(err, 'Echec de la mise a jour.');
          } finally {
            this.isLoading = false;
          }
        }
      });
      return;
    }

    const payload: CreateResponsableEntrepriseRequest = {
      prenom: v.prenom,
      nom: v.nom,
      email: v.email,
      telephone: v.telephone,
      entrepriseId
    };

    this.service.create(payload).pipe(
      timeout(15000)
    ).subscribe({
      next: (createdRepresentant) => {
        try {
          console.log('[AdminRepresentants] create success');
          this.successMessage = 'Representant cree avec succes.';
          this.closeForm();
          this.upsertRepresentantInState(createdRepresentant);

          if (!createdRepresentant || !Number.isFinite(createdRepresentant.id) || createdRepresentant.id <= 0) {
            this.load();
          }
        } finally {
          this.isLoading = false;
        }
      },
      error: (err) => {
        try {
          console.error('Error creating representant:', err);
          this.errorMessage = this.extractErrorMessage(err, 'Echec de la creation.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
