import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'ms-stat-card',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() trend: string = '';
  @Input() trendUp: boolean = true;
  @Input() icon: string = '';
  @Input() iconColor: 'blue' | 'green' | 'amber' | 'red' | 'purple' = 'blue';
  @Input() sparkline?: number[];

  getTrendType(): 'positive' | 'negative' | 'flat' {
    if (!this.sparkline || this.sparkline.length < 2) return 'flat';
    const first = this.sparkline[0];
    const last = this.sparkline[this.sparkline.length - 1];
    if (last > first) return 'positive';
    if (last < first) return 'negative';
    return 'flat';
  }

  getSparklinePointsPolyline(): string {
    if (!this.sparkline || this.sparkline.length < 2) return '';
    const width = 80;
    const height = 24;
    const min = Math.min(...this.sparkline);
    const max = Math.max(...this.sparkline);
    const range = max - min || 1;
    
    return this.sparkline.map((val, idx) => {
      const x = (idx / (this.sparkline!.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  getSparklineStrokeColor(): string {
    const trend = this.getTrendType();
    if (trend === 'positive') return '#059669'; // Green-600
    if (trend === 'negative') return '#DC2626'; // Red-600
    return '#9EA5B4'; // Muted Gray
  }
}
