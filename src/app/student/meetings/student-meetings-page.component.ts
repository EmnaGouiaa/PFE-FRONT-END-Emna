import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { StudentInternship, StudentMeeting } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-meetings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-meetings-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css', './student-meetings-page.component.css']
})
export class StudentMeetingsPageComponent implements OnInit, OnDestroy {
  isLoadingInternships = true;
  isLoadingMeetings = false;
  isSavingReport = false;
  errorMessage = '';
  successMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  meetings: StudentMeeting[] = [];
  selectedMeeting: StudentMeeting | null = null;
  reportDraft = '';
  private meetingsRefreshSubscription: Subscription | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.pickCurrentInternship(internships) ?? internships[0] ?? null;
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        this.startMeetingsRefresh();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.meetingsRefreshSubscription?.unsubscribe();
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.selectedInternship = this.internships.find((item) => item.id === this.selectedStageId) ?? null;
    this.selectedMeeting = null;
    this.reportDraft = '';
    this.loadMeetingsForSelectedStage();
  }

  selectMeeting(meeting: StudentMeeting): void {
    this.selectedMeeting = meeting;
    this.reportDraft = meeting.compteRendu || '';
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
    this.reportDraft = '';
  }

  canEditReport(meeting: StudentMeeting | null): boolean {
    if (!meeting) {
      return false;
    }

    return this.toTimestamp(meeting) < Date.now();
  }

  saveReport(): void {
    if (!this.selectedMeeting) {
      return;
    }

    this.isSavingReport = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.updateMeetingReport(this.selectedMeeting.id, this.reportDraft).subscribe({
      next: (updatedMeeting) => {
        this.isSavingReport = false;
        this.successMessage = 'Compte rendu enregistré.';
        this.reportDraft = updatedMeeting.compteRendu || '';
        this.selectedMeeting = updatedMeeting;
        this.loadMeetingsForSelectedStage();
      },
      error: (error) => {
        this.isSavingReport = false;
        this.errorMessage = this.studentPortalService.describeError(error, "Impossible d'enregistrer le compte rendu.");
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  getMeetingTitle(meeting: StudentMeeting): string {
    return `Réunion avec l'encadrant ${this.getSupervisorTypeLabel(meeting).toLowerCase()} : ${this.getSupervisorName(meeting)}`;
  }

  getSupervisorTypeLabel(meeting: StudentMeeting): string {
    const explicitType = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
    if (explicitType === 'ACADEMIQUE') {
      return 'Académique';
    }
    if (explicitType === 'PROFESSIONNEL') {
      return 'Professionnel';
    }
    if (meeting.source === 'FINALE') {
      return 'Professionnel';
    }
    return 'Non renseigné';
  }

  getSupervisorBadgeClass(meeting: StudentMeeting): string {
    return this.getSupervisorTypeLabel(meeting) === 'Académique'
      ? 'meeting-badge-academic'
      : 'meeting-badge-professional';
  }

  getSupervisorName(meeting: StudentMeeting): string {
    const explicitName = String(meeting.nomEncadrantCreateur ?? '').trim();
    if (explicitName) {
      return explicitName;
    }

    if (this.selectedInternship) {
      if (this.getSupervisorTypeLabel(meeting) === 'Académique') {
        return this.selectedInternship.academicSupervisor.fullName || 'Non renseigné';
      }
      if (this.getSupervisorTypeLabel(meeting) === 'Professionnel') {
        return this.selectedInternship.professionalSupervisor.fullName || 'Non renseigné';
      }
    }

    return 'Non renseigné';
  }

  getMeetingTypeLabel(meeting: StudentMeeting): string {
    return meeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion hebdomadaire';
  }

  getMeetingCardClass(meeting: StudentMeeting): string {
    return meeting.source === 'FINALE' ? 'meeting-card-final' : 'meeting-card-weekly';
  }

  get stageMeetings(): StudentMeeting[] {
    return this.meetings;
  }

  get upcomingMeetings(): StudentMeeting[] {
    const now = Date.now();
    return this.stageMeetings.filter((meeting) => this.toTimestamp(meeting) >= now);
  }

  get pastMeetings(): StudentMeeting[] {
    const now = Date.now();
    return this.stageMeetings.filter((meeting) => this.toTimestamp(meeting) < now);
  }

  private startMeetingsRefresh(): void {
    this.meetingsRefreshSubscription?.unsubscribe();
    this.meetingsRefreshSubscription = interval(30000)
      .pipe(startWith(0))
      .subscribe(() => this.loadMeetingsForSelectedStage());
  }

  private loadMeetingsForSelectedStage(): void {
    if (!this.selectedStageId) {
      this.meetings = [];
      this.selectedMeeting = null;
      return;
    }

    const selectedMeetingId = this.selectedMeeting?.id ?? null;
    this.isLoadingMeetings = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.listMeetingsForStage(this.selectedStageId).subscribe({
      next: (meetings) => {
        this.meetings = [...meetings].sort((a, b) => this.toTimestamp(b) - this.toTimestamp(a));
        this.selectedMeeting = selectedMeetingId
          ? this.meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null
          : null;
        this.reportDraft = this.selectedMeeting?.compteRendu || '';
        this.isLoadingMeetings = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les réunions.');
        this.meetings = [];
        this.selectedMeeting = null;
        this.reportDraft = '';
        this.isLoadingMeetings = false;
      }
    });
  }

  private toTimestamp(meeting: StudentMeeting): number {
    const isoValue = `${meeting.date || '1970-01-01'}T${meeting.heure || '00:00:00'}`;
    const timestamp = Date.parse(isoValue);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
