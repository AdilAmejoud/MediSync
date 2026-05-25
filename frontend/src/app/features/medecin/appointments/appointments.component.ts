import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { NgIconComponent } from '@ng-icons/core';

type TabFilter = 'All' | 'Upcoming' | 'Completed' | 'Cancelled';

@Component({
  selector: 'ms-medecin-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DataTableComponent, StatCardComponent, DatePickerComponent],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit {
  columns: TableColumn[] = [
    { key: 'patientName', label: 'Patient', type: 'avatar', subtitleKey: 'patientId' },
    { key: 'dateTime', label: 'Date & Time' },
    { key: 'type', label: 'Type' },
    { key: 'mode', label: 'Mode', type: 'badge' },
    { key: 'status', label: 'Status', type: 'badge' }
  ];

  appointments = signal<any[]>([]);
  loading = signal(false);
  activeTab = signal<TabFilter>('All');
  searchQuery = signal('');

  selectedDate = signal<string>('');

  tabs: TabFilter[] = ['All', 'Upcoming', 'Completed', 'Cancelled'];

  // ─── Metrics ──────────────────────────────────────────────
  todayCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.appointments().filter(a => {
      const s = (a.status || '').toUpperCase();
      return a.slotDate === today && ['CONFIRMED', 'PENDING', 'IN_CONSULTATION'].includes(s);
    }).length;
  });

  upcomingCount = computed(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    return this.appointments().filter(a => {
      const s = (a.status || '').toUpperCase();
      return a.slotDate >= todayStr && a.slotDate <= nextWeekStr &&
        ['CONFIRMED', 'PENDING', 'IN_CONSULTATION'].includes(s);
    }).length;
  });

  completedCount = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return this.appointments().filter(a => {
      if (a.status?.toUpperCase() !== 'COMPLETED') return false;
      const d = new Date(a.slotDate);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  });

  completedTrend = computed(() => {
    const now = new Date();
    const thisMonth = this.completedCount();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastCount = this.appointments().filter(a => {
      if (a.status?.toUpperCase() !== 'COMPLETED') return false;
      const d = new Date(a.slotDate);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;
    if (lastCount === 0) return '';
    const change = ((thisMonth - lastCount) / lastCount * 100).toFixed(0);
    return `${change.startsWith('-') ? '' : '+'}${change}% vs last month`;
  });

  cancellationRate = computed(() => {
    const total = this.appointments().length;
    if (total === 0) return '0%';
    const cancelled = this.appointments().filter(a => a.status?.toUpperCase() === 'CANCELLED').length;
    return ((cancelled / total) * 100).toFixed(1) + '%';
  });

  cancellationTrend = computed(() => {
    const now = new Date();
    const thisMonthCancelled = this.appointments().filter(a => {
      if (a.status?.toUpperCase() !== 'CANCELLED') return false;
      const d = new Date(a.slotDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastCancelled = this.appointments().filter(a => {
      if (a.status?.toUpperCase() !== 'CANCELLED') return false;
      const d = new Date(a.slotDate);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;
    if (lastCancelled === 0) return '';
    const change = ((thisMonthCancelled - lastCancelled) / lastCancelled * 100).toFixed(0);
    return `${change.startsWith('-') ? '' : '+'}${change}% vs last month`;
  });

  // ─── Filtered rows ────────────────────────────────────────
  filteredAppointments = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();
    const dateFilter = this.selectedDate();
    return this.appointments().filter(a => {
      const matchesSearch = !query || a.patientName.toLowerCase().includes(query);
      const status = (a.status || '').toUpperCase();
      const matchesTab = tab === 'All' ||
        (tab === 'Upcoming' && (status === 'CONFIRMED' || status === 'PENDING' || status === 'IN_CONSULTATION')) ||
        (tab === 'Completed' && status === 'COMPLETED') ||
        (tab === 'Cancelled' && status === 'CANCELLED');
      const matchesDate = !dateFilter || a.slotDate === dateFilter;
      return matchesSearch && matchesTab && matchesDate;
    });
  });

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadAppointments();
  }

  setTab(tab: TabFilter) {
    this.activeTab.set(tab);
  }

  onDateChange(dateStr: string) {
    this.selectedDate.set(dateStr);
  }

  loadAppointments() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/doctor/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments.set(res.appointments.map((a: any) => ({
            id: a.id,
            slotDate: a.slotDate,
            patientName: a.userData?.name || 'Unknown',
            patientId: a.userId,
            dateTime: this.formatDateTime(a.slotDate, a.slotTime),
            type: a.type || 'General Visit',
            mode: a.mode || 'In-Person',
            status: a.status?.charAt(0) + a.status?.slice(1).toLowerCase()
          })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatDateTime(slotDate: string, slotTime: string): string {
    if (!slotDate) return '';
    const [y, m, d] = slotDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${months[date.getMonth()]} ${d}, ${y}`;
    if (!slotTime) return formattedDate;
    const [hours, minutes] = slotTime.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const formattedTime = `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    return `${formattedDate} - ${formattedTime}`;
  }
}
