import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastrService } from 'ngx-toastr';
import { ScheduleStateService } from '../../../core/services/schedule-state.service';

type ViewMode = 'week' | 'day' | 'month';

interface CalendarAppointment {
  id: string;
  userId?: string;
  patientId?: string;
  patientName?: string;
  userData?: { name: string; id: string; email: string; avatar?: string };
  slotDate: string;
  slotTime: string;
  type: string;
  mode: string;
  status: string;
  notes?: string;
}

interface UnavailableSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface DayInfo {
  label: string;
  date: Date;
  dateStr: string;
  dateNum: number;
  isToday: boolean;
  isOtherMonth?: boolean;
}

@Component({
  selector: 'ms-medecin-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss'
})
export class ScheduleComponent implements OnInit, OnDestroy {
  viewMode = signal<ViewMode>('week');
  viewModes: ViewMode[] = ['week', 'day', 'month'];

  currentWeekStart = signal<Date>(this.getSunday(new Date()));
  currentDay = signal<Date>(new Date());
  currentMonthStart = signal<Date>(this.getMonthStart(new Date()));

  weekDays = computed<DayInfo[]>(() => this.buildWeekDays(this.currentWeekStart()));
  monthWeeks = computed<DayInfo[][]>(() => this.buildMonthGrid(this.currentMonthStart()));

  appointments = signal<CalendarAppointment[]>([]);
  blockedSlots = signal<UnavailableSlot[]>([]);
  loading = signal(false);

  selectedAppointment = signal<CalendarAppointment | null>(null);
  showBlockModal = signal(false);

  blockDate = '';
  blockStart = '';
  blockEnd = '';
  blockReason = '';

  todayAppointments = computed(() => {
    const todayStr = this.localDateStr(new Date());
    return this.appointments().filter(a =>
      a.slotDate === todayStr &&
      (a.status === 'CHECKED_IN' || a.status === 'CONFIRMED' || a.status === 'IN_CONSULTATION')
    );
  });

