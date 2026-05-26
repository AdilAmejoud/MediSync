import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarComponent, NavItem } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'ms-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  role = 'admin';
  isSidebarCollapsed = false;
  pageTitle = 'Dashboard';
  currentUser: User | null = null;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'heroChartBar', route: '/admin/dashboard', exact: true },
    { label: 'Doctors', icon: 'heroUserGroup', route: '/admin/doctors' },
    { label: 'Patients', icon: 'heroUsers', route: '/admin/patients' },
    { label: 'Appointments', icon: 'heroCalendar', route: '/admin/appointments' },
    { label: 'Services', icon: 'heroBriefcase', route: '/admin/services' },
    { label: 'Staff', icon: 'heroIdentification', route: '/admin/staff' },
    { label: 'Transactions', icon: 'heroBanknotes', route: '/admin/transactions' },
    { label: 'Billing', icon: 'heroReceiptPercent', route: '/admin/billing' },
    { label: 'Reports', icon: 'heroChartPie', route: '/admin/reports' },
    { label: 'Notifications', icon: 'heroBell', route: '/admin/notifications' }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser();
    this.updatePageTitle(this.router.url);

    // Watch navigation changes to dynamically update topbar title
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
    
    // Capitalize and format
    if (lastPart && lastPart !== 'admin') {
      this.pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    } else {
      this.pageTitle = 'Dashboard';
    }
  }
}
