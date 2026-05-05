import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';
import { StudentInternship, StudentOffer, StudentProfile } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';
import { SatisfactionSurveySectionComponent } from '../../components/satisfaction-survey-section.component';

@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, SatisfactionSurveySectionComponent],
  templateUrl: './student-dashboard-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentDashboardPageComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  profile: StudentProfile | null = null;
  currentInternship: StudentInternship | null = null;
  availableOffers: StudentOffer[] = [];
  unreadNotifications = 0;

  stats = {
    demandes: 0,
    stages: 0,
    reunions: 0,
    documents: 0
  };

  constructor(
    private authService: AuthentificationService,
    private studentPortalService: StudentPortalService,
    private notificationService: NotificationService,
    public profileCompletionService: ProfileCompletionService
  ) {}

  ngOnInit(): void {
    const studentId = this.authService.getUserId();
    if (!studentId) {
      this.errorMessage = 'Impossible de determiner le stagiaire connecte.';
      this.isLoading = false;
      return;
    }

    forkJoin({
      profile: this.studentPortalService.getProfile(studentId).pipe(catchError(() => of(null))),
      requests: this.studentPortalService.listCompanyRequestsByStudent(studentId).pipe(catchError(() => of([]))),
      internships: this.studentPortalService.listMyInternships().pipe(catchError(() => of([]))),
      offers: this.studentPortalService.listOpenOffers().pipe(catchError(() => of([]))),
      unreadNotifications: this.notificationService.countUnread(studentId).pipe(catchError(() => of(0)))
    }).subscribe({
      next: ({ profile, requests, internships, offers, unreadNotifications }) => {
        this.profile = profile;
        this.stats.demandes = requests.length;
        this.stats.stages = internships.length;
        this.currentInternship = this.studentPortalService.pickCurrentInternship(internships);
        this.availableOffers = offers.slice(0, 3);
        this.unreadNotifications = unreadNotifications;

        if (!this.currentInternship) {
          this.stats.reunions = 0;
          this.stats.documents = 0;
          this.isLoading = false;
          return;
        }

        forkJoin({
          meetings: this.studentPortalService.listMeetingsByStage(this.currentInternship.id).pipe(catchError(() => of([]))),
          finalMeetings: this.studentPortalService.listFinalMeetingsByStage(this.currentInternship.id).pipe(catchError(() => of([]))),
          agreement: this.studentPortalService.getAgreementByStage(this.currentInternship.id).pipe(catchError(() => of(null))),
          report: this.studentPortalService.getReportByStage(this.currentInternship.id).pipe(catchError(() => of(null))),
          evaluation: this.studentPortalService.getEvaluationByStage(this.currentInternship.id).pipe(catchError(() => of(null)))
        }).subscribe({
          next: ({ meetings, finalMeetings, agreement, report, evaluation }) => {
            this.stats.reunions = meetings.length + finalMeetings.length;
            this.stats.documents = [agreement, report, evaluation].filter((item) => !!item).length;
            this.isLoading = false;
          },
          error: () => {
            this.stats.reunions = 0;
            this.stats.documents = 0;
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger le tableau de bord stagiaire.');
        this.isLoading = false;
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  formatStatus(value: string): string {
    return String(value || 'INCONNU').replace(/_/g, ' ');
  }

  statusClass(value: string): string {
    return `status-${String(value || '').toUpperCase()}`;
  }

  get profileCompletionMissingFields(): string[] {
    return this.profileCompletionService.getMissingFieldsForStudent(this.profile);
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }
}
