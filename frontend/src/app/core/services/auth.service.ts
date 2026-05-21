import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, UserRole } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ms_token';
  private readonly USER_KEY  = 'ms_user';
  // Temporarily store email & role during OTP verification flow
  private readonly PENDING_EMAIL_KEY = 'ms_pending_email';
  private readonly PENDING_ROLE_KEY  = 'ms_pending_role';

  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string, role: UserRole) {
    // Map roles to backend endpoints
    // Note: 'secretaire' role users are stored as 'secretaire' in the DB
    // but they authenticate via /api/user/login (same user table)
    const endpoint = role === 'admin'      ? '/admin/login'
                   : role === 'medecin'    ? '/doctor/login'
                   :                         '/user/login';  // patient & secretaire both use /user/login

    return this.http.post<AuthResponse>(
      `${environment.apiUrl}${endpoint}`, { email, password }
    ).pipe(tap(res => {
      if (res.success) {
        if (res.token) {
          // Direct login (no OTP) — store token immediately
          localStorage.setItem(this.TOKEN_KEY, res.token);
          if (res.user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this.currentUser.set(res.user);
          }
        } else if (res['requiresOTP'] || res['requires2FA']) {
          // Store pending auth info so OTP page knows what to do after verification
          localStorage.setItem(this.PENDING_EMAIL_KEY, email);
          localStorage.setItem(this.PENDING_ROLE_KEY, role);
          // Navigate to OTP verification page
          this.router.navigate(['/auth/verify-otp']);
        }
      }
    }));
  }

  register(name: string, email: string, password: string) {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/user/register`, { name, email, password }
    ).pipe(tap(res => {
      if (res.success && res['token']) {
        // Registration returns a JWT directly — log user in immediately
        localStorage.setItem(this.TOKEN_KEY, res['token']);
      }
    }));
  }

  /**
   * Called after OTP or 2FA verification succeeds — store the JWT and user info
   */
  completeLogin(token: string, role: UserRole, user?: User) {
    localStorage.setItem(this.TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUser.set(user);
    }
    localStorage.removeItem(this.PENDING_EMAIL_KEY);
    localStorage.removeItem(this.PENDING_ROLE_KEY);
    this.navigateToDashboard(role);
  }

  getPendingEmail(): string | null {
    return localStorage.getItem(this.PENDING_EMAIL_KEY);
  }

  getPendingRole(): UserRole | null {
    return localStorage.getItem(this.PENDING_ROLE_KEY) as UserRole | null;
  }

  navigateToDashboard(role: UserRole) {
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'medecin') {
      this.router.navigate(['/medecin/dashboard']);
    } else if (role === 'patient') {
      this.router.navigate(['/patient/dashboard']);
    } else if (role === 'secretaire') {
      this.router.navigate(['/secretaire/dashboard']);
    }
  }

  logout() {
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  signOut() {
    this.clearAuth();
    this.router.navigate(['/']);
  }

  private clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.PENDING_EMAIL_KEY);
    localStorage.removeItem(this.PENDING_ROLE_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getRole(): UserRole | null {
    return this.currentUser()?.role ?? null;
  }

  setup2FA(): Observable<ApiResponse<{ secret: string; qrCode: string }>> {
    return this.http.post<ApiResponse<{ secret: string; qrCode: string }>>(
      `${environment.apiUrl}/auth/2fa/setup`, {}
    );
  }

  verify2FA(token: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${environment.apiUrl}/auth/2fa/verify-setup`, { token }
    );
  }

  disable2FA(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${environment.apiUrl}/auth/2fa/disable`, {}
    );
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
