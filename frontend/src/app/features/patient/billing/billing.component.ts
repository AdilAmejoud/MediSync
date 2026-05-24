import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { PdfService } from '../../../core/services/pdf.service';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgIconComponent } from '@ng-icons/core';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

interface Invoice {
  id: string;
  patientName: string;
  doctorName: string;
  service: string;
  services: any[];
  date: string;
  amountMAD: number;
  status: string;
}

@Component({
  selector: 'ms-patient-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DatePickerComponent, PdfViewerModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = false;

  searchQuery = '';
  dateFilter = '';
  statusTabs: ('All' | 'Paid' | 'Pending' | 'Overdue')[] = ['All', 'Paid', 'Pending', 'Overdue'];
  activeStatusTab: 'All' | 'Paid' | 'Pending' | 'Overdue' = 'All';

  showInvoiceModal = false;
  selectedInvoice: Invoice | null = null;
  invoicePdfData: Uint8Array | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private pdf: PdfService,
    private sanitizer: DomSanitizer
  ) {}
  appointments: any[] = [];

  ngOnInit() {
    this.loadInvoices();
    this.loadAppointments();
  }

  loadInvoices() {
    this.loading = true;
    const userName = this.auth.currentUser()?.name || '';
    this.http.get<any>(`${environment.apiUrl}/invoices`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.invoices = res.data
            .filter((inv: any) => inv.patientName === userName)
            .map((inv: any) => ({
              id: inv.invoiceNumber,
              patientName: inv.patientName,
              doctorName: inv.doctorName,
              service: inv.service,
              services: inv.services,
              date: inv.date,
              amountMAD: inv.amountMAD,
              status: inv.status
            }));
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadAppointments() {
    this.http.get<any>(`${environment.apiUrl}/user/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments = res.appointments;
        }
      }
    });
  }

  setStatusTab(tab: 'All' | 'Paid' | 'Pending' | 'Overdue') {
    this.activeStatusTab = tab;
  }

  get completedAppointmentsCount(): number {
    return this.appointments.filter(a => a.status?.toUpperCase() === 'COMPLETED').length;
  }

  get pendingAppointmentsCount(): number {
    const nowTime = new Date().getTime();
    return this.appointments.filter(a => 
      a.status?.toUpperCase() === 'PENDING' && new Date(a.date).getTime() >= nowTime
    ).length;
  }

  get overdueAppointmentsCount(): number {
    const nowTime = new Date().getTime();
    return this.appointments.filter(a => {
      const s = a.status?.toUpperCase();
      return (s === 'PENDING' || s === 'CONFIRMED' || s === 'RESCHEDULED') && new Date(a.date).getTime() < nowTime;
    }).length;
  }

  get filteredInvoices(): Invoice[] {
    return this.invoices.filter(inv => {
      const matchesSearch = this.searchQuery === '' ||
        inv.doctorName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        inv.service.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = this.activeStatusTab === 'All' || inv.status === this.activeStatusTab;
      const matchesDate = this.dateFilter === '' || inv.date === this.dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  handleViewInvoice(inv: Invoice) {
    this.selectedInvoice = inv;
    this.invoicePdfData = null;
    this.showInvoiceModal = true;

    const services = (inv.services || []).map((s: any) => ({
      name: s.name || s.serviceName || 'Service',
      qty: s.qty || 1,
      price: s.unitPrice || s.price || 0,
    }));

    this.invoicePdfData = this.pdf.generateInvoiceArray({
      invoiceNumber: inv.id,
      patientName: inv.patientName,
      doctorName: inv.doctorName || 'N/A',
      date: inv.date,
      services,
      total: inv.amountMAD,
      status: inv.status,
    });
  }

  closeInvoiceModal() {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
    this.invoicePdfData = null;
  }

  downloadInvoice(inv: Invoice) {
    const services = (inv.services || []).map((s: any) => ({
      name: s.name || s.serviceName || 'Service',
      qty: s.qty || 1,
      price: s.unitPrice || s.price || 0,
    }));
    this.pdf.generateInvoice({
      invoiceNumber: inv.id,
      patientName: inv.patientName,
      doctorName: inv.doctorName || 'N/A',
      date: inv.date,
      services,
      total: inv.amountMAD,
      status: inv.status,
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-pill--paid';
      case 'Pending': return 'status-pill--pending';
      case 'Overdue': return 'status-pill--overdue';
      default: return '';
    }
  }
}
