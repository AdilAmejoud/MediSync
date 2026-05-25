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

interface AvailabilityDay {
  name: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface ActiveSession {
  device: string;
  location: string;
  lastActive: string;
}

@Component({
  selector: 'ms-doctor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  activeTab = signal<string>('profile');

  // Profile data
  firstName = 'Mick';
  lastName = 'Thompson';
  email = 'mick.thompson@medisync.com';
  phone = '0677112233';
  dob = '1979-05-18';
  specialty = 'General Cardiology';
  address = 'Clinique Val D\'Anfa, Casablanca';

  specialtiesList = ['General Cardiology', 'Pediatrics', 'Dermatology', 'Orthopedics', 'Neurology'];

  // Availability data
  availabilityDays = signal<AvailabilityDay[]>([
    { name: 'Monday', enabled: true, startTime: '09:00', endTime: '18:00' },
    { name: 'Tuesday', enabled: true, startTime: '09:00', endTime: '18:00' },
    { name: 'Wednesday', enabled: true, startTime: '09:00', endTime: '18:00' },
    { name: 'Thursday', enabled: true, startTime: '09:00', endTime: '18:00' },
    { name: 'Friday', enabled: true, startTime: '09:00', endTime: '18:00' },
    { name: 'Saturday', enabled: true, startTime: '09:00', endTime: '13:00' },
    { name: 'Sunday', enabled: false, startTime: '09:00', endTime: '18:00' }
  ]);
  slotDuration = 30; // min
  breakDuration = 10; // min

  // Notifications
  notifs = {
    newBooking: true,
    reminder24h: true,
    reminder1h: true,
    cancelled: true,
    newPatient: true,
    dailySummary: false
  };

  // Security
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  sessions = signal<ActiveSession[]>([
    { device: 'macOS Chrome 124.0', location: 'Casablanca, Morocco', lastActive: 'Active now' },
    { device: 'iPhone 15 Safari 17.2', location: 'Rabat, Morocco', lastActive: '2 hours ago' }
  ]);

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
  calendarView = 'week';

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
    this.calendarView = localStorage.getItem('medisync_calendar_view') || 'week';
    this.refreshProfile();
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    if (prefs.doctor) {
      this.notifs = { ...this.notifs, ...prefs.doctor };
    }
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
          this.specialty = u.doctor?.specialty || this.specialty;
          this.twoFAEnabled.set(u.twoFactorEnabled ?? false);
          if (u.doctor) {
            const d = u.doctor;
            this.slotDuration = d.slotDuration ?? 30;
            const dayMap: Record<string, AvailabilityDay> = {};
            for (const day of this.availabilityDays()) {
              dayMap[day.name] = day;
            }
            if (d.availableDays?.length) {
              const updated = d.availableDays.map((name: string) => ({
                name,
                enabled: true,
                startTime: d.startTime || '09:00',
                endTime: d.endTime || '18:00',
              }));
              for (const day of this.availabilityDays()) {
                if (!d.availableDays.includes(day.name)) {
                  updated.push({ ...day, enabled: false });
                }
              }
              this.availabilityDays.set(updated);
            }
          }
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
    this.toastr.success(`Added extra availability slot for ${this.availabilityDays()[dayIndex].name}!`);
  }

  getPasswordStrength(): number {
    if (!this.newPassword) return 0;
    let score = 0;
    if (this.newPassword.length >= 6) score++;
    if (this.newPassword.length >= 10) score++;
    if (/[A-Z]/.test(this.newPassword)) score++;
    if (/[0-9]/.test(this.newPassword)) score++;
    return score; // Max 4
  }

  revokeSession(idx: number) {
    const s = this.sessions()[idx];
    this.sessions.update(list => list.filter((_, i) => i !== idx));
    this.toastr.info(`Revoked session for ${s.device}.`);
  }

  onSaveAvailability() {
    const docId = this.auth.currentUser()?.id;
    if (!docId) {
      this.toastr.error("User not found");
      return;
    }
    const enabledDays = this.availabilityDays()
      .filter(d => d.enabled)
      .map(d => d.name);
    const firstEnabled = this.availabilityDays().find(d => d.enabled);
    this.http.post(`${environment.apiUrl}/doctor/update-profile`, {
      docId,
      availableDays: enabledDays,
      startTime: firstEnabled?.startTime || '09:00',
      endTime: firstEnabled?.endTime || '18:00',
      slotDuration: this.slotDuration,
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Weekly availability saved!", "Success");
        } else {
          this.toastr.error(res.message || "Failed to save availability");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  onSaveNotifications() {
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    prefs.doctor = this.notifs;
    localStorage.setItem('medisync_notification_prefs', JSON.stringify(prefs));
    this.toastr.success("Notifications settings updated!", "Success");
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
    localStorage.setItem('medisync_calendar_view', this.calendarView);
    this.toastr.success("Preferences updated!", "Success");
  }
}
