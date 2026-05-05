import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { CompanyAbsencesService } from '../../services/company/company-absences.service';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyAgreementsService } from '../../services/company/company-agreements.service';
import { ProfessionalSupervisorsService } from '../../services/company/professional-supervisors.service';
import { CompanyAbsence, CompanyAgreement, CompanyContext, CompanyInternship, ProfessionalSupervisor } from '../../services/company/company.models';

@Component({
  selector: 'app-company-internships-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './company-internships.component.html',
  styleUrls: ['../company-shared.css']
})
export class CompanyInternshipsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  selectedInternship: CompanyInternship | null = null;
  selectedAgreement: CompanyAgreement | null = null;
  agreementsByStageId = new Map<number, CompanyAgreement>();
  professionalSupervisors: ProfessionalSupervisor[] = [];
  selectedProfessionalSupervisorId: number | null = null;
  isAgreementLoading = false;
  areAgreementsLoading = false;
  isLoading = false;
  isUpdatingStatus = false;
  isAssigningSupervisor = false;
  isLoadingAbsences = false;
  isSavingAbsence = false;
  errorMessage = '';
  successMessage = '';
  absences: CompanyAbsence[] = [];
  absenceDraft = {
    dateAbsence: '',
    nbAbsence: 1,
    justification: '',
    commentaire: '',
    statut: ''
  };

  constructor(
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyAgreementsService: CompanyAgreementsService,
    private professionalSupervisorsService: ProfessionalSupervisorsService,
    private companyAbsencesService: CompanyAbsencesService
  ) {}

  ngOnInit(): void {
    this.loadInternships();
  }

  loadInternships(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedAgreement = null;
    this.agreementsByStageId = new Map();

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        const entrepriseId = context.responsable.entrepriseId;
        if (!entrepriseId) {
          this.errorMessage = 'Aucune entreprise n’est rattachée à ce compte.';
          this.isLoading = false;
          return;
        }

        this.companyInternshipsService
          .listByEntreprise(entrepriseId)
          .pipe(timeout(15000))
          .subscribe({
            next: (internships) => {
              this.internships = internships;
              this.selectedInternship = internships[0] ?? null;
              this.loadAgreements(internships.map((item) => item.id));
              this.selectedAgreement = this.selectedInternship ? this.getAgreement(this.selectedInternship.id) : null;
              this.selectedProfessionalSupervisorId = this.selectedInternship?.encadrantProfessionnelId ?? null;
              if (this.selectedInternship) {
                this.loadAbsences(this.selectedInternship.id);
              } else {
                this.absences = [];
              }

              this.professionalSupervisorsService
                .listByEntreprise(entrepriseId)
                .pipe(timeout(15000))
                .subscribe({
                  next: (supervisors) => {
                    this.professionalSupervisors = supervisors;
                  },
                  error: () => {
                    this.professionalSupervisors = [];
                  }
                });

              this.isLoading = false;
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? 'Impossible de charger les stages.';
              this.isLoading = false;
            }
          });
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  selectInternship(internship: CompanyInternship): void {
    this.selectedInternship = internship;
    this.selectedAgreement = this.getAgreement(internship.id);
    this.selectedProfessionalSupervisorId = internship.encadrantProfessionnelId ?? null;
    this.loadAbsences(internship.id);
  }

  getAgreement(stageId: number): CompanyAgreement | null {
    return this.agreementsByStageId.get(stageId) ?? null;
  }

  private loadAgreements(stageIds: number[]): void {
    this.areAgreementsLoading = true;
    this.isAgreementLoading = true;

    if (!stageIds.length) {
      this.agreementsByStageId = new Map();
      this.areAgreementsLoading = false;
      this.isAgreementLoading = false;
      return;
    }

    forkJoin(
      stageIds.map((stageId) =>
        this.companyAgreementsService.getByStageId(stageId).pipe(
          timeout(15000),
          catchError((error) => {
            if (error?.status === 401 || error?.status === 403) {
              this.errorMessage ||= 'Accès refusé lors du chargement des conventions de stage.';
            }
            return of(null);
          })
        )
      )
    ).subscribe((results) => {
      const entries = results
        .filter((item): item is CompanyAgreement => !!item && Number.isFinite(item.stageId) && item.stageId > 0)
        .map((item) => [item.stageId, item] as const);

      this.agreementsByStageId = new Map(entries);
      this.selectedAgreement = this.selectedInternship ? this.getAgreement(this.selectedInternship.id) : null;
      this.areAgreementsLoading = false;
      this.isAgreementLoading = false;
    });
  }

  private loadAgreement(stageId: number): void {
    this.selectedAgreement = null;
    this.isAgreementLoading = true;

    this.companyAgreementsService.getByStageId(stageId).pipe(timeout(15000)).subscribe({
      next: (agreement) => {
        this.selectedAgreement = agreement;
        this.isAgreementLoading = false;
      },
      error: () => {
        // Une convention n'existe pas forcément pour tous les stages.
        this.selectedAgreement = null;
        this.isAgreementLoading = false;
      }
    });
  }

  validateByEntreprise(internship: CompanyInternship): void {
    this.isUpdatingStatus = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyInternshipsService.validateByEntreprise(internship.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Le stage a été validé côté entreprise.';
        this.isUpdatingStatus = false;
        this.loadInternships();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de valider ce stage.';
        this.isUpdatingStatus = false;
      }
    });
  }

  assignProfessionalSupervisor(internship: CompanyInternship): void {
    const selectedId = this.selectedProfessionalSupervisorId;
    if (!selectedId) return;
    if (selectedId === internship.encadrantProfessionnelId) return;

    const supervisor = this.professionalSupervisors.find((item) => item.id === selectedId);
    const supervisorLabel = supervisor ? `${supervisor.prenom} ${supervisor.nom}`.trim() : `#${selectedId}`;
    if (!confirm(`Affecter ${supervisorLabel} comme encadrant professionnel pour ce stage ?`)) return;

    this.isAssigningSupervisor = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyInternshipsService.assignProfessionalSupervisor(internship.id, selectedId).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Encadrant professionnel affecté avec succès.';
        this.isAssigningSupervisor = false;
        this.loadInternships();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible d’affecter cet encadrant professionnel.';
        this.isAssigningSupervisor = false;
      }
    });
  }

  saveAbsence(): void {
    if (!this.selectedInternship) return;
    if (!this.absenceDraft.dateAbsence || !this.absenceDraft.justification.trim()) {
      this.errorMessage = "La date et la justification de l'absence sont obligatoires.";
      return;
    }

    this.isSavingAbsence = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyAbsencesService.create({
      stageId: this.selectedInternship.id,
      dateAbsence: this.absenceDraft.dateAbsence,
      nbAbsence: this.absenceDraft.nbAbsence,
      justification: this.absenceDraft.justification,
      commentaire: this.absenceDraft.commentaire,
      statut: this.absenceDraft.statut
    }).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = "Absence enregistrée avec succès.";
        this.isSavingAbsence = false;
        this.resetAbsenceDraft();
        this.loadAbsences(this.selectedInternship!.id);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Impossible d'enregistrer l'absence.";
        this.isSavingAbsence = false;
      }
    });
  }

  private loadAbsences(stageId: number): void {
    this.isLoadingAbsences = true;
    this.absences = [];
    this.companyAbsencesService.listByStage(stageId).pipe(timeout(15000)).subscribe({
      next: (absences) => {
        this.absences = absences.sort((a, b) => a.dateAbsence.localeCompare(b.dateAbsence));
        this.isLoadingAbsences = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? "Impossible de charger les absences du stage.";
        this.isLoadingAbsences = false;
      }
    });
  }

  private resetAbsenceDraft(): void {
    this.absenceDraft = {
      dateAbsence: '',
      nbAbsence: 1,
      justification: '',
      commentaire: '',
      statut: ''
    };
  }
}
