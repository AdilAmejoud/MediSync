import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ms-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  @Input() type: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
  @Input() text: string = '';
}
