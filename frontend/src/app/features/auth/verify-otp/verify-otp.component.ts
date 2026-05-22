import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'ms-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.scss'
})
export class VerifyOtpComponent {
  code = '';
  errorStatus = signal<string | null>(null);
  email = '';
  role: any = null;
  userId = '';
  otpType = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private toastr: ToastrService
  ) {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.role = params['role'] || null;
      this.userId = params['userId'] || '';
      this.otpType = params['type'] || 'otp';
    });
  }

  handleSubmit() {
    if (!this.code) {
      this.errorStatus.set("Please enter the verification code.");
      return;
    }

    if (this.otpType === '2fa') {
      // 2FA verification
      this.http.post(`${environment.apiUrl}/auth/verify-2fa`, { userId: this.userId, code: this.code }).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.auth.completeLogin(res.token, this.role, res.user);
            this.toastr.success("2FA verified successfully!", "Success");
          } else {
            this.errorStatus.set(res.message || "Invalid 2FA code.");
          }
        },
        error: () => {
          this.errorStatus.set("Connection error. Please check the server.");
        }
      });
    } else {
      // Email OTP verification
      this.http.post(`${environment.apiUrl}/auth/verify-otp`, { email: this.email, otp: this.code }).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.auth.completeLogin(res.token, this.role, res.user);
            this.toastr.success("OTP verified successfully!", "Success");
          } else {
            this.errorStatus.set(res.message || "Invalid OTP code.");
          }
        },
        error: () => {
          this.errorStatus.set("Connection error. Please check the server.");
        }
      });
    }
  }
}
