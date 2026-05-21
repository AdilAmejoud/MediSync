import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { Prescription } from '../models/prescription.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  constructor(private api: ApiService) {}

  getPrescriptions(): Observable<ApiResponse<Prescription[]>> {
    return this.api.get<ApiResponse<Prescription[]>>('/prescriptions');
  }

  issuePrescription(prescription: Partial<Prescription>): Observable<ApiResponse<Prescription>> {
    return this.api.post<ApiResponse<Prescription>>('/prescriptions', prescription);
  }
}
