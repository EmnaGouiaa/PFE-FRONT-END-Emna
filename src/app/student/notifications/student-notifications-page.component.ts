import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthentificationService } from '../../services/authentification.service';
import { NotificationService, UserNotification } from '../../services/notification.service';

@Component({
  selector: 'app-student-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-notifications-page.component.html',
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentNotificationsPageComponent implements OnInit {
  notifications: UserNotification[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  currentUserId: number | null = null;
  markingId: number | null = null;
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthentificationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    if (!this.currentUserId) {
      this.errorMessage = 'Impossible de déterminer le stagiaire connecté.';
      this.isLoading = false;
      return;
    }

    this.loadNotifications();
    this.refreshHandle = setInterval(() => this.loadNotifications(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  loadNotifications(): void {
    if (!this.currentUserId) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationService.listByUser(this.currentUserId).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les notifications.';
        this.isLoading = false;
      }
    });
  }

  markAsRead(notification: UserNotification): void {
    if (!this.currentUserId || notification.read) return;

    this.markingId = notification.id;
    this.successMessage = '';
    this.errorMessage = '';

    this.notificationService.markAsRead(notification.id, this.currentUserId).subscribe({
      next: (updated) => {
        this.notifications = this.notifications.map((item) => item.id === updated.id ? updated : item);
        this.successMessage = 'Notification marquée comme lue.';
        this.markingId = null;
      },
      error: () => {
        this.errorMessage = 'Impossible de marquer cette notification comme lue.';
        this.markingId = null;
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return 'Date inconnue';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  get unreadCount(): number {
    return this.notifications.filter((notification) => !notification.read).length;
  }

  trackByNotificationId(_: number, notification: UserNotification): number {
    return notification.id;
  }

  getNotificationBadgeLabel(notification: UserNotification): string {
    const type = String(notification.type ?? '').toUpperCase();
    if (type === 'DEMANDE_ENTREPRISE_REFUSEE') return 'Refus';
    if (type === 'DEMANDE_ENTREPRISE_VALIDEE') return 'Approbation';
    return notification.read ? 'Lue' : 'Non lue';
  }

  getNotificationBadgeClass(notification: UserNotification): string {
    const type = String(notification.type ?? '').toUpperCase();
    if (type === 'DEMANDE_ENTREPRISE_REFUSEE') return 'status-REJETEE';
    if (type === 'DEMANDE_ENTREPRISE_VALIDEE') return 'status-VALIDEE';
    return notification.read ? 'status-VALIDEE' : 'status-EN_ATTENTE';
  }
}
