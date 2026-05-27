import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface WorkDayShift {
  name: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'ms-secretary-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  activeTab = signal<string>('profile');

  // Profile data
  firstName = 'Sarah';
  lastName = 'Jenkins';
  email = 'sarah.j@medisync.com';
  phone = '0655112233';
  dob = '1988-11-23';
  employeeId = 'EMP-88392';
  address = '24 Rue de la Liberté, Casablanca';

  // Work Schedule
  workShifts = signal<WorkDayShift[]>([
    { name: 'Monday', enabled: true, startTime: '08:00', endTime: '17:00' },
    { name: 'Tuesday', enabled: true, startTime: '08:00', endTime: '17:00' },
    { name: 'Wednesday', enabled: true, startTime: '08:00', endTime: '17:00' },
    { name: 'Thursday', enabled: true, startTime: '08:00', endTime: '17:00' },
    { name: 'Friday', enabled: true, startTime: '08:00', endTime: '17:00' },
    { name: 'Saturday', enabled: false, startTime: '08:00', endTime: '17:00' },
    { name: 'Sunday', enabled: false, startTime: '08:00', endTime: '17:00' }
  ]);

  // Notifications
  notifs = {
    walkInAlert: true,
    emergencyAlert: true,
    invoiceOverdue: true,
    queueSummary: false,
    newApptNotif: true
  };

  // Security password
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // 2FA
  twoFAEnabled = signal<boolean>(false);
  twoFASetupMode = signal<boolean>(false);
  twoFASecret = signal<string>('');
  twoFAQrCode = signal<string>('');
  twoFAToken = '';
  loading2FA = signal<boolean>(false);

  // Preferences
  language = 'en';
  theme = 'system';

  constructor(
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private auth: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.twoFAEnabled.set(this.auth.currentUser()?.twoFactorEnabled ?? false);
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab']);
      }
    });
    this.language = localStorage.getItem('medisync_language') || 'en';
    this.theme = localStorage.getItem('medisync_theme') || 'system';
    this.refreshProfile();
    const saved = JSON.parse(localStorage.getItem('medisync_secretary_schedule') || 'null');
    if (saved) { this.workShifts.set(saved); }
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    if (prefs.secretary) { this.notifs = { ...this.notifs, ...prefs.secretary }; }
  }

  refreshProfile() {
    this.http.get<any>(`${environment.apiUrl}/auth/profile`).subscribe({
      next: (res) => {
        if (res.success && res.user) {
          const u = res.user;
          const parts = (u.name || '').split(' ');
          this.firstName = parts[0] || '';
          this.lastName = parts.slice(1).join(' ') || '';
          this.email = u.email || '';
          this.phone = u.phone || '';
          this.dob = u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '';
          this.address = u.address || '';
          this.employeeId = u.secretary?.employeeId || this.employeeId;
          this.twoFAEnabled.set(u.twoFactorEnabled ?? false);
        }
      }
    });
  }

  onSaveProfile() {
    this.http.put(`${environment.apiUrl}/auth/profile`, {
      name: `${this.firstName} ${this.lastName}`.trim(),
      phone: this.phone,
      address: this.address,
      dateOfBirth: this.dob
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Profile saved successfully!", "Success");
        } else {
          this.toastr.error(res.message || "Failed to save profile");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  addSlot(dayIndex: number) {
    this.toastr.success(`Added extra slot for ${this.workShifts()[dayIndex].name}!`);
  }

  onSaveSchedule() {
    localStorage.setItem('medisync_secretary_schedule', JSON.stringify(this.workShifts()));
    this.toastr.success("Work schedule configuration saved!", "Success");
  }

  onSaveNotifications() {
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    prefs.secretary = this.notifs;
    localStorage.setItem('medisync_notification_prefs', JSON.stringify(prefs));
    this.toastr.success("Alert preferences updated!", "Success");
  }

  onChangePassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error("Passwords do not match!");
      return;
    }
    this.http.post(`${environment.apiUrl}/auth/change-password`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Password changed successfully!", "Success");
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.toastr.error(res.message || "Failed to change password");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  setup2FA() {
    this.loading2FA.set(true);
    this.auth.setup2FA().subscribe({
      next: (res: any) => {
        if (res.success && res.secret && res.qrCode) {
          this.twoFASecret.set(res.secret);
          this.twoFAQrCode.set(res.qrCode);
          this.twoFASetupMode.set(true);
        } else {
          this.toastr.error(res.message || "Failed to setup 2FA");
        }
        this.loading2FA.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || "Server error");
        this.loading2FA.set(false);
      }
    });
  }

  verify2FA() {
    if (!this.twoFAToken || this.twoFAToken.trim().length === 0) {
      this.toastr.error("Enter the 6-digit code from Google Authenticator");
      return;
    }
    this.loading2FA.set(true);
    this.auth.verify2FA(this.twoFAToken.trim()).subscribe({
      next: (res) => {
        if (res.success) {
          this.twoFAEnabled.set(true);
          this.twoFASetupMode.set(false);
          this.twoFAToken = '';
          this.toastr.success("2FA enabled successfully!", "Success");
        } else {
          this.toastr.error(res.message || "Invalid code");
        }
        this.loading2FA.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || "Server error");
        this.loading2FA.set(false);
      }
    });
  }

  disable2FA() {
    this.loading2FA.set(true);
    this.auth.disable2FA().subscribe({
      next: (res) => {
        if (res.success) {
          this.twoFAEnabled.set(false);
          this.twoFASetupMode.set(false);
          this.twoFASecret.set('');
          this.twoFAQrCode.set('');
          this.toastr.success("2FA disabled successfully!", "Success");
        } else {
          this.toastr.error(res.message || "Failed to disable 2FA");
        }
        this.loading2FA.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || "Server error");
        this.loading2FA.set(false);
      }
    });
  }

  cancel2FASetup() {
    this.twoFASetupMode.set(false);
    this.twoFASecret.set('');
    this.twoFAQrCode.set('');
    this.twoFAToken = '';
  }

  onSavePreferences() {
    localStorage.setItem('medisync_language', this.language);
    localStorage.setItem('medisync_theme', this.theme);
    this.toastr.success("Preferences updated!", "Success");
  }
}
