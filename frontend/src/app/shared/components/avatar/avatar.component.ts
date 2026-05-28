import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ms-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent {
  @Input() name: string = '';
  @Input() src?: string;
  @Input() size: number = 36;
  @Input() color?: string;

  getInitials(): string {
    if (!this.name) return '';
    let nameWithoutPrefix = this.name.trim();
    nameWithoutPrefix = nameWithoutPrefix.replace(/^(Dr\.|Dr|MD\.|MD|PhD\.|PhD)\s+/i, '');
    const parts = nameWithoutPrefix.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameWithoutPrefix[0].toUpperCase();
  }

  getBgColor(): string {
    if (this.color) return this.color;
    if (!this.name) return '#4F46E5';
    const presets = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED'];
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % presets.length;
    return presets[index];
  }
}
