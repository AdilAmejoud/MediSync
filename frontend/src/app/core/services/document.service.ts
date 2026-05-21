import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { MedicalDocument } from '../models/document.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private api: ApiService) {}

  getDocuments(): Observable<ApiResponse<MedicalDocument[]>> {
    return this.api.get<ApiResponse<MedicalDocument[]>>('/documents');
  }

  getPatientDocuments(patientId: string): Observable<ApiResponse<MedicalDocument[]>> {
    return this.api.get<ApiResponse<MedicalDocument[]>>(`/documents/patient/${patientId}`);
  }

  uploadDocument(formData: FormData): Observable<ApiResponse<MedicalDocument>> {
    return this.api.upload<ApiResponse<MedicalDocument>>('/documents', formData);
  }
}
