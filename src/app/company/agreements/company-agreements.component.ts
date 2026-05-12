import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyAgreementsService } from '../../services/company/company-agreements.service';
import { CompanyAgreement, CompanyContext, CompanyInternship } from '../../services/company/company.models';

@Component({
  selector: 'app-company-agreements-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-agreements.component.html',
  styleUrls: ['../company-shared.css']
})
export class CompanyAgreementsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  agreements: CompanyAgreement[] = [];
  selectedAgreement: CompanyAgreement | null = null;
  isLoading = false;
  isSigning = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyAgreementsService: CompanyAgreementsService
  ) {}

  ngOnInit(): void {
    this.loadAgreements();
  }

  loadAgreements(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.errorMessage = 'Aucune entreprise n’est rattachée à ce compte.';
          this.isLoading = false;
          return;
        }

        this.companyInternshipsService
          .listByEntreprise(context.responsable.entrepriseId)
          .pipe(timeout(15000))
          .subscribe({
            next: (internships) => {
              this.internships = internships;

              if (internships.length === 0) {
                this.agreements = [];
                this.selectedAgreement = null;
                this.isLoading = false;
                return;
              }

              forkJoin(
                internships.map((internship) =>
                  this.companyAgreementsService.getByStageId(internship.id).pipe(
                    catchError(() => of(null))
                  )
                )
              )
                .pipe(
                  map((items) => items.filter((item): item is CompanyAgreement => item !== null)),
                  timeout(15000)
                )
                .subscribe({
                  next: (agreements) => {
                    this.agreements = agreements;
                    this.selectedAgreement = agreements[0] ?? null;
                    this.isLoading = false;
                  },
                  error: (error) => {
                    this.errorMessage = error?.error?.message ?? 'Impossible de charger les conventions.';
                    this.isLoading = false;
                  }
                });
            },
            error: (error) => {
              this.errorMessage = error?.error?.message ?? 'Impossible de charger les stages entreprise.';
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

  signAgreement(agreement: CompanyAgreement): void {
    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyAgreementsService.signByEntreprise(agreement.id).pipe(timeout(15000)).subscribe({
      next: () => {
        this.successMessage = 'Convention signée avec succès.';
        this.isSigning = false;
        this.loadAgreements();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Impossible de signer cette convention.';
        this.isSigning = false;
      }
    });
  }
}
