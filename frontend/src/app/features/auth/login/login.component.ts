import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'ms-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  selectedRole = signal<UserRole>('medecin');
  email = '';
  password = '';
  showPassword = signal<boolean>(false);
  rememberMe = signal<boolean>(false);
  
  errorStatus = signal<string | null>(null);
  successStatus = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  setRole(role: UserRole) {
    this.selectedRole.set(role);
  }

  togglePassword() {
    this.showPassword.update(val => !val);
  }

  toggleRememberMe() {
    this.rememberMe.update(val => !val);
  }

  handleSubmit() {
    if (!this.email) {
      this.errorStatus.set("Please enter an email address.");
      this.toastr.warning("Please enter an email address.", "Form Warning");
      return;
    }
    if (!this.password) {
      this.errorStatus.set("Please enter a password.");
      this.toastr.warning("Please enter a password.", "Form Warning");
      return;
    }

    this.errorStatus.set(null);
    this.successStatus.set("Authenticating...");

    this.auth.login(this.email, this.password, this.selectedRole()).subscribe({
      next: (res: any) => {
        if (!res.success) {
          this.errorStatus.set(res.message || "Invalid credentials. Please try again.");
          this.successStatus.set(null);
          return;
        }

        // Backend requires OTP verification before full login
        if (res.requiresOTP) {
          this.successStatus.set("Verification code sent. Redirecting...");
          this.toastr.info("Check your email for the verification code.", "OTP Sent");
          setTimeout(() => {
            this.router.navigate(['/auth/verify-otp'], {
              queryParams: { email: res.email, role: this.selectedRole() }
            });
          }, 800);
          return;
        }

        // Backend requires 2FA TOTP verification
        if (res.requires2FA) {
          this.successStatus.set("2FA verification required. Redirecting...");
          setTimeout(() => {
            this.router.navigate(['/auth/verify-otp'], {
              queryParams: { userId: res.userId, role: this.selectedRole(), type: '2fa' }
            });
          }, 800);
          return;
        }

        // Direct login with token (fallback if OTP is disabled)
        if (res.token) {
          this.successStatus.set("Successful login! Redirecting to dashboard...");
          this.toastr.success("Welcome back!", "Login Success");
          setTimeout(() => {
            this.auth.navigateToDashboard(this.selectedRole());
          }, 1000);
        }
      },
      error: (err) => {
        this.errorStatus.set(err.error?.message || "Connection error. Please check the server is running.");
        this.successStatus.set(null);
      }
    });
  }
}