  private refreshEffect = effect((onCleanup) => {
    this.scheduleState.refreshSignal();
    const docId = this.getDocId();
    if (!docId) return;
    const { startDate, endDate } = this.getVisibleRange();
    const subs: import('rxjs').Subscription[] = [];
    subs.push(this.http.get<any>(
      `${environment.apiUrl}/doctor/appointments`,
      { params: { startDate, endDate } }
    ).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments.set(res.appointments);
        }
      }
    }));
    subs.push(this.http.get<any>(
      `${environment.apiUrl}/doctor/blocked-slots`,
      { params: { docId, startDate, endDate } }
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.blockedSlots.set(res.data);
        }
      }
    }));
    onCleanup(() => subs.forEach(s => s.unsubscribe()));
  });

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router,
    public scheduleState: ScheduleStateService
  ) {}

  ngOnInit() {
    this.scheduleState.loadDoctorProfile().subscribe(() => this.loadAppointments());
  }

  ngOnDestroy() {
    this.refreshEffect.destroy();
  }

  // ─── Local Date Helpers ───────────────────────────────────

  /** Return YYYY-MM-DD in local time (avoids UTC offset from toISOString) */
  private localDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── Week / Day Helpers ───────────────────────────────────

  private getSunday(d: Date): Date {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getMonthStart(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private buildWeekDays(sunday: Date): DayInfo[] {
    const days: DayInfo[] = [];
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayStr = this.localDateStr(today);
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      const dateStr = this.localDateStr(d);
      days.push({
        label: labels[i],
        date: d,
        dateStr,
        dateNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }

  private buildMonthGrid(monthStart: Date): DayInfo[][] {
    const weeks: DayInfo[][] = [];
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayStr = this.localDateStr(today);
    const startDow = monthStart.getDay();
    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - startDow);
    const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const endDow = lastDay.getDay();
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(gridEnd.getDate() + (6 - endDow));
    let current = new Date(gridStart);
    while (current <= gridEnd) {
      const week: DayInfo[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(current);
        const dateStr = this.localDateStr(d);
        const isCurrentMonth = d.getMonth() === monthStart.getMonth();
        week.push({
          label: labels[i],
          date: d,
          dateStr,
          dateNum: d.getDate(),
          isToday: dateStr === todayStr,
          isOtherMonth: !isCurrentMonth,
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }

  // ─── Day Status Checks ────────────────────────────────────

  /** Return the weekday name ("Monday") from a date string */
  private getWeekdayFromDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return map[d.getDay()];
  }

  /** True if this day is enabled in the doctor's weekly schedule */
  isDayActive(dateStr: string): boolean {
    return this.scheduleState.isDayActive(this.getWeekdayFromDate(dateStr));
  }

  /** Return start/end time for this specific day (per-day or fallback) */
  private getDayBoundaries(dateStr: string): { startTime: string; endTime: string } {
    return this.scheduleState.getDayStartEnd(this.getWeekdayFromDate(dateStr));
  }

  /** True if the slot time is outside the day's configured shift */
  isOutsideShift(dateStr: string, slotTime: string): boolean {
    if (!this.isDayActive(dateStr)) return false;
    const { startTime, endTime } = this.getDayBoundaries(dateStr);
    return slotTime < startTime || slotTime >= endTime;
  }

  /** Count of appointments on inactive days (for conflict badge) */
  getConflictsOnInactiveDays(dateStr: string): CalendarAppointment[] {
    if (this.isDayActive(dateStr)) return [];
    return this.appointments().filter(a =>
      a.slotDate === dateStr &&
      (a.status === 'CHECKED_IN' || a.status === 'CONFIRMED' || a.status === 'IN_CONSULTATION')
    );
  }

  // ─── Data Loading ─────────────────────────────────────────

  private getVisibleRange(): { startDate: string; endDate: string } {
    switch (this.viewMode()) {
      case 'day': {
        const d = this.currentDay();
        const s = this.localDateStr(d);
        return { startDate: s, endDate: s };
      }
      case 'week': {
        const days = this.weekDays();
        return { startDate: days[0].dateStr, endDate: days[6].dateStr };
      }
      case 'month': {
        const grid = this.monthWeeks();
        if (grid.length === 0) {
          const start = this.currentMonthStart();
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
          return {
            startDate: this.localDateStr(start),
            endDate: this.localDateStr(end),
          };
        }
        return {
          startDate: grid[0][0].dateStr,
          endDate: grid[grid.length - 1][6].dateStr,
        };
      }
    }
  }

  loadAppointments() {
    const docId = this.getDocId();
    if (!docId) return;
    this.loading.set(true);
    const { startDate, endDate } = this.getVisibleRange();
    this.http.get<any>(
      `${environment.apiUrl}/doctor/appointments`,
      { params: { startDate, endDate } }
    ).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments.set(res.appointments);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.http.get<any>(
      `${environment.apiUrl}/doctor/blocked-slots`,
      { params: { docId, startDate, endDate } }
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.blockedSlots.set(res.data);
        }
      }
    });
  }

  private getDocId(): string {
    try {
      const user = JSON.parse(localStorage.getItem('ms_user') || '{}');
      return user.id || '';
    } catch { return ''; }
  }

  // ─── Navigation ───────────────────────────────────────────

  navigateBack() {
    switch (this.viewMode()) {
      case 'week': {
        const d = new Date(this.currentWeekStart());
        d.setDate(d.getDate() - 7);
        this.currentWeekStart.set(d);
        break;
      }
      case 'day': {
        const d = new Date(this.currentDay());
        d.setDate(d.getDate() - 1);
        this.currentDay.set(d);
        break;
      }
      case 'month': {
        const d = new Date(this.currentMonthStart());
        d.setMonth(d.getMonth() - 1);
        this.currentMonthStart.set(d);
        break;
      }
    }
    this.loadAppointments();
  }

  navigateForward() {
    switch (this.viewMode()) {
      case 'week': {
        const d = new Date(this.currentWeekStart());
        d.setDate(d.getDate() + 7);
        this.currentWeekStart.set(d);
        break;
      }
      case 'day': {
        const d = new Date(this.currentDay());
        d.setDate(d.getDate() + 1);
        this.currentDay.set(d);
        break;
      }
      case 'month': {
        const d = new Date(this.currentMonthStart());
        d.setMonth(d.getMonth() + 1);
        this.currentMonthStart.set(d);
        break;
      }
    }
    this.loadAppointments();
  }

  goToToday() {
    const today = new Date();
    switch (this.viewMode()) {
      case 'week':
        this.currentWeekStart.set(this.getSunday(today));
        break;
      case 'day':
        this.currentDay.set(today);
        break;
      case 'month':
        this.currentMonthStart.set(this.getMonthStart(today));
        break;
    }
    this.loadAppointments();
  }

  viewLabel(): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    switch (this.viewMode()) {
      case 'week': {
        const days = this.weekDays();
        if (days.length === 0) return '';
        return `${days[0].date.toLocaleDateString('en-US', opts)} \u2013 ${days[6].date.toLocaleDateString('en-US', opts)}`;
      }
      case 'day': {
        const d = this.currentDay();
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      case 'month': {
        const d = this.currentMonthStart();
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
  }

  setView(mode: ViewMode) {
    if (mode === this.viewMode()) return;
    this.viewMode.set(mode);
    const today = new Date();
    switch (mode) {
      case 'week':
        this.currentWeekStart.set(this.getSunday(today));
        break;
      case 'day':
        this.currentDay.set(today);
        break;
      case 'month':
        this.currentMonthStart.set(this.getMonthStart(today));
        break;
    }
    this.loadAppointments();
  }

  goToDay(day: DayInfo) {
    this.currentDay.set(day.date);
    this.viewMode.set('day');
    this.loadAppointments();
  }

  // ─── Grid Cell Logic (sub-hour aware) ─────────────────────

  /** Check if a slot time falls within a blocked slot */
  isBlocked(dateStr: string, slotTime: string): boolean {
    return this.blockedSlots().some(s => {
      if (s.date !== dateStr) return false;
      return slotTime >= s.startTime && slotTime < s.endTime;
    });
  }

  /** Get appointments whose time falls within this slot's range */
  getAppointmentsForCell(dayStr: string, slotTime: string): CalendarAppointment[] {
    const dur = this.scheduleState.slotDuration();
    const slotMinutes = this.timeToMinutes(slotTime);
    const slotEndMinutes = slotMinutes + dur;
    return this.appointments().filter(a => {
      if (a.slotDate !== dayStr) return false;
      if (a.status !== 'CHECKED_IN' && a.status !== 'CONFIRMED' && a.status !== 'IN_CONSULTATION') return false;
      const apptMinutes = this.timeToMinutes(a.slotTime);
      return apptMinutes >= slotMinutes && apptMinutes < slotEndMinutes;
    });
  }

  getDayAppointments(slotTime: string): CalendarAppointment[] {
    const dayStr = this.localDateStr(this.currentDay());
    return this.getAppointmentsForCell(dayStr, slotTime);
  }

  isDayBlocked(slotTime: string): boolean {
    const dayStr = this.localDateStr(this.currentDay());
    return this.isBlocked(dayStr, slotTime);
  }

  isCurrentDayToday(): boolean {
    const todayStr = this.localDateStr(new Date());
    return this.localDateStr(this.currentDay()) === todayStr;
  }

  getAppointmentsForDay(dayStr: string): CalendarAppointment[] {
    return this.appointments().filter(a =>
      a.slotDate === dayStr &&
      (a.status === 'CHECKED_IN' || a.status === 'CONFIRMED' || a.status === 'IN_CONSULTATION')
    );
  }

  private timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  // ─── Appointment Card Display ─────────────────────────────

  appointmentClass(a: CalendarAppointment): string {
    const t = (a.type || '').toLowerCase();
    if (t.includes('emergency')) return 'appt-card--emergency';
    if (t.includes('follow') || t.includes('review')) return 'appt-card--followup';
    return 'appt-card--general';
  }

  appointmentDotClass(a: CalendarAppointment): string {
    const t = (a.type || '').toLowerCase();
    if (t.includes('emergency')) return 'dot--emergency';
    if (t.includes('follow') || t.includes('review')) return 'dot--followup';
    return 'dot--general';
  }

  openAppointmentModal(a: CalendarAppointment) {
    this.selectedAppointment.set(a);
  }

  closeModal() {
    this.selectedAppointment.set(null);
  }

  viewDossier(a: CalendarAppointment) {
    this.closeModal();
    this.router.navigate(['/medecin/patient-files', a.patientId || a.userId]);
  }

  // ─── Block Time ─────────────────────────────────────────────

  openBlockModal() {
    const today = this.localDateStr(new Date());
    this.blockDate = today;
    this.blockStart = '09:00';
    this.blockEnd = '10:00';
    this.blockReason = '';
    this.showBlockModal.set(true);
  }

  closeBlockModal() {
    this.showBlockModal.set(false);
  }

  submitBlockTime() {
    if (!this.blockDate || !this.blockStart || !this.blockEnd) {
      this.toastr.error('Please fill in date, start time, and end time');
      return;
    }
    if (this.blockStart >= this.blockEnd) {
      this.toastr.error('End time must be after start time');
      return;
    }
    const docId = this.getDocId();
    if (!docId) {
      this.toastr.error('Doctor not identified');
      return;
    }
    this.http.post(`${environment.apiUrl}/doctor/block-time`, {
      docId,
      date: this.blockDate,
      startTime: this.blockStart,
      endTime: this.blockEnd,
      reason: this.blockReason || undefined,
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success('Time slot blocked');
          this.closeBlockModal();
          this.loadAppointments();
        } else {
          this.toastr.error(res.message || 'Failed to block time');
        }
      },
      error: () => this.toastr.error('Failed to block time')
    });
  }
}
