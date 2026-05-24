import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ConnectedDevice {
  name: string;
  icon: string;
  lastActive: string;
}

@Component({
  selector: 'ms-patient-settings',
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
  bloodType = 'O+';
  address = '';

  // Avatar
  profileImageUrl = signal<string>('');
  @ViewChild('avatarFileInput') avatarFileInput!: ElementRef<HTMLInputElement>;
  private pendingImageBase64 = '';

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  // Medical Info
  allergies = signal<string[]>([]);
  newAllergy = '';
  chronicConditions = signal<string[]>([]);
  newChronic = '';
  emergencyName = '';
  emergencyPhone = '';
  height = 170;
  weight = 70;

  // Notifications
  notifs: any = {};

  // Connected Devices
  devices = signal<ConnectedDevice[]>([]);

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
  accessibility = false;

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
    const med = JSON.parse(localStorage.getItem('medisync_medical_info') || '{}');
    if (med.allergies) { this.allergies.set(med.allergies); }
    if (med.conditions) { this.chronicConditions.set(med.conditions); }
    if (med.emergencyName) { this.emergencyName = med.emergencyName; }
    if (med.emergencyPhone) { this.emergencyPhone = med.emergencyPhone; }
    if (med.height) { this.height = med.height; }
    if (med.weight) { this.weight = med.weight; }
    if (med.bloodType) { this.bloodType = med.bloodType; }
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    if (prefs.patient) { this.notifs = { ...this.notifs, ...prefs.patient }; }
  }

  refreshProfile() {
    this.http.get<any>(`${environment.apiUrl}/auth/profile`).subscribe({
      next: (res) => {
        // Backend returns { success, user } — support both spellings defensively
        if (res.success && (res.user || res.userData)) {
          const u = res.user || res.userData;
          const parts = (u.name || '').split(' ');
          this.firstName = parts[0] || '';
          this.lastName = parts.slice(1).join(' ') || '';
          this.email = u.email || '';
          this.phone = u.phone || '';
          this.dob = u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '';
          this.address = u.address || '';
          this.bloodType = u.patient?.bloodType || 'O+';
          this.allergies.set(u.patient?.allergies || []);
          this.chronicConditions.set(u.patient?.conditions || []);
          this.emergencyName = u.patient?.emergencyContactName || '';
          this.emergencyPhone = u.patient?.emergencyContactPhone || '';
          this.height = u.patient?.height || 170;
          this.weight = u.patient?.weight || 70;
          this.twoFAEnabled.set(u.twoFactorEnabled ?? false);
          if (u.image) {
            this.profileImageUrl.set(u.image);
          }
        }
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  /** Open the hidden file picker */
  triggerAvatarPicker() {
    this.avatarFileInput?.nativeElement.click();
  }

  /** Read selected file as base64 and preview immediately */
  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.toastr.error('Only JPG and PNG files are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.profileImageUrl.set(base64);
      this.pendingImageBase64 = base64;
    };
    reader.readAsDataURL(file);
  }

  /** Compute initials the same way the topbar does */
  getInitials(): string {
    const name = `${this.firstName} ${this.lastName}`.trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }

  /** Role colour matching the topbar */
  get avatarColor(): string {
    return '#059669'; // patient green — same as topbar
  }

  addAllergy() {
    if (this.newAllergy.trim()) {
      this.allergies.update(list => [...list, this.newAllergy.trim()]);
      this.newAllergy = '';
      this.toastr.success("Allergy tag added!");
    }
  }

  removeAllergy(idx: number) {
    this.allergies.update(list => list.filter((_, i) => i !== idx));
    this.toastr.info("Allergy tag removed.");
  }

  addChronic() {
    if (this.newChronic.trim()) {
      this.chronicConditions.update(list => [...list, this.newChronic.trim()]);
      this.newChronic = '';
      this.toastr.success("Chronic condition tag added!");
    }
  }

  removeChronic(idx: number) {
    this.chronicConditions.update(list => list.filter((_, i) => i !== idx));
    this.toastr.info("Chronic condition tag removed.");
  }

  revokeDevice(idx: number) {
    const d = this.devices()[idx];
    this.devices.update(list => list.filter((_, i) => i !== idx));
    this.toastr.info(`Revoked access for ${d.name}.`);
  }

  onSaveProfile() {
    const payload: any = {
      name: `${this.firstName} ${this.lastName}`.trim(),
      phone: this.phone,
      address: this.address,
      dateOfBirth: this.dob
    };
    // Include the new avatar only if the user selected one
    if (this.pendingImageBase64) {
      payload.image = this.pendingImageBase64;
    }
    this.http.put(`${environment.apiUrl}/auth/profile`, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.pendingImageBase64 = ''; // clear pending after successful save
          this.toastr.success("Profile saved successfully!", "Success");
        } else {
          this.toastr.error(res.message || "Failed to save profile");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  onSaveMedical() {
    const med = JSON.parse(localStorage.getItem('medisync_medical_info') || '{}');
    med.allergies = this.allergies();
    med.conditions = this.chronicConditions();
    med.emergencyName = this.emergencyName;
    med.emergencyPhone = this.emergencyPhone;
    med.height = this.height;
    med.weight = this.weight;
    med.bloodType = this.bloodType;
    localStorage.setItem('medisync_medical_info', JSON.stringify(med));
    this.toastr.success("Medical information saved!", "Success");
  }

  onSaveNotifications() {
    const prefs = JSON.parse(localStorage.getItem('medisync_notification_prefs') || '{}');
    prefs.patient = this.notifs;
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
    this.toastr.success("Preferences updated!", "Success");
  }
}
