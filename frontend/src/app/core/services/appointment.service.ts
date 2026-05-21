import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  constructor(private api: ApiService) {}

  // Patient methods
  bookAppointment(docId: string, slotDate: string, slotTime: string): Observable<ApiResponse<Appointment>> {
    return this.api.post<ApiResponse<Appointment>>('/user/book-appointment', { docId, slotDate, slotTime });
  }

  getPatientAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.api.get<ApiResponse<Appointment[]>>('/user/appointments');
  }

  cancelPatientAppointment(appointmentId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/user/cancel-appointment', { appointmentId });
  }

  // Admin methods
  getAdminAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.api.get<ApiResponse<Appointment[]>>('/admin/appointments');
  }

  cancelAdminAppointment(appointmentId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/admin/cancel-appointment', { appointmentId });
  }

  getAdminDashboard(): Observable<ApiResponse<any>> {
    return this.api.get<ApiResponse<any>>('/admin/dashboard');
  }

  // Doctor methods
  getDoctorAppointments(): Observable<any> {
    return this.api.get<any>('/doctor/appointments');
  }

  startDoctorAppointment(appointmentId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/doctor/start-appointment', { appointmentId });
  }

  completeDoctorAppointment(appointmentId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/doctor/complete-appointment', { appointmentId });
  }

  cancelDoctorAppointment(appointmentId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/doctor/cancel-appointment', { appointmentId });
  }

  getDoctorDashboard(): Observable<ApiResponse<any>> {
    return this.api.get<ApiResponse<any>>('/doctor/dashboard');
  }

  // Secretary methods
  checkInPatient(appointmentId: string): Observable<any> {
    return this.api.post('/secretaire/check-in', { appointmentId });
  }

  cancelAdmission(appointmentId: string): Observable<any> {
    return this.api.post('/secretaire/cancel-admission', { appointmentId });
  }

  collectPayment(invoiceId: string): Observable<any> {
    return this.api.post('/secretaire/collect-payment', { invoiceId });
  }

  registerWalkIn(data: any): Observable<any> {
    return this.api.post('/secretaire/register-walkin', data);
  }

  registerEmergency(data: any): Observable<any> {
    return this.api.post('/secretaire/register-emergency', data);
  }

  getDoctorStatus(): Observable<any> {
    return this.api.get('/secretaire/doctor-status');
  }
}
