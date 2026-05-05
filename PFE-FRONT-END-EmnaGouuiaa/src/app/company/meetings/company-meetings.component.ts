import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { timeout } from 'rxjs/operators';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { CompanyContext, CompanyMeeting } from '../../services/company/company.models';

@Component({
  selector: 'app-company-meetings-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-meetings.component.html',
  styleUrls: ['../company-shared.css']
})
export class CompanyMeetingsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  meetings: CompanyMeeting[] = [];
  selectedMeeting: CompanyMeeting | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private companyContextService: CompanyContextService,
    private companyMeetingsService: CompanyMeetingsService
  ) {}

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyContextService.getContext().pipe(timeout(15000)).subscribe({
      next: (context) => {
        this.context = context;

        if (!context.responsable.entrepriseId) {
          this.meetings = [];
          this.selectedMeeting = null;
          this.errorMessage = 'Aucune entreprise n est rattachee a ce compte.';
          this.isLoading = false;
          return;
        }

        this.companyMeetingsService
          .listForCurrentCompany()
          .pipe(timeout(15000))
          .subscribe({
            next: (meetings) => {
              this.meetings = meetings;
              this.selectedMeeting = null;
              this.isLoading = false;
            },
            error: (error) => {
              this.meetings = [];
              this.selectedMeeting = null;
              this.errorMessage = error?.error?.message ?? error?.message ?? 'Impossible de charger les reunions de l entreprise.';
              this.isLoading = false;
            }
          });
      },
      error: (error) => {
        this.meetings = [];
        this.selectedMeeting = null;
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
        this.isLoading = false;
      }
    });
  }

  openMeetingDetails(meeting: CompanyMeeting): void {
    this.selectedMeeting = meeting;
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
  }

  getMeetingTypeLabel(meeting: CompanyMeeting | null): string {
    if (!meeting) {
      return '-';
    }
    return meeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion hebdomadaire';
  }
}
