import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { Invoice } from '../models/invoice.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BillingService {
  constructor(private api: ApiService) {}

  getInvoices(): Observable<ApiResponse<Invoice[]>> {
    return this.api.get<ApiResponse<Invoice[]>>('/billing/invoices');
  }

  generateInvoice(invoiceData: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.api.post<ApiResponse<Invoice>>('/billing/generate', invoiceData);
  }

  markAsPaid(invoiceId: string): Observable<ApiResponse<any>> {
    return this.api.post<ApiResponse<any>>(`/billing/pay/${invoiceId}`, {});
  }
}
