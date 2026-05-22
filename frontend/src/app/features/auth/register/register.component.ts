import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'ms-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, DatePickerComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  phone = '';
  gender = 'male';
  dob = '';

  isLoading = signal<boolean>(false);
  errorStatus = signal<string | null>(null);
  successStatus = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  handleSubmit() {
    if (!this.name || !this.email || !this.password) {
      this.errorStatus.set("Please fill in all required fields.");
      this.toastr.warning("Please fill in all required fields.", "Form Warning");
      return;
    }

    this.errorStatus.set(null);
    this.isLoading.set(true);

    this.auth.register(this.name, this.email, this.password).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (!res.success) {
          this.errorStatus.set(res.message || "Registration failed. Please try again.");
          this.toastr.error(res.message || "Registration failed.", "Error");
          return;
        }
        // Backend returned a JWT — user is now logged in, go to dashboard
        this.successStatus.set("Account created! Redirecting to your dashboard...");
        this.toastr.success("Welcome to MediSync!", "Account Created");
        setTimeout(() => {
          this.auth.navigateToDashboard('patient');
        }, 1000);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || "Connection error. Please check the server is running.";
        this.errorStatus.set(msg);
        this.toastr.error(msg, "Registration Error");
      }
    });
  }
}
