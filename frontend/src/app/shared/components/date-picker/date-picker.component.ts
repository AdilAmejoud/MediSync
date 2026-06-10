import { Component, Input, Output, EventEmitter, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'ms-date-picker',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {
  private _value = signal<string>('');

  @Input() value: string = '';
  @Input() placeholder: string = 'Select date';
  @Input() showClear: boolean = true;
  @Output() valueChange = new EventEmitter<string>();

  datePickerOpen = signal(false);
  calendarViewDate = signal(new Date());
  viewMode = signal<'days' | 'months' | 'years'>('days');
  yearsStartYear = signal<number>(2020);

  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  monthsList = [
    { label: 'Jan', value: 0 },
    { label: 'Feb', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Apr', value: 3 },
    { label: 'May', value: 4 },
    { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 },
    { label: 'Aug', value: 7 },
    { label: 'Sep', value: 8 },
    { label: 'Oct', value: 9 },
    { label: 'Nov', value: 10 },
    { label: 'Dec', value: 11 }
  ];

  get displayText(): string {
    if (!this.value) return this.placeholder;
    const parts = this.value.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${m}/${d}/${y}`;
    }
    return this.value;
  }

  headerText = computed(() => {
    const mode = this.viewMode();
    const d = this.calendarViewDate();
    if (mode === 'days') {
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (mode === 'years') {
      const start = this.yearsStartYear();
      return `${start} - ${start + 15}`;
    } else {
      return `${d.getFullYear()}`;
    }
  });

  yearsGrid = computed(() => {
    const start = this.yearsStartYear();
    const arr = [];
    for (let i = 0; i < 16; i++) {
      arr.push(start + i);
    }
    return arr;
  });

  calendarMonthYear = computed(() => {
    const d = this.calendarViewDate();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    const viewDate = this.calendarViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days: { day: number; dateStr: string; isToday: boolean; isCurrentMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
    }

    return days;
  });

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (target && !document.body.contains(target)) {
      return;
    }
    if (this.datePickerOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.datePickerOpen.set(false);
      this.viewMode.set('days');
    }
  }

  toggleDatePicker(event: Event) {
    event.stopPropagation();
    this.datePickerOpen.update(v => {
      const nextVal = !v;
      if (nextVal) {
        this.viewMode.set('days');
        const val = this.value;
        if (val) {
          const parts = val.split('-');
          if (parts.length === 3) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            if (!isNaN(y) && !isNaN(m)) {
              this.calendarViewDate.set(new Date(y, m - 1, 1));
            }
          }
        } else {
          this.calendarViewDate.set(new Date());
        }
      }
      return nextVal;
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDatePicker(event);
    }
  }

  selectDate(event: Event, dateStr: string) {
    event.stopPropagation();
    this.value = dateStr;
    this.valueChange.emit(dateStr);
    this.datePickerOpen.set(false);
  }

  clearDate(event: Event) {
    event.stopPropagation();
    this.value = '';
    this.valueChange.emit('');
    this.datePickerOpen.set(false);
    this.viewMode.set('days');
  }

  prevMonth() {
    this.calendarViewDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    this.calendarViewDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  onHeaderClick() {
    if (this.viewMode() === 'days') {
      this.switchToYears();
    }
  }

  switchToYears() {
    const currentYear = this.calendarViewDate().getFullYear();
    const start = currentYear - 7;
    this.yearsStartYear.set(start);
    this.viewMode.set('years');
  }

  onHeaderPrev() {
    const mode = this.viewMode();
    if (mode === 'days') {
      this.prevMonth();
    } else if (mode === 'years') {
      this.yearsStartYear.update(y => y - 16);
    }
  }

  onHeaderNext() {
    const mode = this.viewMode();
    if (mode === 'days') {
      this.nextMonth();
    } else if (mode === 'years') {
      this.yearsStartYear.update(y => y + 16);
    }
  }

  selectYear(year: number) {
    this.calendarViewDate.update(d => {
      const newDate = new Date(d);
      newDate.setFullYear(year);
      return newDate;
    });
    this.viewMode.set('months');
  }

  selectMonth(month: number) {
    this.calendarViewDate.update(d => {
      const newDate = new Date(d);
      newDate.setMonth(month);
      return newDate;
    });
    this.viewMode.set('days');
  }
}
