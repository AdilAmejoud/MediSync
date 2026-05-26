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

interface AuditLog {
  timestamp: string;
  action: string;
  ip: string;
  status: 'Success' | 'Failed' | 'Warning';
}

interface FeeRow {
  name: string;
  duration: number;
  fee: number;
}

@Component({
  selector: 'ms-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  activeTab = signal<string>('profile');

  // Profile data
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  dob = '';
  department = 'Administration';
  address = '';

  // Clinic Info data
  clinicName = '';
  clinicAddress = '';
  clinicPhone = '';
  clinicEmail = '';
  specialties = signal<string[]>([]);
  newSpecialty = '';

  // 2FA
  twoFAEnabled = signal<boolean>(false);
  twoFASetupMode = signal<boolean>(false);
  twoFASecret = signal<string>('');
  twoFAQrCode = signal<string>('');
  twoFAToken = '';
  loading2FA = signal<boolean>(false);

  // Password
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  auditLogs = signal<AuditLog[]>([]);
  loadingAudit = signal(false);

  // Notifications
  notifs: any = {};

  // Billing Config
  currency = 'MAD';
  invoicePrefix = 'FAC-';
  taxRate = 0;
  slotFees = signal<FeeRow[]>([]);

  // Preferences
  language = '';
  theme = '';
  calendarView = '';

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
    this.refreshProfile();
    this.loadAuditLogs();
    this.loadConfig();
  }

  private loadConfig() {
    this.language = localStorage.getItem('medisync_language') || 'en';
    this.theme = localStorage.getItem('medisync_theme') || 'system';
    this.calendarView = localStorage.getItem('medisync_calendar_view') || 'week';
    this.http.get<any>(`${environment.apiUrl}/clinic-config`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const c = res.data;
          this.clinicName = c.clinicName || '';
          this.clinicAddress = c.clinicAddress || '';
          this.clinicPhone = c.clinicPhone || '';
          this.clinicEmail = c.clinicEmail || '';
          this.specialties.set(c.specialties || []);
          this.notifs = c.notifications || {};
          this.currency = c.currency || 'MAD';
          this.invoicePrefix = c.invoicePrefix || 'FAC-';
          this.taxRate = c.taxRate ?? 15;
          this.slotFees.set(c.slotFees || []);
          this.language = c.language || 'en';
          this.theme = c.theme || 'system';
          this.calendarView = c.calendarView || 'week';
        }
      }
    });
  }

  private loadAuditLogs() {
    this.loadingAudit.set(true);
    this.http.get<any>(`${environment.apiUrl}/audit-logs`).subscribe({
      next: (res) => {
        if (res.success) {
          this.auditLogs.set(res.data.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false
            }).replace(', ', ', ')
          })));
        }
        this.loadingAudit.set(false);
      },
      error: () => this.loadingAudit.set(false)
    });
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

  addSpecialty() {
    if (this.newSpecialty.trim()) {
      this.specialties.update(list => [...list, this.newSpecialty.trim()]);
      this.newSpecialty = '';
      this.toastr.success("Specialty tag added!");
    }
  }

  removeSpecialty(index: number) {
    this.specialties.update(list => list.filter((_, i) => i !== index));
    this.toastr.info("Specialty tag removed.");
  }

  onSave() {
    const body: any = {};
    switch (this.activeTab()) {
      case 'clinic':
        body.clinicName = this.clinicName;
        body.clinicAddress = this.clinicAddress;
        body.clinicPhone = this.clinicPhone;
        body.clinicEmail = this.clinicEmail;
        body.specialties = this.specialties();
        break;
      case 'notifications':
        body.notifications = this.notifs;
        break;
      case 'billing':
        body.currency = this.currency;
        body.invoicePrefix = this.invoicePrefix;
        body.taxRate = this.taxRate;
        body.slotFees = this.slotFees();
        break;
      case 'preferences':
        body.language = this.language;
        body.theme = this.theme;
        body.calendarView = this.calendarView;
        break;
      default:
        this.toastr.error("Unknown tab");
        return;
    }
    if (this.activeTab() === 'preferences') {
      localStorage.setItem('medisync_language', this.language);
      localStorage.setItem('medisync_theme', this.theme);
      localStorage.setItem('medisync_calendar_view', this.calendarView);
    }
    this.http.put<any>(`${environment.apiUrl}/clinic-config`, body).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success("Settings saved successfully!", "Success");
        } else {
          this.toastr.error(res.message || "Failed to save settings");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  onSavePassword() {
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
}
