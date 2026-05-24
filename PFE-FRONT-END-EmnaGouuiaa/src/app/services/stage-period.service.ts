import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

import { AuthentificationService, RoleUtilisateur } from './authentification.service';
import { SupervisorPortalService } from './supervisor/supervisor-portal.service';
import { SupervisorRole } from './supervisor/supervisor.models';
import { CompanyContextService } from './company/company-context.service';
import { CompanyInternshipsService } from './company/company-internships.service';
import { CompanyMeetingsService } from './company/company-meetings.service';
import { StudentPortalService } from './student/student-portal.service';
import { isStagePeriodOpen, getStagePeriodOpenDate } from './stage-period.utils';

const TIMEOUT_MS = 10_000;

export interface StagePeriodStatus {
  /** True si la période est ouverte (sysdate >= réunion finale OU fin du stage). */
  open: boolean;
  /** Date à partir de laquelle la période s'ouvre (pour l'affichage du message "Disponible à partir du…"). */
  openDate: Date | null;
}

@Injectable({ providedIn: 'root' })
export class StagePeriodService {
  constructor(
    private authService: AuthentificationService,
    private supervisorService: SupervisorPortalService,
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyMeetingsService: CompanyMeetingsService,
    private studentPortalService: StudentPortalService
  ) {}

  /**
   * Vérifie si au moins un stage de l'utilisateur connecté satisfait :
   *   sysdate >= dateRéunionFinale  OU  sysdate >= dateFinStage
   *
   * Les rôles ADMINISTRATEUR et RESPONSABLE_STAGE ont toujours accès.
   */
  checkAnyPeriodOpen(): Observable<StagePeriodStatus> {
    const role = this.authService.getRoleUtilisateur();

    switch (role) {
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return this.checkForSupervisor('ENCADRANT_PROFESSIONNEL');
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return this.checkForSupervisor('ENCADRANT_ACADEMIQUE');
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return this.checkForCompany();
      case RoleUtilisateur.STAGIAIRE:
        return this.checkForStudent();
      default:
        // ADMINISTRATEUR, RESPONSABLE_STAGE → accès toujours ouvert
        return of({ open: true, openDate: null });
    }
  }

  // ── Encadrants (académique et professionnel) ─────────────────────────────

  private checkForSupervisor(supervisorRole: SupervisorRole): Observable<StagePeriodStatus> {
    return this.supervisorService.listMyInternships(supervisorRole).pipe(
      timeout(TIMEOUT_MS),
      switchMap((internships) => {
        if (!internships.length) {
          return of<StagePeriodStatus>({ open: false, openDate: null });
        }

        return this.supervisorService.listMeetingsForInternships(internships).pipe(
          timeout(TIMEOUT_MS),
          map((meetings) => this.computeStatus(
            internships.map((i) => {
              const finale = meetings.find((m) => m.stageId === i.id && m.source === 'FINALE');
              return { dateFin: i.dateFin, dateFinale: finale?.date ?? null };
            })
          )),
          catchError(() => of(this.computeStatus(
            internships.map((i) => ({ dateFin: i.dateFin, dateFinale: null }))
          )))
        );
      }),
      catchError(() => of<StagePeriodStatus>({ open: false, openDate: null }))
    );
  }

  // ── Responsable entreprise ────────────────────────────────────────────────

  private checkForCompany(): Observable<StagePeriodStatus> {
    return this.companyContextService.getContext().pipe(
      timeout(TIMEOUT_MS),
      switchMap((context) => {
        if (!context.responsable.entrepriseId) {
          return of<StagePeriodStatus>({ open: false, openDate: null });
        }

        return forkJoin({
          internships: this.companyInternshipsService
            .listByEntreprise(context.responsable.entrepriseId)
            .pipe(catchError(() => of([]))),
          meetings: this.companyMeetingsService
            .listForCurrentCompany()
            .pipe(catchError(() => of([])))
        }).pipe(
          timeout(TIMEOUT_MS),
          map(({ internships, meetings }) =>
            this.computeStatus(
              internships.map((i) => {
                const finale = meetings.find((m) => m.stageId === i.id && m.source === 'FINALE');
                return { dateFin: i.dateFin, dateFinale: finale?.date ?? null };
              })
            )
          )
        );
      }),
      catchError(() => of<StagePeriodStatus>({ open: false, openDate: null }))
    );
  }

  // ── Stagiaire ─────────────────────────────────────────────────────────────

  private checkForStudent(): Observable<StagePeriodStatus> {
    return this.studentPortalService.listMyInternships().pipe(
      timeout(TIMEOUT_MS),
      switchMap((internships) => {
        if (!internships.length) {
          return of<StagePeriodStatus>({ open: false, openDate: null });
        }

        return forkJoin(
          internships.map((i) =>
            this.studentPortalService.listMeetingsByStage(i.id).pipe(
              timeout(TIMEOUT_MS),
              map((meetings) => {
                const finale = meetings.find((m) => m.source === 'FINALE');
                return { dateFin: i.dateFin, dateFinale: finale?.date ?? null };
              }),
              catchError(() => of({ dateFin: i.dateFin, dateFinale: null as string | null }))
            )
          )
        ).pipe(map((entries) => this.computeStatus(entries)));
      }),
      catchError(() => of<StagePeriodStatus>({ open: false, openDate: null }))
    );
  }

  // ── Helper interne ────────────────────────────────────────────────────────

  private computeStatus(
    entries: Array<{ dateFin: string | null; dateFinale: string | null }>
  ): StagePeriodStatus {
    for (const e of entries) {
      if (isStagePeriodOpen(e.dateFin, e.dateFinale)) {
        return { open: true, openDate: null };
      }
    }

    // Période fermée → calculer la prochaine date d'ouverture
    const openDate = entries.reduce<Date | null>((earliest, e) => {
      const d = getStagePeriodOpenDate(e.dateFin, e.dateFinale);
      if (!d) return earliest;
      return !earliest || d < earliest ? d : earliest;
    }, null);

    return { open: false, openDate };
  }
}
