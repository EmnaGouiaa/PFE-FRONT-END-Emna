import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthentificationService } from '../../services/authentification.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileCompletionService } from '../../services/profile-completion.service';
import { StudentInternship, StudentMeeting, StudentOffer, StudentProfile, StudentTrelloSummary } from '../../services/student/student.models';
import { StudentPortalService } from '../../services/student/student-portal.service';
@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  nextMeeting: StudentMeeting | null = null;
  trelloSummary: StudentTrelloSummary | null = null;

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
        this.currentInternship = this.studentPortalService.resolveSelectedInternship(internships);
        this.availableOffers = offers.slice(0, 3);
        this.unreadNotifications = unreadNotifications;

        if (!this.currentInternship) {
          this.stats.reunions = 0;
          this.stats.documents = 0;
          this.nextMeeting = null;
          this.trelloSummary = null;
          this.isLoading = false;
          return;
        }

        forkJoin({
          meetings: this.studentPortalService.listMeetingsByStage(this.currentInternship.id).pipe(catchError(() => of([]))),
          finalMeetings: this.studentPortalService.listFinalMeetingsByStage(this.currentInternship.id).pipe(catchError(() => of([]))),
          agreement: this.studentPortalService.getAgreementByStage(this.currentInternship.id).pipe(catchError(() => of(null))),
          report: this.studentPortalService.getReportByStage(this.currentInternship.id).pipe(catchError(() => of(null))),
          evaluation: this.studentPortalService.getEvaluationByStage(this.currentInternship.id).pipe(catchError(() => of(null))),
          trelloSummary: this.studentPortalService.getStageProgressSummary(this.currentInternship.id).pipe(catchError(() => of(null)))
        }).subscribe({
          next: ({ meetings, finalMeetings, agreement, report, evaluation, trelloSummary }) => {
            this.stats.reunions = meetings.length + finalMeetings.length;
            this.stats.documents = [agreement, report, evaluation].filter((item) => !!item).length;
            this.nextMeeting = this.pickNextMeeting([...meetings, ...finalMeetings]);
            this.trelloSummary = trelloSummary;
            this.isLoading = false;
          },
          error: () => {
            this.stats.reunions = 0;
            this.stats.documents = 0;
            this.nextMeeting = null;
            this.trelloSummary = null;
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

  formatMeetingDateTime(meeting: StudentMeeting | null): string {
    if (!meeting) return 'Aucune reunion a venir';
    const formattedDate = this.formatDate(meeting.date);
    return `${formattedDate}${meeting.heure ? ' a ' + meeting.heure : ''}`;
  }

  get trelloTaskCount(): number {
    return this.trelloSummary?.nombreTotalTaches ?? 0;
  }

  get trelloCompletedCount(): number {
    return this.trelloSummary?.nombreTachesTerminees ?? 0;
  }

  get profileCompletionMissingFields(): string[] {
    return this.profileCompletionService.getMissingFieldsForStudent(this.profile);
  }

  get showProfileCompletionReminder(): boolean {
    return !this.isLoading && this.profileCompletionMissingFields.length > 0;
  }

  // ── Display helpers (logic extracted from template) ──────────────────────

  get statStageLabel(): string {
    return this.currentInternship
      ? 'Un stage est actuellement rattaché à votre compte'
      : 'Aucun stage affecté pour le moment';
  }

  getTitreStage(internship: StudentInternship): string {
    return internship?.titre || 'Non renseigné';
  }

  getSujetStage(internship: StudentInternship): string {
    return internship?.sujet || internship?.titre || 'Non renseigné';
  }

  getEntrepriseNom(internship: StudentInternship): string {
    return internship?.company?.nom || 'Non renseignée';
  }

  getDureeStage(internship: StudentInternship): string {
    return internship?.duree ? `${internship.duree} mois` : 'Non renseignée';
  }

  getEncadrantAcademique(internship: StudentInternship): string {
    return internship?.academicSupervisor?.fullName || 'Non affecté';
  }

  getEncadrantProfessionnel(internship: StudentInternship): string {
    return internship?.professionalSupervisor?.fullName || 'Non affecté';
  }

  getProchaineMeetingLabel(): string {
    if (!this.nextMeeting) return 'Aucune réunion à venir';
    return this.nextMeeting.numReunion || 'Réunion planifiée';
  }

  getTypeMeeting(): string {
    if (!this.nextMeeting) return 'Non planifié';
    return this.nextMeeting.source === 'FINALE' ? 'Réunion finale' : 'Réunion de suivi';
  }

  getTitreOffre(offer: StudentOffer): string {
    return offer?.titre || 'Sans titre';
  }

  getEntrepriseNomOffre(offer: StudentOffer): string {
    return offer?.entrepriseNom || 'Entreprise non renseignée';
  }

  getDescriptionOffre(offer: StudentOffer): string {
    return offer?.descriptionMissions || 'Aucune description fournie.';
  }

  getProfilOffre(offer: StudentOffer): string {
    return offer?.profilRecherche || 'Profil non précisé';
  }

  private pickNextMeeting(meetings: StudentMeeting[]): StudentMeeting | null {
    const now = Date.now();
    const upcomingMeetings = meetings
      .map((meeting) => ({ meeting, timestamp: this.toTimestamp(meeting) }))
      .filter((item) => item.timestamp >= now)
      .sort((a, b) => a.timestamp - b.timestamp);

    return upcomingMeetings[0]?.meeting ?? null;
  }

  private toTimestamp(meeting: StudentMeeting): number {
    const isoValue = `${meeting.date || '1970-01-01'}T${meeting.heure || '00:00:00'}`;
    const timestamp = new Date(isoValue).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
