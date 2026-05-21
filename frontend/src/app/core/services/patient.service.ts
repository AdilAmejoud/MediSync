import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { Patient } from '../models/patient.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  constructor(private api: ApiService) {}

  getProfile(): Observable<ApiResponse<Patient>> {
    return this.api.get<ApiResponse<Patient>>('/user/get-profile');
  }

  updateProfile(formData: FormData): Observable<ApiResponse<Patient>> {
    return this.api.upload<ApiResponse<Patient>>('/user/update-profile', formData);
  }

  // General list of patients (for admin, secretary, doctors)
  getPatients(): Observable<ApiResponse<Patient[]>> {
    // In our backend controllers, patients list might be served through userController, let's fall back to list of users or a generic endpoint
    return this.api.get<ApiResponse<Patient[]>>('/admin/patients');
  }
}
