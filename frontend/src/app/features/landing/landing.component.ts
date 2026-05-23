import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'ms-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  isAuthenticated = false;
  userRole = '';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.isAuthenticated = true;
      this.userRole = user.role;
    } else {
      const raw = localStorage.getItem('ms_user');
      const token = localStorage.getItem('ms_token');
      if (token && raw) {
        try {
          const parsed = JSON.parse(raw);
          this.isAuthenticated = true;
          this.userRole = parsed.role;
        } catch (e) {
          console.error("Landing: error parsing user from localStorage", e);
        }
      }
    }
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Admin',
      medecin: 'Doctor',
      patient: 'Patient',
      secretaire: 'Secretary'
    };
    return map[role] || role;
  }

  goToDashboard() {
    const routes: Record<string, string> = {
      admin: '/admin/dashboard',
      medecin: '/medecin/dashboard',
      patient: '/patient/dashboard',
      secretaire: '/secretaire/dashboard'
    };
    this.router.navigate([routes[this.userRole] || '/']);
  }

  signOutFromLanding() {
    this.auth.signOut();
    this.isAuthenticated = false;
  }

  onNavigate(route: string) {
    this.router.navigate([route]);
  }
}

