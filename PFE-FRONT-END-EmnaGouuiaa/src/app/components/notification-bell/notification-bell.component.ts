import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { AuthentificationService, RoleUtilisateur } from '../../services/authentification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: UserNotification[] = [];
  unreadCount = 0;
  isOpen = false;
  isLoading = false;
  markingId: number | null = null;
  markingAll = false;

  private userId: number | null = null;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 30_000;
  private readonly MAX_SHOWN = 8;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthentificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const raw = this.authService.getUserId();
    this.userId = raw != null ? Number(raw) : null;
    if (!this.userId) return;

    this.loadAll();
    this.pollHandle = setInterval(() => this.refreshCount(), this.POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.userId) {
      this.loadAll();
    }
    this.cdr.markForCheck();
  }

  markAsRead(notification: UserNotification, event: MouseEvent): void {
    event.stopPropagation();
    if (notification.read || this.markingId === notification.id) return;
    this.markingId = notification.id;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: (updated) => {
        const idx = this.notifications.findIndex((n) => n.id === updated.id);
        if (idx !== -1) this.notifications[idx] = updated;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.markingId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.markingId = null;
        this.cdr.markForCheck();
      },
    });
  }

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.userId || this.markingAll || this.unreadCount === 0) return;
    this.markingAll = true;
    this.notificationService.markAllAsRead(this.userId).subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
        this.unreadCount = 0;
        this.markingAll = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.markingAll = false;
        this.cdr.markForCheck();
      },
    });
  }

  openNotification(notification: UserNotification, event: MouseEvent): void {
    event.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
    this.isOpen = false;
    const route = this.resolveRoute(notification);
    this.router.navigate([route]);
    this.cdr.markForCheck();
  }

  navigateToAll(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = false;
    this.router.navigate([this.notificationsListRoute()]);
    this.cdr.markForCheck();
  }

  formatDate(dateTime: string | null): string {
    if (!dateTime) return '';
    const d = new Date(dateTime);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return d.toLocaleDateString('fr-FR');
  }

  getTypeLabel(type: string | null): string {
    const labels: Record<string, string> = {
      AFFECTATION_ENCADRANT_ACADEMIQUE: 'Encadrant',
      MODIFICATION_ENCADRANT_ACADEMIQUE: 'Encadrant',
      AFFECTATION_ENCADRANT_PROFESSIONNEL: 'Encadrant prof.',
      MODIFICATION_ENCADRANT_PROFESSIONNEL: 'Encadrant prof.',
      VALIDATION_SUJET: 'Sujet valide',
      REFUS_SUJET: 'Sujet refuse',
      PUBLICATION_ENQUETE: 'Enquete',
      DEPOT_RAPPORT: 'Rapport',
      CHANGEMENT_STATUT_STAGE: 'Statut stage',
      REUNION_FIXEE: 'Reunion',
      ENQUETE_SATISFACTION: 'Enquete',
      STAGE_AFFECTE: 'Stage',
      DEMANDE_ENTREPRISE_VALIDEE: 'Demande',
      DEMANDE_ENTREPRISE_REFUSEE: 'Demande',
      OUVERTURE_ESPACES_FIN_STAGE: 'Stage termine',
    };
    return type ? (labels[type] ?? type) : '';
  }

  getTypeClass(type: string | null): string {
    if (!type) return 'badge-secondary';
    if (type.includes('REFUS') || type.includes('REFUSE')) return 'badge-danger';
    if (type.includes('VALID') || type.includes('AFFECTATION') || type.includes('STAGE_AFFECTE')) return 'badge-success';
    if (type.includes('ENQUETE') || type.includes('RAPPORT')) return 'badge-info';
    if (type.includes('REUNION')) return 'badge-primary';
    return 'badge-secondary';
  }

  get shownNotifications(): UserNotification[] {
    return this.notifications.slice(0, this.MAX_SHOWN);
  }

  private loadAll(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.cdr.markForCheck();
    this.notificationService.listByUser(this.userId).subscribe({
      next: (list) => {
        this.notifications = list;
        this.unreadCount = list.filter((n) => !n.read).length;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private refreshCount(): void {
    if (!this.userId) return;
    this.notificationService.countUnread(this.userId).subscribe({
      next: (count) => {
        if (count !== this.unreadCount) {
          this.unreadCount = count;
          this.loadAll();
        } else {
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  private resolveRoute(n: UserNotification): string {
    const role = this.authService.getRole();
    if (n.stageId) {
      switch (role) {
        case RoleUtilisateur.STAGIAIRE: return '/etudiant/mon-stage';
        case RoleUtilisateur.ENCADRANT_ACADEMIQUE: return '/encadrant-academique/stagiaires';
        case RoleUtilisateur.ENCADRANT_PROFESSIONNEL: return '/encadrant-professionnel/stagiaires';
        case RoleUtilisateur.RESPONSABLE_ENTREPRISE: return '/entreprise/tableau-de-bord';
        default: return '/responsable/stages';
      }
    }
    return this.notificationsListRoute();
  }

  private notificationsListRoute(): string {
    const role = this.authService.getRole();
    switch (role) {
      case RoleUtilisateur.STAGIAIRE: return '/etudiant/notifications';
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE: return '/encadrant-academique/notifications';
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL: return '/encadrant-professionnel/notifications';
      default: return '/responsable/tableau-de-bord';
    }
  }
}
