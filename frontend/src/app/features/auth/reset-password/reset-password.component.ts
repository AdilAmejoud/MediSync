import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'ms-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  password = '';
  confirmPassword = '';
  errorStatus = signal<string | null>(null);
  token = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
    });
  }

  handleSubmit() {
    if (!this.password || !this.confirmPassword) {
      this.errorStatus.set("Please fill in all fields.");
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorStatus.set("Passwords do not match.");
      return;
    }
    if (!this.token) {
      this.errorStatus.set("Invalid or expired reset link.");
      return;
    }

    this.errorStatus.set(null);

    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token: this.token,
      newPassword: this.password
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Password reset successfully!", "Success");
          this.router.navigate(['/auth/login']);
        } else {
          this.errorStatus.set(res.message || "Failed to reset password.");
        }
      },
      error: () => {
        this.errorStatus.set("Connection error. Please try again.");
      }
    });
  }
}
