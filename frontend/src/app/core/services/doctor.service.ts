import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { Doctor } from '../models/doctor.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  constructor(private api: ApiService) {}

  getDoctors(): Observable<ApiResponse<Doctor[]>> {
    return this.api.get<ApiResponse<Doctor[]>>('/doctor/list');
  }

  getAdminDoctors(): Observable<ApiResponse<Doctor[]>> {
    return this.api.post<ApiResponse<Doctor[]>>('/admin/all-doctors', {});
  }

  addDoctor(doctorData: FormData): Observable<ApiResponse<Doctor>> {
    return this.api.upload<ApiResponse<Doctor>>('/admin/add-doctor', doctorData);
  }

  changeAvailability(docId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>('/admin/change-availability', { docId });
  }

  getProfile(): Observable<ApiResponse<Doctor>> {
    return this.api.get<ApiResponse<Doctor>>('/doctor/profile');
  }

  updateProfile(profileData: any): Observable<ApiResponse<Doctor>> {
    return this.api.post<ApiResponse<Doctor>>('/doctor/update-profile', profileData);
  }
}
