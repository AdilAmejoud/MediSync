import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

export interface AlertNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type?: 'success' | 'warning' | 'info' | 'error';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<AlertNotification[]>([]);

  constructor(private api: ApiService) {}

  private timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  loadNotifications() {
    this.api.get<any>('/notifications').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const list = res.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            description: n.message,
            unread: !n.isRead,
            type: n.type || 'info',
            time: this.timeAgo(n.createdAt)
          }));
          this.notifications.set(list);
        }
      }
    });
  }

  getNotifications(): Observable<ApiResponse<AlertNotification[]>> {
    return this.api.get<ApiResponse<AlertNotification[]>>('/notifications');
  }

  toggleRead(id: string) {
    this.api.patch<any>(`/notifications/${id}/read`, {}).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications.update(list => 
            list.map(n => n.id === id ? { ...n, unread: false } : n)
          );
        }
      }
    });
  }

  markAllAsRead() {
    this.api.put<any>('/notifications/mark-read', {}).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications.update(list => 
            list.map(n => ({ ...n, unread: false }))
          );
        }
      }
    });
  }

  clearAll() {
    this.api.delete<any>('/notifications').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications.set([]);
        }
      }
    });
  }

  deleteNotification(id: string) {
    this.api.delete<any>(`/notifications/${id}`).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications.update(list => list.filter(n => n.id !== id));
        }
      }
    });
  }
}
