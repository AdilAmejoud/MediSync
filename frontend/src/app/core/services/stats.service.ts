import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private api: ApiService) {}

  getAdminStats(): Observable<any> {
    return this.api.get('/stats/admin');
  }

  getWeeklyFinancialStats(month: number, year: number): Observable<any> {
    return this.api.get('/reports/financial-weekly', { month: String(month), year: String(year) });
  }

  getMonthlyTrends(month: number, year: number): Observable<any> {
    return this.api.get('/reports/monthly-trends', { month: String(month), year: String(year) });
  }

  getDoctorStats(): Observable<any> {
    return this.api.get('/stats/doctor');
  }

  getPatientStats(): Observable<any> {
    return this.api.get('/stats/patient');
  }

  getSecretaryStats(): Observable<any> {
    return this.api.get('/stats/secretary');
  }
}
