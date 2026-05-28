import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../avatar/avatar.component';
import { BadgeComponent } from '../badge/badge.component';
import { CurrencyMadPipe } from '../../pipes/currency-mad.pipe';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'avatar' | 'actions' | 'currency';
  avatarSrcKey?: string; // key for avatar source if type is 'avatar'
  subtitleKey?: string;  // secondary key under title if type is 'avatar'
}

@Component({
  selector: 'ms-data-table',
  standalone: true,
  imports: [CommonModule, NgIconComponent, AvatarComponent, BadgeComponent, CurrencyMadPipe],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading: boolean = false;

  @Output() rowClick = new EventEmitter<any>();
  @Output() actionClick = new EventEmitter<{ action: string, row: any }>();

  getBadgeType(val: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const v = val ? val.trim().toLowerCase() : '';
    if (v === 'active' || v === 'paid' || v === 'confirmed' || v === 'completed') return 'success';
    if (v === 'pending' || v === 'warning' || v === 'draft') return 'warning';
    if (v === 'expired' || v === 'overdue' || v === 'cancelled') return 'danger';
    if (v === 'info' || v === 'renewed' || v === 'submitted' || v === 'online') return 'info';
    return 'neutral';
  }
}
