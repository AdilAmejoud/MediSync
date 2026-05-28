import { Component, Input, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'ms-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, ClickOutsideDirective],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() user: User | null = null;

  showNotifications = signal<boolean>(false);
  showProfileMenu = signal<boolean>(false);
  isDark = signal<boolean>(false);
  private pollInterval: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    public themeService: ThemeService,
    public notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.isDark.set(this.themeService.isDark());
    this.notificationService.loadNotifications();

    // Poll notifications every 10 seconds for real-time count badges
    this.pollInterval = setInterval(() => {
      this.notificationService.loadNotifications();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  getAvatarColor(role: string): string {
    const map: Record<string, string> = {
      admin: '#4F46E5',
      medecin: '#0891B2',
      patient: '#059669',
      secretaire: '#7C3AED'
    };
    return map[role] || '#4F46E5';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Admin',
      medecin: 'Doctor',
      patient: 'Patient',
      secretaire: 'Secretary'
    };
    return map[role] || role;
  }

  getInitials(): string {
    if (!this.user || !this.user.name) return 'U';
    const parts = this.user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.user.name[0].toUpperCase();
  }

  toggleDarkMode() {
    this.themeService.toggle();
    this.isDark.set(this.themeService.isDark());
  }

  toggleNotifications() {
    this.showNotifications.update(val => !val);
  }

  closeNotifications() {
    this.showNotifications.set(false);
  }

  toggleProfileMenu() {
    this.showProfileMenu.update(val => !val);
  }

  closeProfileMenu() {
    this.showProfileMenu.set(false);
  }

  navigateAndClose(route: string) {
    this.router.navigate([route]);
    this.closeProfileMenu();
  }

  onLogout() {
    this.closeProfileMenu();
    this.auth.logout();
  }

  get hasUnread(): boolean {
    return this.notificationService.notifications().some(n => n.unread);
  }

  get unreadCount(): number {
    return this.notificationService.notifications().filter(n => n.unread).length;
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    this.closeProfileMenu();
    this.closeNotifications();
  }
}
