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
  @Input() value: string = '';
  @Input() placeholder: string = 'Select date';
  @Input() showClear: boolean = true;
  @Output() valueChange = new EventEmitter<string>();

  datePickerOpen = signal(false);
  calendarViewDate = signal(new Date());

  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  displayText = computed(() => {
    if (!this.value) return this.placeholder;
    const [y, m, d] = this.value.split('-');
    return `${m}/${d}/${y}`;
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
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isCurrentMonth: false });
    }

    return days;
  });

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.datePickerOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.datePickerOpen.set(false);
    }
  }

  toggleDatePicker(event: Event) {
    event.stopPropagation();
    this.datePickerOpen.update(v => !v);
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
  }

  prevMonth() {
    this.calendarViewDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    this.calendarViewDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
}
