import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatsService } from '../../../core/services/stats.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

interface ShiftCashflowData {
  day: string;
  shifts: number;
  cashflow: number;
}

@Component({
  selector: 'ms-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, NgIconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  error = signal('');
  now = new Date();
  adminName = 'Admin';

  stats: any = null;
  activeDepartments: any[] = [];
  onDutyDoctors: any[] = [];

  // Weekly Revenue & Completed Consultations chart signals
  selectedMonth = signal<number>(this.now.getMonth() + 1);
  selectedYear = signal<number>(this.now.getFullYear());
  currentPickerYear = signal<number>(this.now.getFullYear());
  showMonthPicker = signal<boolean>(false);
  chartData = signal<any[]>([]);
  maxCompleted = signal<number>(10);
  maxRevenue = signal<number>(1000);

  // Month configurations
  monthsList = [
    { value: 1, name: 'January', abbr: 'Jan' },
    { value: 2, name: 'February', abbr: 'Feb' },
    { value: 3, name: 'March', abbr: 'Mar' },
    { value: 4, name: 'April', abbr: 'Apr' },
    { value: 5, name: 'May', abbr: 'May' },
    { value: 6, name: 'June', abbr: 'Jun' },
    { value: 7, name: 'July', abbr: 'Jul' },
    { value: 8, name: 'August', abbr: 'Aug' },
    { value: 9, name: 'September', abbr: 'Sep' },
    { value: 10, name: 'October', abbr: 'Oct' },
    { value: 11, name: 'November', abbr: 'Nov' },
    { value: 12, name: 'December', abbr: 'Dec' }
  ];

  // Tooltip tracking
  hoveredBar = signal<{
    week: string;
    type: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  constructor(
    private statsService: StatsService,
    private auth: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    this.adminName = user?.name || 'Supervisor';

    this.statsService.getAdminStats().subscribe({
      next: (res) => {
        this.stats = res.data.stats;
        this.activeDepartments = res.data.activeDepartments || [];
        this.onDutyDoctors = res.data.onDutyDoctors || [];
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load statistics');
        this.loading.set(false);
      }
    });

    this.loadWeeklyStats();
  }

  loadWeeklyStats() {
    this.statsService.getWeeklyFinancialStats(this.selectedMonth(), this.selectedYear()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.chartData.set(res.data);
          
          // Calculate maxes for scaling
          const maxComp = Math.max(...res.data.map((d: any) => d.completed), 10);
          const maxRev = Math.max(...res.data.map((d: any) => d.revenue), 1000);
          
          this.maxCompleted.set(maxComp);
          this.maxRevenue.set(maxRev);
        }
      },
      error: () => {
        this.toastr.error('Failed to load weekly revenue details');
      }
    });
  }

  getFormattedSelectedDate(): string {
    const monthObj = this.monthsList.find(m => m.value === this.selectedMonth());
    return `${monthObj ? monthObj.name : ''} ${this.selectedYear()}`;
  }

  toggleMonthPicker() {
    this.showMonthPicker.set(!this.showMonthPicker());
    if (this.showMonthPicker()) {
      this.currentPickerYear.set(this.selectedYear());
    }
  }

  prevYear(event: MouseEvent) {
    event.stopPropagation();
    this.currentPickerYear.update(y => y - 1);
  }

  nextYear(event: MouseEvent) {
    event.stopPropagation();
    this.currentPickerYear.update(y => y + 1);
  }

  selectMonth(monthVal: number) {
    this.selectedMonth.set(monthVal);
    this.selectedYear.set(this.currentPickerYear());
    this.showMonthPicker.set(false);
    this.loadWeeklyStats();
  }

  get revenueYLabels(): number[] {
    const maxRev = this.maxRevenue();
    return [
      maxRev,
      Math.round(maxRev * 2 / 3),
      Math.round(maxRev * 1 / 3),
      0
    ];
  }

  showTooltip(event: MouseEvent, week: string, type: string, value: number) {
    this.hoveredBar.set({
      week,
      type,
      value,
      x: event.clientX,
      y: event.clientY
    });
  }

  hideTooltip() {
    this.hoveredBar.set(null);
  }
}
