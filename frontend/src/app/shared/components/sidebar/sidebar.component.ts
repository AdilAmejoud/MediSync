import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { AuthService } from '../../../core/services/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'ms-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() role: string = '';
  @Input() navItems: NavItem[] = [];
  @Input() collapsed: boolean = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  constructor(private auth: AuthService) {}

  onLogout() {
    this.auth.logout();
  }
}
