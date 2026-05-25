import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarComponent, NavItem } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'ms-medecin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './medecin-layout.component.html',
  styleUrl: './medecin-layout.component.scss'
})
export class MedecinLayoutComponent implements OnInit {
  role = 'medecin';
  isSidebarCollapsed = false;
  pageTitle = 'Dashboard';
  currentUser: User | null = null;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'heroChartBar', route: '/medecin/dashboard', exact: true },
    { label: 'Appointments', icon: 'heroCalendar', route: '/medecin/appointments' },
    { label: 'Patient Files', icon: 'heroFolderOpen', route: '/medecin/patient-files' },
    { label: 'My Schedule', icon: 'heroCalendarDays', route: '/medecin/schedule' },
    { label: 'My Availability', icon: 'heroClock', route: '/medecin/availability' }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser();
    this.updatePageTitle(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updatePageTitle(event.url);
    });
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private updatePageTitle(url: string) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    if (lastPart && lastPart !== 'medecin') {
      this.pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
    } else {
      this.pageTitle = 'Dashboard';
    }
  }
}
