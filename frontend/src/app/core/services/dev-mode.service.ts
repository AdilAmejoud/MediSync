import { Injectable, signal } from '@angular/core';
import { UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class DevModeService {
  private active = signal(true);
  private mockRole = signal<UserRole>('admin');

  isActive() {
    return this.active();
  }

  getMockRole() {
    return this.mockRole();
  }

  setMockRole(role: UserRole) {
    this.mockRole.set(role);
  }

  toggle() {
    this.active.update(v => !v);
  }
}
