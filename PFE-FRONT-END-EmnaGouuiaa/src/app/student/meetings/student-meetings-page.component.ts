import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentInternship, StudentMeeting } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';

@Component({
  selector: 'app-student-meetings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-meetings-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentMeetingsPageComponent implements OnInit {
  isLoadingInternships = true;
  isLoadingMeetings = false;
  errorMessage = '';
  internships: StudentInternship[] = [];
  selectedInternship: StudentInternship | null = null;
  selectedStageId: number | null = null;
  meetings: StudentMeeting[] = [];
  selectedMeeting: StudentMeeting | null = null;

  constructor(private studentPortalService: StudentPortalService) {}

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        this.selectedInternship = this.studentPortalService.pickCurrentInternship(internships) ?? internships[0] ?? null;
        this.selectedStageId = this.selectedInternship?.id ?? null;
        this.isLoadingInternships = false;
        this.loadMeetings();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    this.selectedInternship = this.internships.find((item) => item.id === this.selectedStageId) ?? null;
    this.applyStageMeetings();
  }

  selectMeeting(meeting: StudentMeeting): void {
    this.selectedMeeting = meeting;
  }

  closeMeetingDetails(): void {
    this.selectedMeeting = null;
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  get stageMeetings(): StudentMeeting[] {
    if (!this.selectedStageId) {
      return [];
    }
    return this.meetings.filter((meeting) => meeting.stageId === this.selectedStageId);
  }

  get upcomingMeetings(): StudentMeeting[] {
    const now = Date.now();
    return this.stageMeetings.filter((meeting) => this.toTimestamp(meeting) >= now);
  }

  get pastMeetings(): StudentMeeting[] {
    const now = Date.now();
    return this.stageMeetings.filter((meeting) => this.toTimestamp(meeting) < now);
  }

  private loadMeetings(): void {
    this.isLoadingMeetings = true;
    this.errorMessage = '';
    this.meetings = [];
    this.selectedMeeting = null;

    this.studentPortalService.listMyMeetings().subscribe({
      next: (meetings) => {
        this.meetings = [...meetings].sort((a, b) => this.toTimestamp(b) - this.toTimestamp(a));
        this.applyStageMeetings();
        this.isLoadingMeetings = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les reunions.');
        this.isLoadingMeetings = false;
      }
    });
  }

  private applyStageMeetings(): void {
    this.selectedMeeting = null;
  }

  private toTimestamp(meeting: StudentMeeting): number {
    const isoValue = `${meeting.date || '1970-01-01'}T${meeting.heure || '00:00:00'}`;
    const timestamp = Date.parse(isoValue);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
