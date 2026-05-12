import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { phoneValidator, strictEmailValidator } from '../../admin/admin-form-validators';
import { AuthentificationService } from '../../services/authentification.service';
import { StudentCompanyRequest } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

type FieldErrors = Record<string, string>;

@Component({
  selector: 'app-student-company-request-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Demande de création de compte entreprise</h1>
          <p>Déclarez une entreprise absente de la plateforme avec les informations réellement attendues par le back-end.</p>
        </div>
      </section>

      <div class="message-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="content-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Nouvelle demande</h2>
              <p class="panel-subtitle">Entreprise et responsable entreprise</p>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="form-grid">
              <div>
                <label>Nom de l’entreprise</label>
                <input class="input" formControlName="nomEntreprise" />
                <div class="field-error" *ngIf="getFieldError('nomEntreprise')">{{ getFieldError('nomEntreprise') }}</div>
              </div>
              <div>
                <label>Email entreprise</label>
                <input class="input" formControlName="emailEntreprise" />
                <div class="field-error" *ngIf="getFieldError('emailEntreprise')">{{ getFieldError('emailEntreprise') }}</div>
              </div>
              <div>
                <label>Téléphone entreprise</label>
                <input class="input" formControlName="telephoneEntreprise" />
                <div class="field-error" *ngIf="getFieldError('telephoneEntreprise')">{{ getFieldError('telephoneEntreprise') }}</div>
              </div>
              <div>
                <label>Secteur d’activité</label>
                <input class="input" formControlName="secteurActivite" />
                <div class="field-error" *ngIf="getFieldError('secteurActivite')">{{ getFieldError('secteurActivite') }}</div>
              </div>
              <div class="full-width">
                <label>Adresse</label>
                <input class="input" formControlName="adresse" />
                <div class="field-error" *ngIf="getFieldError('adresse')">{{ getFieldError('adresse') }}</div>
              </div>
              <div>
                <label>Nom du responsable</label>
                <input class="input" formControlName="nomResponsable" />
                <div class="field-error" *ngIf="getFieldError('nomResponsable')">{{ getFieldError('nomResponsable') }}</div>
              </div>
              <div>
                <label>Prénom du responsable</label>
                <input class="input" formControlName="prenomResponsable" />
                <div class="field-error" *ngIf="getFieldError('prenomResponsable')">{{ getFieldError('prenomResponsable') }}</div>
              </div>
              <div>
                <label>Email du responsable</label>
                <input class="input" formControlName="emailResponsable" />
                <div class="field-error" *ngIf="getFieldError('emailResponsable')">{{ getFieldError('emailResponsable') }}</div>
              </div>
              <div>
                <label>Téléphone du responsable</label>
                <input class="input" formControlName="telephoneResponsable" />
                <div class="field-error" *ngIf="getFieldError('telephoneResponsable')">{{ getFieldError('telephoneResponsable') }}</div>
              </div>
            </div>

            <div class="button-row" style="margin-top: 16px;">
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting || hasBlockingFieldErrors()">
                {{ isSubmitting ? 'Envoi...' : 'Envoyer la demande' }}
              </button>
            </div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Mes demandes envoyées</h2>
              <p class="panel-subtitle">Suivi des validations admin et responsable universitaire</p>
            </div>
          </div>

          <div class="empty-card" *ngIf="isLoadingRequests">Chargement des demandes...</div>
          <div class="empty-card" *ngIf="!isLoadingRequests && !requests.length">Aucune demande envoyée pour le moment.</div>

          <div class="stack" *ngIf="requests.length">
            <article class="detail-card" *ngFor="let request of requests">
              <div class="cell-title">{{ request.nomEntreprise || 'Entreprise non renseignée' }}</div>
              <div class="cell-sub">{{ request.adresse || 'Adresse non renseignée' }}</div>

              <div class="badge-stack">
                <span class="status-pill" [ngClass]="statusClass(request.statut)">{{ formatStatus(request.statut) }}</span>
                <span class="status-pill" [ngClass]="statusClass(request.statutAdmin)">Admin : {{ formatStatus(request.statutAdmin) }}</span>
                <span class="status-pill" [ngClass]="statusClass(request.statutResponsableStages)">Responsable : {{ formatStatus(request.statutResponsableStages) }}</span>
              </div>

              <div class="status-alert status-alert-rejected" *ngIf="isRejected(request)">
                <div class="status-alert-title">Statut : REFUSÉE</div>
                <div class="status-alert-subtitle">Cette demande a été refusée après traitement.</div>
              </div>

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Responsable</span>
                  <span class="meta-value">{{ request.prenomResponsable }} {{ request.nomResponsable }} · {{ request.emailResponsable || 'Email non renseigné' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Date de création</span>
                  <span class="meta-value">{{ formatDateTime(request.creeLe || request.dateDemande) }}</span>
                </div>
                <div class="meta-item" *ngIf="getProcessedAt(request) as processedAt">
                  <span class="meta-label">Date de traitement</span>
                  <span class="meta-value">{{ formatDateTime(processedAt) }}</span>
                </div>
              </div>

              <div class="refusal-card" *ngIf="getRefusalReason(request) as refusalReason">
                <div class="refusal-title">Motif du refus</div>
                <p>{{ refusalReason }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../student-shared.css', './student-company-request-page.component.css']
})
export class StudentCompanyRequestPageComponent implements OnInit {
  isSubmitting = false;
  isLoadingRequests = true;
  errorMessage = '';
  successMessage = '';
  requests: StudentCompanyRequest[] = [];
  fieldErrors: FieldErrors = {};
  submitAttempted = false;
  readonly form;

  constructor(
    private fb: FormBuilder,
    private authService: AuthentificationService,
    private studentPortalService: StudentPortalService
  ) {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.maxLength(160)]],
      emailEntreprise: ['', [Validators.required, strictEmailValidator()]],
      telephoneEntreprise: ['', [Validators.required, phoneValidator()]],
      adresse: ['', [Validators.required, Validators.maxLength(255)]],
      secteurActivite: ['', [Validators.required, Validators.maxLength(160)]],
      nomResponsable: ['', [Validators.required, Validators.maxLength(120)]],
      prenomResponsable: ['', [Validators.required, Validators.maxLength(120)]],
      emailResponsable: ['', [Validators.required, strictEmailValidator()]],
      telephoneResponsable: ['', [Validators.required, phoneValidator()]]
    });

    Object.keys(this.form.controls).forEach((fieldName) => {
      this.form.get(fieldName)?.valueChanges.subscribe(() => {
        delete this.fieldErrors[fieldName];
      });
    });
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  submit(): void {
    const studentId = this.authService.getUserId();
    if (!studentId) {
      this.errorMessage = 'Impossible de déterminer le stagiaire connecté.';
      return;
    }

    this.submitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};

    this.studentPortalService.createCompanyRequest({
      stagiaireId: studentId,
      nomEntreprise: this.form.value.nomEntreprise ?? '',
      emailEntreprise: this.form.value.emailEntreprise ?? '',
      telephoneEntreprise: this.form.value.telephoneEntreprise ?? '',
      adresse: this.form.value.adresse ?? '',
      secteurActivite: this.form.value.secteurActivite ?? '',
      nomResponsable: this.form.value.nomResponsable ?? '',
      prenomResponsable: this.form.value.prenomResponsable ?? '',
      emailResponsable: this.form.value.emailResponsable ?? '',
      telephoneResponsable: this.form.value.telephoneResponsable ?? ''
    }).subscribe({
      next: () => {
        this.successMessage = 'La demande de création de compte entreprise a été envoyée avec succès.';
        this.form.reset();
        this.submitAttempted = false;
        this.isSubmitting = false;
        this.loadRequests();
      },
      error: (error) => {
        this.applyBackendFieldError(error);
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible d’envoyer la demande.');
        this.isSubmitting = false;
      }
    });
  }

  loadRequests(): void {
    const studentId = this.authService.getUserId();
    if (!studentId) {
      this.errorMessage = 'Impossible de déterminer le stagiaire connecté.';
      this.isLoadingRequests = false;
      return;
    }

    this.isLoadingRequests = true;
    this.studentPortalService.listCompanyRequestsByStudent(studentId).subscribe({
      next: (requests) => {
        this.requests = requests;
        this.isLoadingRequests = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les demandes envoyées.');
        this.isLoadingRequests = false;
      }
    });
  }

  formatStatus(value: string): string {
    return String(value || 'INCONNU').replace(/_/g, ' ');
  }

  statusClass(value: string): string {
    return `status-${String(value || '').toUpperCase()}`;
  }

  formatDateTime(value: string): string {
    if (!value) return 'Date indisponible';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR');
  }

  isRejected(request: StudentCompanyRequest): boolean {
    return String(request.statut || '').toUpperCase() === 'REJETEE';
  }

  getProcessedAt(request: StudentCompanyRequest): string {
    return String(request.misAJourLe ?? '').trim();
  }

  getRefusalReason(request: StudentCompanyRequest): string {
    const adminReason = String(request.commentaireAdmin ?? '').trim();
    const responsibleReason = String(request.commentaireResponsableStages ?? '').trim();
    return adminReason || responsibleReason || '';
  }

  getFieldError(fieldName: string): string {
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = this.form.get(fieldName);
    if (!control || !(control.touched || this.submitAttempted)) {
      return '';
    }

    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['maxlength']) return 'Cette valeur est trop longue.';
    if (control.errors?.['missingAt']) return "L'e-mail doit contenir @.";
    if (control.errors?.['email']) return "Le format de l'e-mail est invalide.";
    if (control.errors?.['phone']) return 'Le numéro de téléphone est invalide.';
    return '';
  }

  hasBlockingFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

  private applyBackendFieldError(error: any): void {
    const field = typeof error?.error?.field === 'string' ? error.error.field : '';
    const message = typeof error?.error?.message === 'string' ? error.error.message : '';
    if (field && message && this.form.contains(field)) {
      this.fieldErrors = {
        ...this.fieldErrors,
        [field]: message
      };
    }
  }
}
