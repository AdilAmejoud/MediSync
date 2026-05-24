import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastrService } from 'ngx-toastr';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'ms-patient-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, BadgeComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  showGreenSuccess = false;
  activeCategory: 'All' | 'Appointments' | 'Prescriptions' | 'Documents' | 'Billing' = 'All';
  categories: ('All' | 'Appointments' | 'Prescriptions' | 'Documents' | 'Billing')[] = ['All', 'Appointments', 'Prescriptions', 'Documents', 'Billing'];
  
  constructor(
    public notificationService: NotificationService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.notificationService.loadNotifications();
  }

  setCategory(category: 'All' | 'Appointments' | 'Prescriptions' | 'Documents' | 'Billing') {
    this.activeCategory = category;
  }

  matchesCategory(notif: any, category: string): boolean {
    if (category === 'All') return true;
    
    const title = (notif.title || '').toLowerCase();
    const desc = (notif.description || '').toLowerCase();
    const fullText = `${title} ${desc}`;
    
    switch (category) {
      case 'Appointments':
        return /appointment|appt|booking|booked|scheduled|rescheduled|cancelled|approved|confirmed|admission|check-in|consultation|emergency/i.test(fullText);
      case 'Prescriptions':
        return /prescription|medication|drug|ordonnance|treatment|pharmacy|pill/i.test(fullText);
      case 'Documents':
        return /document|file|folder|lab|result|pdf|medical record|care sheet/i.test(fullText);
      case 'Billing':
        return /billing|invoice|payment|paid|transaction|amount|fee|mad|receipt/i.test(fullText);
      default:
        return false;
    }
  }

  get notifications() {
    const list = this.notificationService.notifications();
    if (this.activeCategory === 'All') {
      return list;
    }
    return list.filter(n => this.matchesCategory(n, this.activeCategory));
  }

  get unreadCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }

  markAllAsRead() {
    this.showGreenSuccess = true;
    this.notificationService.markAllAsRead();
    this.toastr.success("All notifications marked as read.", "Success");
    setTimeout(() => {
      this.showGreenSuccess = false;
    }, 3000);
  }

  clearAll() {
    if (confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      this.notificationService.clearAll();
      this.toastr.success("All notifications cleared.", "Success");
    }
  }

  markAsRead(id: string) {
    this.notificationService.toggleRead(id);
    this.toastr.success("Notification marked as read.", "Success");
  }

  deleteNotification(id: string) {
    this.notificationService.deleteNotification(id);
    this.toastr.success("Notification deleted.", "Success");
  }
}
