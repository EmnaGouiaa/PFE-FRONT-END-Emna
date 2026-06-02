import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { StudentInternship, StudentMeeting } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';
import {
  getMeetingTimestamp,
  meetingShowsObservation,
  splitMeetingsBySchedule
} from '../../utils/meeting-schedule.util';
import {
  meetingDisplayValue,
  resolveMeetingCompanySupervisorName,
  resolveMeetingCreatorName,
  resolveMeetingCreatorTypeLabel
} from '../../utils/meeting-display.util';

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
  errorMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  meetings: StudentMeeting[] = [];
  selectedMeeting: StudentMeeting | null = null;
  private meetingsRefreshSubscription: Subscription | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.resolveSelectedInternship(internships);
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
    this.studentPortalService.setSelectedStageId(this.selectedStageId);
    this.selectedMeeting = null;
    this.loadMeetingsForSelectedStage();
  }

  selectMeeting(meeting: StudentMeeting): void {
    this.selectedMeeting = meeting;
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
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
    const label = resolveMeetingCreatorTypeLabel(meeting.typeEncadrantCreateur);
    if (label !== 'Non renseigné') {
      return label === 'Encadrant académique' ? 'Académique' : label === 'Encadrant professionnel' ? 'Professionnel' : label;
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
    return resolveMeetingCreatorName(meeting, this.selectedInternship ?? undefined);
  }

  getCompanySupervisorName(meeting: StudentMeeting): string {
    return resolveMeetingCompanySupervisorName(meeting.companySupervisorName, this.selectedInternship ?? undefined);
  }

  meetingLabel(value: string | null | undefined): string {
    return meetingDisplayValue(value);
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
    return splitMeetingsBySchedule(this.stageMeetings).upcoming;
  }

  get pastMeetings(): StudentMeeting[] {
    return splitMeetingsBySchedule(this.stageMeetings).past;
  }

  readonly showsMeetingObservation = meetingShowsObservation;

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

    this.studentPortalService.listMeetingsForStage(this.selectedStageId).subscribe({
      next: (meetings) => {
        this.meetings = [...meetings].sort((a, b) => getMeetingTimestamp(b) - getMeetingTimestamp(a));
        this.selectedMeeting = selectedMeetingId
          ? this.meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null
          : null;
        this.isLoadingMeetings = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les réunions.');
        this.meetings = [];
        this.selectedMeeting = null;
        this.isLoadingMeetings = false;
      }
    });
  }

}
