import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyAbsencesService } from '../../services/company/company-absences.service';
import {
  CompanyContext,
  CompanyInternship,
  CompanyAbsence,
  CompanyAbsencePayload
} from '../../services/company/company.models';

@Component({
  selector: 'app-company-absences-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-absences.component.html',
  styleUrls: ['../company-shared.css', './company-absences.component.css']
})
export class CompanyAbsencesPageComponent implements OnInit {
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  absencesByStage: { [stageId: number]: CompanyAbsence[] } = {};

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  // Pagination
  pageMap: { [stageId: number]: number } = {};
  readonly PAGE_SIZE = 5;

  // Modal state
  showModal = false;
  editingAbsence: CompanyAbsence | null = null;
  modalStageId: number | null = null;
  formDate = '';
  formNb = 1;
  formJustification = 'EN_ATTENTE';
  formCommentaire = '';
  formErrors: string[] = [];

  constructor(
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyAbsencesService: CompanyAbsencesService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachée à ce compte.";
          this.isLoading = false;
          return;
        }

        this.companyInternshipsService
          .listByEntreprise(context.responsable.entrepriseId)
          .pipe(timeout(15000))
          .subscribe({
            next: (internships) => {
              this.internships = internships;
              internships.forEach((i) => {
                if (this.pageMap[i.id] === undefined) this.pageMap[i.id] = 0;
              });

              if (internships.length === 0) {
                this.isLoading = false;
                return;
              }

              forkJoin(
                internships.map((i) =>
                  this.companyAbsencesService.listByStage(i.id).pipe(
                    catchError(() => of([] as CompanyAbsence[]))
                  )
                )
              )
                .pipe(timeout(15000))
                .subscribe({
                  next: (results) => {
                    internships.forEach((i, idx) => {
                      this.absencesByStage[i.id] = results[idx];
                    });
                    this.isLoading = false;
                  },
                  error: (err) => {
                    this.errorMessage = err?.error?.message ?? 'Impossible de charger les absences.';
                    this.isLoading = false;
                  }
                });
            },
            error: (err) => {
              this.errorMessage = err?.error?.message ?? 'Impossible de charger les stages.';
              this.isLoading = false;
            }
          });
      },
      error: (err) => {
        this.errorMessage = err?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getAbsences(stageId: number): CompanyAbsence[] {
    return this.absencesByStage[stageId] ?? [];
  }

  getPagedAbsences(stageId: number): CompanyAbsence[] {
    const list = this.getAbsences(stageId);
    const page = this.pageMap[stageId] ?? 0;
    return list.slice(page * this.PAGE_SIZE, (page + 1) * this.PAGE_SIZE);
  }

  getTotalPages(stageId: number): number {
    return Math.ceil(this.getAbsences(stageId).length / this.PAGE_SIZE);
  }

  getCurrentPage(stageId: number): number {
    return this.pageMap[stageId] ?? 0;
  }

  getPageNumbers(stageId: number): number[] {
    return Array.from({ length: this.getTotalPages(stageId) }, (_, i) => i);
  }

  setPage(stageId: number, page: number): void {
    this.pageMap[stageId] = page;
  }

  getTotalHeures(stageId: number): number {
    return (this.absencesByStage[stageId] ?? []).reduce((sum, a) => sum + (a.nbAbsence ?? 0), 0);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openModal(stageId: number, absence?: CompanyAbsence): void {
    this.modalStageId = stageId;
    this.editingAbsence = absence ?? null;
    this.formErrors = [];
    this.errorMessage = '';
    this.successMessage = '';

    if (absence) {
      this.formDate = absence.dateAbsence;
      this.formNb = absence.nbAbsence ?? 1;
      this.formJustification = absence.justification || 'EN_ATTENTE';
      this.formCommentaire = absence.commentaire || '';
    } else {
      this.formDate = '';
      this.formNb = 1;
      this.formJustification = 'EN_ATTENTE';
      this.formCommentaire = '';
    }

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingAbsence = null;
    this.modalStageId = null;
    this.formErrors = [];
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validateForm(): string[] {
    const errors: string[] = [];
    const stageId = this.modalStageId!;

    if (!this.formDate) {
      errors.push("La date d'absence est obligatoire.");
      return errors;
    }

    const d = new Date(this.formDate + 'T00:00:00');
    if (isNaN(d.getTime())) {
      errors.push("La date saisie est invalide.");
      return errors;
    }

    // Pas le dimanche (getDay() === 0)
    if (d.getDay() === 0) {
      errors.push("Les absences ne peuvent pas être déclarées le dimanche.");
    }

    // Nombre d'heures positif
    if (!this.formNb || this.formNb < 1) {
      errors.push("Le nombre d'heures d'absence doit être au moins égal à 1.");
    }

    // Date dans la période du stage (± 7 jours après la fin)
    const stage = this.internships.find((s) => s.id === stageId);
    if (stage) {
      if (stage.dateDebut) {
        const debut = new Date(stage.dateDebut + 'T00:00:00');
        if (d < debut) {
          errors.push(
            `La date doit être postérieure au début du stage (${this.formatDate(stage.dateDebut)}).`
          );
        }
      }
      if (stage.dateFin) {
        const fin = new Date(stage.dateFin + 'T00:00:00');
        const maxDate = new Date(fin.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (d > maxDate) {
          errors.push(
            `La date ne peut pas dépasser 7 jours après la fin du stage (${this.formatDate(stage.dateFin)}).`
          );
        }
      }
    }

    // Pas de doublon sur la même date pour le même stage
    const existing = this.absencesByStage[stageId] ?? [];
    const hasDuplicate = existing.some(
      (a) =>
        a.dateAbsence === this.formDate &&
        (!this.editingAbsence || a.id !== this.editingAbsence.id)
    );
    if (hasDuplicate) {
      errors.push("Une absence a déjà été déclarée pour cette date.");
    }

    return errors;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  saveAbsence(): void {
    this.formErrors = this.validateForm();
    if (this.formErrors.length > 0) return;

    this.isSaving = true;
    const stageId = this.modalStageId!;

    const payload: CompanyAbsencePayload = {
      stageId,
      dateAbsence: this.formDate,
      nbAbsence: this.formNb,
      justification: this.formJustification,
      commentaire: this.formCommentaire
    };

    const request$ = this.editingAbsence
      ? this.companyAbsencesService.update(this.editingAbsence.id, payload)
      : this.companyAbsencesService.create(payload);

    request$.pipe(timeout(15000)).subscribe({
      next: (saved) => {
        if (this.editingAbsence) {
          const list = this.absencesByStage[stageId] ?? [];
          const idx = list.findIndex((a) => a.id === this.editingAbsence!.id);
          if (idx !== -1) list[idx] = saved;
          this.successMessage = 'Absence mise à jour avec succès.';
        } else {
          if (!this.absencesByStage[stageId]) this.absencesByStage[stageId] = [];
          this.absencesByStage[stageId].unshift(saved);
          this.successMessage = 'Absence déclarée avec succès.';
        }
        this.isSaving = false;
        this.closeModal();
      },
      error: (err) => {
        this.formErrors = [err?.error?.message ?? "Impossible d'enregistrer l'absence."];
        this.isSaving = false;
      }
    });
  }

  deleteAbsence(stageId: number, absence: CompanyAbsence): void {
    if (
      !confirm(
        `Supprimer l'absence du ${this.formatDate(absence.dateAbsence)} (${absence.nbAbsence}h) ?`
      )
    )
      return;

    this.companyAbsencesService
      .delete(absence.id)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.absencesByStage[stageId] = (this.absencesByStage[stageId] ?? []).filter(
            (a) => a.id !== absence.id
          );
          // Corriger la page courante si elle devient vide
          const maxPage = Math.max(0, this.getTotalPages(stageId) - 1);
          if ((this.pageMap[stageId] ?? 0) > maxPage) {
            this.pageMap[stageId] = maxPage;
          }
          this.successMessage = 'Absence supprimée avec succès.';
          this.errorMessage = '';
        },
        error: (err) => {
          this.errorMessage = err?.error?.message ?? "Impossible de supprimer l'absence.";
        }
      });
  }

  // ── Labels & badges ───────────────────────────────────────────────────────

  getJustificationLabel(val: string): string {
    switch (val) {
      case 'JUSTIFIEE':
        return 'Justifiée';
      case 'NON_JUSTIFIEE':
        return 'Non justifiée';
      case 'EN_ATTENTE':
        return 'En attente';
      default:
        return val || 'En attente';
    }
  }

  getJustificationClass(val: string): string {
    switch (val) {
      case 'JUSTIFIEE':
        return 'status-positive';
      case 'NON_JUSTIFIEE':
        return 'badge-refused';
      default:
        return 'status-neutral';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getModalStageLabel(): string {
    if (!this.modalStageId) return '';
    const s = this.internships.find((i) => i.id === this.modalStageId);
    if (!s) return `Stage #${this.modalStageId}`;
    return s.titre || s.sujet || `Stage #${s.id}`;
  }

  trackById(_: number, item: CompanyInternship): number {
    return item.id;
  }
}
