import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'ms-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  email = '';
  errorStatus = signal<string | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  handleSubmit() {
    if (!this.email) {
      this.errorStatus.set("Please enter your email address.");
      return;
    }

    this.errorStatus.set(null);

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Recovery instructions sent to " + this.email, "Email Sent");
          this.router.navigate(['/auth/email-sent']);
        } else {
          this.errorStatus.set(res.message || "Failed to send recovery email.");
        }
      },
      error: () => {
        this.errorStatus.set("Connection error. Please try again.");
      }
    });
  }
}
