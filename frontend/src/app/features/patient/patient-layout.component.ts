import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarComponent, NavItem } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'ms-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './patient-layout.component.html',
  styleUrl: './patient-layout.component.scss'
})
export class PatientLayoutComponent implements OnInit {
  role = 'patient';
  isSidebarCollapsed = false;
  pageTitle = 'Dashboard';
  currentUser: User | null = null;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'heroChartBar', route: '/patient/dashboard', exact: true },
    { label: 'My Doctors', icon: 'heroUserCircle', route: '/patient/doctors' },
    { label: 'My Appointments', icon: 'heroCalendarDays', route: '/patient/appointments' },
    { label: 'My Medical Folder', icon: 'heroDocumentText', route: '/patient/medical-folder' },
    { label: 'Notifications', icon: 'heroBell', route: '/patient/notifications' },
    { label: 'Prescriptions', icon: 'heroClipboardDocument', route: '/patient/prescriptions' },
    { label: 'Payments & Invoices', icon: 'heroCreditCard', route: '/patient/billing' }
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
    
    if (lastPart && lastPart !== 'patient') {
      this.pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
    } else {
      this.pageTitle = 'Dashboard';
    }
  }
}
