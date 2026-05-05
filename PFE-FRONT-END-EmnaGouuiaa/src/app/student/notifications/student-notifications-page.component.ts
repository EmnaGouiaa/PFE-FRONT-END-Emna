import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(
    private authService: AuthentificationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    if (!this.currentUserId) {
      this.errorMessage = 'Impossible de determiner le stagiaire connecte.';
      this.isLoading = false;
      return;
    }

    this.loadNotifications();
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
        this.successMessage = 'Notification marquee comme lue.';
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
}
