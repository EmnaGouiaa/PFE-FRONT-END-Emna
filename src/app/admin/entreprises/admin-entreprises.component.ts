import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  EntreprisesService,
  Entreprise,
  CreateEntrepriseRequest,
  UpdateEntrepriseRequest
} from '../../services/entreprises.service';

@Component({
  selector: 'app-admin-entreprises',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-entreprises.component.html',
  styleUrls: ['./admin-entreprises.component.css']
})
export class AdminEntreprisesComponent implements OnInit {
  entreprises: Entreprise[] = [];
  filtered: Entreprise[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';
  showForm = false;
  isEditMode = false;
  editingId: number | null = null;
  form!: FormGroup;

  constructor(private service: EntreprisesService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.minLength(2)]],
      adresseEntreprise: [''],
      emailEntreprise: ['', [Validators.email]],
      telephoneEntreprise: ['']
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

  private upsertEntrepriseInState(entreprise: Entreprise): void {
    console.log('[AdminEntreprises] API RESPONSE:', entreprise);
    if (!entreprise || !Number.isFinite(entreprise.id) || entreprise.id <= 0) return;

    const index = this.entreprises.findIndex((item) => item.id === entreprise.id);
    if (index >= 0) {
      const nextItems = [...this.entreprises];
      nextItems[index] = entreprise;
      this.entreprises = nextItems;
    } else {
      this.entreprises = [entreprise, ...this.entreprises];
    }

    this.filtered = [...this.entreprises];
    this.filter();
    console.log('[AdminEntreprises] UPDATED LIST:', this.entreprises);
  }

  load(): void {
    console.log('[AdminEntreprises] load triggered');
    this.isLoading = true;
    this.errorMessage = '';

    this.service.list().subscribe({
      next: (items) => {
        console.log('[AdminEntreprises] list success', items?.length ?? 0);
        this.entreprises = [...(items ?? [])];
        this.filtered = [...this.entreprises];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading entreprises:', err);
        this.errorMessage = this.extractErrorMessage(err, 'Echec du chargement des entreprises.');
        this.isLoading = false;
      }
    });
  }

  filter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = this.entreprises.filter((e) => {
      if (!q) return true;
      const text = [e.nomEntreprise, e.emailEntreprise, e.adresseEntreprise].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  openCreate(): void {
    console.log('[AdminEntreprises] openCreate');
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.reset({
      nomEntreprise: '',
      adresseEntreprise: '',
      emailEntreprise: '',
      telephoneEntreprise: ''
    });
  }

  openEdit(e: Entreprise): void {
    console.log('[AdminEntreprises] openEdit', e?.id);
    this.isEditMode = true;
    this.editingId = e.id;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form.patchValue({
      nomEntreprise: e.nomEntreprise ?? '',
      adresseEntreprise: e.adresseEntreprise ?? '',
      emailEntreprise: e.emailEntreprise ?? '',
      telephoneEntreprise: e.telephoneEntreprise ?? ''
    });
  }

  closeForm(): void {
    console.log('[AdminEntreprises] closeForm');
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
  }

  submit(): void {
    console.log('[AdminEntreprises] submit', { isEditMode: this.isEditMode, editingId: this.editingId });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const v = this.form.value;

    if (this.isEditMode && this.editingId !== null) {
      const payload: UpdateEntrepriseRequest = {
        nomEntreprise: v.nomEntreprise,
        adresseEntreprise: v.adresseEntreprise,
        emailEntreprise: v.emailEntreprise,
        telephoneEntreprise: v.telephoneEntreprise
      };

      this.service.update(this.editingId, payload).subscribe({
        next: (updatedEntreprise) => {
          console.log('[AdminEntreprises] update success', this.editingId);
          this.successMessage = 'Entreprise mise a jour avec succes.';
          this.closeForm();
          this.upsertEntrepriseInState(updatedEntreprise);
          this.isLoading = false;

          if (!updatedEntreprise || !Number.isFinite(updatedEntreprise.id) || updatedEntreprise.id <= 0) {
            this.load();
          }
        },
        error: (err) => {
          console.error('Error updating entreprise:', err);
          this.errorMessage = this.extractErrorMessage(err, 'Echec de la mise a jour.');
          this.isLoading = false;
        }
      });
      return;
    }

    const payload: CreateEntrepriseRequest = {
      nomEntreprise: v.nomEntreprise,
      adresseEntreprise: v.adresseEntreprise,
      emailEntreprise: v.emailEntreprise,
      telephoneEntreprise: v.telephoneEntreprise
    };

    this.service.create(payload).subscribe({
      next: (createdEntreprise) => {
        console.log('[AdminEntreprises] create success');
        this.successMessage = 'Entreprise creee avec succes.';
        this.closeForm();
        this.upsertEntrepriseInState(createdEntreprise);
        this.isLoading = false;

        if (!createdEntreprise || !Number.isFinite(createdEntreprise.id) || createdEntreprise.id <= 0) {
          this.load();
        }
      },
      error: (err) => {
        console.error('Error creating entreprise:', err);
        this.errorMessage = this.extractErrorMessage(err, 'Echec de la creation.');
        this.isLoading = false;
      }
    });
  }
}
