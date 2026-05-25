import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { NgIconComponent } from '@ng-icons/core';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ScheduleStateService } from '../../../core/services/schedule-state.service';

interface TimeSlot {
  start: string;
  end: string;
}

interface DayConfig {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  fixedLabel: string;
  fixedColor: string;
  slots: TimeSlot[];
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

@Component({
  selector: 'ms-medecin-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent],
  templateUrl: './availability.component.html',
  styleUrl: './availability.component.scss'
})
export class AvailabilityComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);

  slotDuration = signal<number>(30);
  breakDuration = signal<number>(15);

  availabilityDays = signal<DayConfig[]>([
    { day: 'Monday', enabled: true, startTime: '09:00', endTime: '17:00', isFixed: false, fixedLabel: '', fixedColor: '', slots: [] },
    { day: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00', isFixed: false, fixedLabel: '', fixedColor: '', slots: [] },
    { day: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00', isFixed: false, fixedLabel: '', fixedColor: '', slots: [] },
    { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00', isFixed: false, fixedLabel: '', fixedColor: '', slots: [] },
    { day: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00', isFixed: false, fixedLabel: '', fixedColor: '', slots: [] },
    { day: 'Saturday', enabled: false, startTime: '09:00', endTime: '13:00', isFixed: true, fixedLabel: 'EMERGENCIES ONLY', fixedColor: 'orange', slots: [] },
    { day: 'Sunday', enabled: false, startTime: '', endTime: '', isFixed: true, fixedLabel: 'CLOSED', fixedColor: 'gray', slots: [] },
  ]);

  blockedSlots = signal<BlockedSlot[]>([]);
  showBlockModal = signal(false);

  blockType: 'fullDay' | 'specific' = 'fullDay';
  blockDate = '';
  blockStart = '';
  blockEnd = '';
  blockReason = '';

  private userId = '';

  durationOptions = [15, 30, 60];

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    public scheduleState: ScheduleStateService
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadBlockedSlots();
  }

  loadProfile() {
    this.loading.set(true);
    this.scheduleState.loadDoctorProfile().subscribe({
      next: () => {
        this.slotDuration.set(this.scheduleState.slotDuration());
        this.breakDuration.set(this.scheduleState.breakDuration());

        const ws = this.scheduleState.weeklySchedule();
        if (ws && Object.keys(ws).length > 0) {
          this.availabilityDays.update(days =>
            days.map(day => {
              const key = day.day.toLowerCase();
              const entry = ws[key];
              if (entry && !day.isFixed) {
                return {
                  ...day,
                  enabled: entry.enabled === true,
                  startTime: entry.startTime || day.startTime,
                  endTime: entry.endTime || day.endTime,
                };
              }
              return {
                ...day,
                enabled: day.isFixed ? day.enabled : this.scheduleState.availableDays().includes(day.day),
              };
            })
          );
        } else {
          this.availabilityDays.update(days =>
            days.map(day => ({
              ...day,
              enabled: day.isFixed ? day.enabled : this.scheduleState.availableDays().includes(day.day),
              startTime: day.isFixed ? day.startTime : (this.scheduleState.startTime() || '09:00'),
              endTime: day.isFixed ? day.endTime : (this.scheduleState.endTime() || '17:00'),
            }))
          );
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadBlockedSlots() {
    const docId = this.getDocId();
    if (!docId) return;
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const futureStr = future.toISOString().split('T')[0];

    this.http.get<any>(
      `${environment.apiUrl}/doctor/blocked-slots`,
      { params: { docId, startDate: today, endDate: futureStr } }
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.blockedSlots.set(res.data);
        }
      }
    });
  }

  private getDocId(): string {
    if (this.userId) return this.userId;
    try {
      const user = JSON.parse(localStorage.getItem('ms_user') || '{}');
      return user.id || '';
    } catch { return ''; }
  }

  toggleDay(index: number) {
    const days = this.availabilityDays();
    if (days[index].isFixed) return;
    days[index].enabled = !days[index].enabled;
    this.availabilityDays.set([...days]);
  }

  updateDayTime(index: number, field: 'startTime' | 'endTime', value: string) {
    const days = this.availabilityDays();
    days[index][field] = value;
    this.availabilityDays.set([...days]);
  }

  addSlot(index: number) {
    const days = this.availabilityDays();
    const day = days[index];
    if (!day.enabled || day.isFixed) return;
    const lastSlot = day.slots.length > 0 ? day.slots[day.slots.length - 1] : null;
    const newStart = lastSlot ? lastSlot.end : day.startTime;
    const [h, m] = newStart.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + 30);
    const newEnd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    day.slots.push({ start: newStart, end: newEnd });
    this.availabilityDays.set([...days]);
  }

  removeSlot(dayIndex: number, slotIndex: number) {
    const days = this.availabilityDays();
    days[dayIndex].slots.splice(slotIndex, 1);
    this.availabilityDays.set([...days]);
  }

  updateSlotTime(dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) {
    const days = this.availabilityDays();
    days[dayIndex].slots[slotIndex][field] = value;
    this.availabilityDays.set([...days]);
  }

  setDuration(d: number) {
    this.slotDuration.set(d);
  }

  updateBreak(value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 120) {
      this.breakDuration.set(num);
    }
  }

  saveSchedule() {
    const docId = this.getDocId();
    if (!docId) {
      this.toastr.error('Doctor not identified');
      return;
    }
    this.saving.set(true);

    const days = this.availabilityDays();
    const weeklySchedule: Record<string, any> = {};
    days.forEach(d => {
      weeklySchedule[d.day.toLowerCase()] = {
        enabled: d.enabled,
        startTime: d.enabled ? d.startTime : '',
        endTime: d.enabled ? d.endTime : '',
      };
    });

    const enabledDays = days.filter(d => d.enabled && !d.isFixed).map(d => d.day);

    this.scheduleState.saveSchedule({
      docId,
      weeklySchedule,
      availableDays: enabledDays,
      slotDuration: this.slotDuration(),
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success('Schedule saved successfully');
        } else {
          this.toastr.error(res.message || 'Failed to save');
        }
        this.saving.set(false);
      },
      error: () => {
        this.toastr.error('Server error while saving');
        this.saving.set(false);
      }
    });
  }

  openBlockModal() {
    this.blockType = 'fullDay';
    this.blockDate = new Date().toISOString().split('T')[0];
    this.blockStart = '09:00';
    this.blockEnd = '10:00';
    this.blockReason = '';
    this.showBlockModal.set(true);
  }

  closeBlockModal() {
    this.showBlockModal.set(false);
  }

  submitBlockTime() {
    const docId = this.getDocId();
    if (!docId) {
      this.toastr.error('Doctor not identified');
      return;
    }
    if (!this.blockDate) {
      this.toastr.error('Please select a date');
      return;
    }
    if (!this.blockReason || this.blockReason.trim().length < 3) {
      this.toastr.error('Please provide a reason (at least 3 characters)');
      return;
    }
    if (this.blockType === 'specific' && (!this.blockStart || !this.blockEnd)) {
      this.toastr.error('Please select start and end time');
      return;
    }
    if (this.blockType === 'specific' && this.blockStart >= this.blockEnd) {
      this.toastr.error('End time must be after start time');
      return;
    }

    const payload: any = {
      docId,
      date: this.blockDate,
      reason: this.blockReason.trim(),
    };

    if (this.blockType === 'fullDay') {
      payload.startTime = '00:00';
      payload.endTime = '23:59';
    } else {
      payload.startTime = this.blockStart;
      payload.endTime = this.blockEnd;
    }

    this.http.post(`${environment.apiUrl}/doctor/block-time`, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          const newSlot: BlockedSlot = {
            id: res.id || Date.now().toString(),
            date: this.blockDate,
            startTime: payload.startTime,
            endTime: payload.endTime,
            reason: this.blockReason.trim(),
          };
          this.blockedSlots.update(list => [newSlot, ...list]);
          this.toastr.success('Time block created');
          this.closeBlockModal();
        } else {
          this.toastr.error(res.message || 'Failed to block time');
        }
      },
      error: () => this.toastr.error('Server error')
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isFullDay(slot: BlockedSlot): boolean {
    return slot.startTime === '00:00' && slot.endTime === '23:59';
  }

  getTimeDisplay(slot: BlockedSlot): string {
    if (this.isFullDay(slot)) return 'Full Day';
    return `${slot.startTime} – ${slot.endTime}`;
  }
}
