import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal(false);

  toggle() {
    this.isDark.update(v => !v);
    document.documentElement.setAttribute(
      'data-theme', this.isDark() ? 'dark' : 'light'
    );
    localStorage.setItem('ms_theme', this.isDark() ? 'dark' : 'light');
  }

  init() {
    const saved = localStorage.getItem('ms_theme');
    const isDark = saved === 'dark';
    this.isDark.set(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
}
