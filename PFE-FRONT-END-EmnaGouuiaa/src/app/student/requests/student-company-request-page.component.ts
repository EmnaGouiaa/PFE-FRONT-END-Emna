import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthentificationService } from '../../services/authentification.service';
import { StudentCompanyRequest } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-company-request-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Demande de création de compte entreprise</h1>
          <p>Déclarez une entreprise absente de la plateforme avec les informations réellement attendues par le backend.</p>
        </div>
      </section>

      <div class="message-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="content-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Nouvelle demande</h2>
              <p class="panel-subtitle">Entreprise + responsable entreprise</p>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="form-grid">
              <div>
                <label>Nom de l’entreprise</label>
                <input class="input" formControlName="nomEntreprise" />
              </div>
              <div>
                <label>Email entreprise</label>
                <input class="input" formControlName="emailEntreprise" />
              </div>
              <div>
                <label>Téléphone entreprise</label>
                <input class="input" formControlName="telephoneEntreprise" />
              </div>
              <div>
                <label>Secteur d’activité</label>
                <input class="input" formControlName="secteurActivite" />
              </div>
              <div class="full-width">
                <label>Adresse</label>
                <input class="input" formControlName="adresse" />
              </div>
              <div>
                <label>Nom du responsable</label>
                <input class="input" formControlName="nomResponsable" />
              </div>
              <div>
                <label>Prénom du responsable</label>
                <input class="input" formControlName="prenomResponsable" />
              </div>
              <div class="full-width">
                <label>Email du responsable</label>
                <input class="input" formControlName="emailResponsable" />
              </div>
            </div>

            <div class="button-row" style="margin-top: 16px;">
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting">
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
              <div class="cell-sub">Responsable : {{ request.prenomResponsable }} {{ request.nomResponsable }} · {{ request.emailResponsable || 'Email non renseigné' }}</div>
              <div class="cell-sub">Créée le {{ formatDateTime(request.creeLe || request.dateDemande) }}</div>
            </article>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentCompanyRequestPageComponent implements OnInit {
  isSubmitting = false;
  isLoadingRequests = true;
  errorMessage = '';
  successMessage = '';
  requests: StudentCompanyRequest[] = [];
  readonly form;

  constructor(
    private fb: FormBuilder,
    private authService: AuthentificationService,
    private studentPortalService: StudentPortalService
  ) {
    this.form = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.maxLength(160)]],
      emailEntreprise: ['', [Validators.required, Validators.email]],
      telephoneEntreprise: ['', [Validators.required, Validators.maxLength(30)]],
      adresse: ['', [Validators.required, Validators.maxLength(255)]],
      secteurActivite: ['', [Validators.required, Validators.maxLength(160)]],
      nomResponsable: ['', [Validators.required, Validators.maxLength(120)]],
      prenomResponsable: ['', [Validators.required, Validators.maxLength(120)]],
      emailResponsable: ['', [Validators.required, Validators.email]]
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.createCompanyRequest({
      stagiaireId: studentId,
      nomEntreprise: this.form.value.nomEntreprise ?? '',
      emailEntreprise: this.form.value.emailEntreprise ?? '',
      telephoneEntreprise: this.form.value.telephoneEntreprise ?? '',
      adresse: this.form.value.adresse ?? '',
      secteurActivite: this.form.value.secteurActivite ?? '',
      nomResponsable: this.form.value.nomResponsable ?? '',
      prenomResponsable: this.form.value.prenomResponsable ?? '',
      emailResponsable: this.form.value.emailResponsable ?? ''
    }).subscribe({
      next: () => {
        this.successMessage = 'La demande de création de compte entreprise a été envoyée avec succès.';
        this.form.reset();
        this.isSubmitting = false;
        this.loadRequests();
      },
      error: (error) => {
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
}
