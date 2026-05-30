import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { DevModeService } from '../../core/services/dev-mode.service';
import { UserRole } from '../../core/models/user.model';

interface ScreenEntry {
  label: string;
  route: string;
  icon?: string;
}

interface ScreenCategory {
  label: string;
  icon: string;
  role: UserRole | null;
  screens: ScreenEntry[];
}

@Component({
  selector: 'ms-screen-selector',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './screen-selector.component.html',
  styleUrl: './screen-selector.component.scss'
})
export class ScreenSelectorComponent {
  expanded = signal(false);
  activeCategory = signal<string | null>(null);

  categories: ScreenCategory[] = [
    {
      label: 'Public',
      icon: 'lock_open',
      role: null,
      screens: [
        { label: 'Landing Page', route: '/' },
        { label: 'Sign In (Login)', route: '/auth/login' },
        { label: 'Create Account', route: '/auth/register' },
        { label: 'Forgot Password', route: '/auth/forgot-password' },
        { label: 'Reset Password', route: '/auth/reset-password' },
        { label: 'Verify OTP', route: '/auth/verify-otp' },
        { label: 'Email Sent', route: '/auth/email-sent' },
        { label: 'Unauthorized', route: '/unauthorized' },
      ]
    },
    {
      label: 'Administration',
      icon: 'admin_panel_settings',
      role: 'admin',
      screens: [
        { label: 'Dashboard', route: '/admin/dashboard' },
        { label: 'Doctors', route: '/admin/doctors' },
        { label: 'Patients', route: '/admin/patients' },
        { label: 'Appointments', route: '/admin/appointments' },
        { label: 'Services', route: '/admin/services' },
        { label: 'Staff', route: '/admin/staff' },
        { label: 'Transactions', route: '/admin/transactions' },
        { label: 'Billing', route: '/admin/billing' },
        { label: 'Reports', route: '/admin/reports' },
        { label: 'Settings', route: '/admin/settings' },
      ]
    },
    {
      label: 'Doctor (Médecin)',
      icon: 'local_hospital',
      role: 'medecin',
      screens: [
        { label: 'Dashboard', route: '/medecin/dashboard' },
        { label: 'Appointments', route: '/medecin/appointments' },
        { label: 'Schedule', route: '/medecin/schedule' },
        { label: 'Prescriptions', route: '/medecin/prescriptions' },
        { label: 'Patient Files', route: '/medecin/patient-files' },
        { label: 'Availability', route: '/medecin/availability' },
      ]
    },
    {
      label: 'Patient',
      icon: 'person',
      role: 'patient',
      screens: [
        { label: 'Dashboard', route: '/patient/dashboard' },
        { label: 'My Doctors', route: '/patient/doctors' },
        { label: 'My Appointments', route: '/patient/appointments' },
        { label: 'Medical Folder', route: '/patient/medical-folder' },
        { label: 'Notifications', route: '/patient/notifications' },
        { label: 'Prescriptions', route: '/patient/prescriptions' },
        { label: 'Billing', route: '/patient/billing' },
      ]
    },
    {
      label: 'Secretary (Secrétaire)',
      icon: 'badge',
      role: 'secretaire',
      screens: [
        { label: 'Dashboard', route: '/secretaire/dashboard' },
        { label: 'Appointments', route: '/secretaire/appointments' },
        { label: 'Patients', route: '/secretaire/patients' },
        { label: 'Registration', route: '/secretaire/registration' },
        { label: 'Billing', route: '/secretaire/billing' },
        { label: 'Care Sheets', route: '/secretaire/care-sheets' },
      ]
    }
  ];

  constructor(
    private router: Router,
    private devMode: DevModeService
  ) {}

  togglePanel() {
    this.expanded.update(v => !v);
  }

  navigateTo(route: string, role?: UserRole | null) {
    if (role) {
      this.devMode.setMockRole(role);
    }
    this.router.navigateByUrl(route);
  }

  toggleCategory(categoryLabel: string) {
    this.activeCategory.update(v =>
      v === categoryLabel ? null : categoryLabel
    );
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  isCategoryActive(category: ScreenCategory): boolean {
    return category.screens.some(s => this.router.url === s.route);
  }

  categoryId(category: ScreenCategory): string {
    return 'dev-cat-' + category.label.toLowerCase().replace(/[^a-z]/g, '-');
  }

  screenId(screen: ScreenEntry): string {
    return 'dev-screen-' + screen.route.replace(/[^a-z0-9]/g, '-');
  }
}
