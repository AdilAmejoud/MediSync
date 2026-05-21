import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, finalize } from 'rxjs';

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleStateService {
  availableDays = signal<string[]>(['Monday','Tuesday','Wednesday','Thursday','Friday']);
  startTime = signal('09:00');
  endTime = signal('17:00');
  slotDuration = signal(30);
  breakDuration = signal(15);
  weeklySchedule = signal<Record<string, DaySchedule>>({});
  loading = signal(false);
  refreshSignal = signal(0);

  activeDayNames = computed(() => this.availableDays());

  gridSlots = computed(() => {
    const startH = parseInt(this.startTime().split(':')[0] || '0');
    const startM = parseInt(this.startTime().split(':')[1] || '0');
    const endH = parseInt(this.endTime().split(':')[0] || '0');
    const endM = parseInt(this.endTime().split(':')[1] || '0');
    const dur = this.slotDuration();

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slots: string[] = [];

    for (let m = startMinutes; m + dur <= endMinutes; m += dur) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  });

  dayNamesMap: Record<string, string> = {
    'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
    'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday',
    'sunday': 'Sunday', 'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
    'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday',
  };

  constructor(private http: HttpClient) {}

  getDayConfig(dayLabel: string): DaySchedule {
    const lowerKey = dayLabel.toLowerCase();
    const ws = this.weeklySchedule();
    const wsEntry = ws[lowerKey];
    if (wsEntry !== undefined) {
      return { ...wsEntry };
    }
    return {
      enabled: this.availableDays().some(d => d.toLowerCase() === lowerKey),
      startTime: this.startTime(),
      endTime: this.endTime(),
    };
  }

  isDayActive(dayLabel: string): boolean {
    const lowerKey = dayLabel.toLowerCase();
    const ws = this.weeklySchedule();
    const wsEntry = ws[lowerKey];
    if (wsEntry !== undefined) {
      return wsEntry.enabled === true;
    }
    return this.availableDays().some(d => d.toLowerCase() === lowerKey);
  }

  getDayStartEnd(dayLabel: string): { startTime: string; endTime: string } {
    const cfg = this.getDayConfig(dayLabel);
    return {
      startTime: cfg.enabled ? cfg.startTime : this.startTime(),
      endTime: cfg.enabled ? cfg.endTime : this.endTime(),
    };
  }

  loadDoctorProfile() {
    this.loading.set(true);
    return this.http.get<any>(`${environment.apiUrl}/doctor/profile`).pipe(
      tap((res) => {
        if (res.success && res.profileData) {
          const d = res.profileData;
          this.slotDuration.set(d.slotDuration || 30);
          this.startTime.set(d.startTime || '09:00');
          this.endTime.set(d.endTime || '17:00');
          if (d.availableDays && Array.isArray(d.availableDays)) {
            this.availableDays.set(d.availableDays);
          }
          if (d.weeklySchedule && typeof d.weeklySchedule === 'object') {
            this.weeklySchedule.set(d.weeklySchedule);
          }
        }
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  saveSchedule(data: any) {
    return this.http.post(`${environment.apiUrl}/doctor/update-profile`, data).pipe(
      tap(() => {
        this.loadDoctorProfile().subscribe(() => {
          this.refreshSignal.update(v => v + 1);
        });
      }),
    );
  }
}
