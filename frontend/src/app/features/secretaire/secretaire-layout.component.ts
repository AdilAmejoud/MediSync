import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarComponent, NavItem } from '../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'ms-secretaire-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './secretaire-layout.component.html',
  styleUrl: './secretaire-layout.component.scss'
})
export class SecretaireLayoutComponent implements OnInit {
  role = 'secretaire';
  isSidebarCollapsed = false;
  pageTitle = 'Dashboard';
  currentUser: User | null = null;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'heroChartBar', route: '/secretaire/dashboard', exact: true },
    { label: 'Appointments', icon: 'heroCalendar', route: '/secretaire/appointments' },
    { label: 'Patients', icon: 'heroUsers', route: '/secretaire/patients' },
    { label: 'Patient Registration', icon: 'heroUserPlus', route: '/secretaire/registration' },
    { label: 'Billing', icon: 'heroReceiptPercent', route: '/secretaire/billing' },
    { label: 'Care Sheets', icon: 'heroDocumentCheck', route: '/secretaire/care-sheets' }
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
    
    if (lastPart && lastPart !== 'secretaire') {
      this.pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
    } else {
      this.pageTitle = 'Dashboard';
    }
  }
}
