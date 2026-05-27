import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastrService } from 'ngx-toastr';
import { PdfService } from '../../../core/services/pdf.service';

interface Invoice {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  service: string;
  services: any[];
  date: string;
  amountMAD: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  reviewedAt: string | null;
}

interface ServiceCatalogItem {
  name: string;
  price: number;
}

interface PatientCatalogItem {
  id: string;
  patientCode: string;
  name: string;
}

interface ServiceLine {
  serviceName: string;
  qty: number;
  unitPrice: number;
}

@Component({
  selector: 'ms-secretary-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent, DatePickerComponent, PdfViewerModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = false;

  serviceCatalog: ServiceCatalogItem[] = [
    { name: "General Consultation", price: 250 },
    { name: "Cardiology ECG Consultation", price: 450 },
    { name: "Orthopedic Evaluation", price: 380 },
    { name: "Advanced Blood Testing", price: 240 },
    { name: "Laser Skeletal Analysis", price: 750 },
    { name: "Dietary Assessment", price: 180 },
    { name: "Pediatric Follow-up", price: 200 }
  ];

  patientsCatalog: PatientCatalogItem[] = [];

  doctorOptions: string[] = [];
  doctorsCatalog: { id: string; name: string }[] = [];

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private pdf: PdfService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadInvoices();
    this.loadDoctors();
    this.loadPatients();
  }

  loadInvoices() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/invoices`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.invoices = res.data.map((inv: any) => ({
            id: inv.invoiceNumber,
            patientName: inv.patientName,
            patientId: inv.patientId,
            doctorName: inv.doctorName,
            service: inv.service,
            services: inv.services,
            date: inv.date,
            amountMAD: inv.amountMAD,
            status: inv.status,
            reviewedAt: inv.reviewedAt
          }));
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadDoctors() {
    this.http.get<any>(`${environment.apiUrl}/doctor/list`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res.doctors || res.data || [];
        this.doctorsCatalog = list.map((d: any) => ({ id: d._id, name: d.name }));
        this.doctorOptions = list.map((d: any) => d.name);
      }
    });
  }

  loadPatients() {
    this.http.get<any>(`${environment.apiUrl}/patients`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.patientsCatalog = res.data.map((p: any) => ({ id: p.id, patientCode: p.patientId, name: p.name }));
        }
      }
    });
  }

  searchQuery = '';
  dateFilter = '';
  
  // Status tabs
  statusTabs: ('All' | 'Paid' | 'Pending' | 'Overdue')[] = ['All', 'Paid', 'Pending', 'Overdue'];
  activeStatusTab: 'All' | 'Paid' | 'Pending' | 'Overdue' = 'All';

  setStatusTab(tab: 'All' | 'Paid' | 'Pending' | 'Overdue') {
    this.activeStatusTab = tab;
  }
  
  // Side panel control state
  showInvoicePanel = false;

  // View Invoice Modal state
  showInvoiceModal = false;
  selectedInvoiceForView: Invoice | null = null;
  invoicePdfData: Uint8Array | null = null;

  // Generate Invoice Form states
  patientSearch = '';
  selectedPatientId = '';
  selectedPatientName = '';
  showPatientResults = false;
  selectedDoctor = '';
  consultationDate = '2026-05-23';
  discountPercent = 0;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' = 'Cash';
  notes = '';
  paymentMethods: ('Cash' | 'Card' | 'Transfer')[] = ['Cash', 'Card', 'Transfer'];

  // Service lines for calculation
  serviceLines: ServiceLine[] = [
    { serviceName: this.serviceCatalog[0].name, qty: 1, unitPrice: this.serviceCatalog[0].price }
  ];

  activeMenuId: string | null = null;

  // Statistics calculation
  get todayRevenue(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.invoices
      .filter(inv => inv.date === today && inv.status === "Paid")
      .reduce((curr, next) => curr + next.amountMAD, 0);
  }

  get pendingCount(): number {
    return this.invoices.filter(inv => inv.status === "Pending").length;
  }

  get overdueCount(): number {
    return this.invoices.filter(inv => inv.status === "Overdue").length;
  }

  handlePatientSelect(p: PatientCatalogItem) {
    this.selectedPatientId = p.id;
    this.selectedPatientName = p.name;
    this.patientSearch = `${p.name} (${p.patientCode})`;
    this.showPatientResults = false;
  }

  handleAddServiceLine() {
    this.serviceLines = [
      ...this.serviceLines,
      { serviceName: this.serviceCatalog[0].name, qty: 1, unitPrice: this.serviceCatalog[0].price }
    ];
  }

  handleRemoveServiceLine(idx: number) {
    if (this.serviceLines.length === 1) return;
    this.serviceLines = this.serviceLines.filter((_, i) => i !== idx);
  }

  handleServiceChange(idx: number, serviceName: string) {
    const item = this.serviceCatalog.find(s => s.name === serviceName);
    const price = item ? item.price : 0;
    const updated = [...this.serviceLines];
    updated[idx] = { ...updated[idx], serviceName, unitPrice: price };
    this.serviceLines = updated;
  }

  handleQtyChange(idx: number, qty: number) {
    const updated = [...this.serviceLines];
    updated[idx] = { ...updated[idx], qty: Math.max(1, qty) };
    this.serviceLines = updated;
  }

  handlePriceChange(idx: number, unitPrice: number) {
    const updated = [...this.serviceLines];
    updated[idx] = { ...updated[idx], unitPrice: Math.max(0, unitPrice) };
    this.serviceLines = updated;
  }

  get subTotal(): number {
    return this.serviceLines.reduce((curr, line) => curr + (line.qty * line.unitPrice), 0);
  }

  get totalAmount(): number {
    return Math.max(0, Math.round(this.subTotal * (1 - this.discountPercent / 100)));
  }

  handleGenerateInvoice() {
    if (!this.selectedPatientId) {
      alert("Please select a patient from the suggestions first.");
      return;
    }

    const doctor = this.doctorsCatalog.find(d => d.name === this.selectedDoctor);

    this.http.post(`${environment.apiUrl}/invoices`, {
      patientId: this.selectedPatientId,
      doctorId: doctor?.id || '',
      amount: this.totalAmount,
      services: this.serviceLines,
      notes: this.notes
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Invoice generated successfully!", "Success");
          this.showInvoicePanel = false;
          this.selectedPatientId = '';
          this.selectedPatientName = '';
          this.patientSearch = '';
          this.discountPercent = 0;
          this.serviceLines = [{ serviceName: this.serviceCatalog[0].name, qty: 1, unitPrice: this.serviceCatalog[0].price }];
          this.notes = '';
          this.loadInvoices();
        } else {
          this.toastr.error(res.message || "Failed to generate invoice");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  handleMarkAsPaid(id: string) {
    this.http.patch(`${environment.apiUrl}/invoices/${id}/pay`, {}).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(`Invoice marked as Paid!`, "Success");
          this.activeMenuId = null;
          this.loadInvoices();
        } else {
          this.toastr.error(res.message || "Failed to mark as paid");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  handleMarkReviewed(id: string) {
    this.http.patch(`${environment.apiUrl}/invoices/${id}/review`, {}).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(`Invoice marked as Reviewed!`, "Success");
          this.activeMenuId = null;
          this.loadInvoices();
        } else {
          this.toastr.error(res.message || "Failed to mark as reviewed");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  toggleActiveMenu(id: string) {
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  handleViewInvoice(inv: Invoice) {
    this.selectedInvoiceForView = inv;
    this.invoicePdfData = null;
    this.showInvoicePanel = false;
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
    this.selectedInvoiceForView = null;
    this.invoicePdfData = null;
  }

  get filteredInvoices(): Invoice[] {
    return this.invoices.filter(inv => {
      const matchesSearch = this.searchQuery === '' ||
        inv.patientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        inv.service.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = this.activeStatusTab === 'All' || inv.status === this.activeStatusTab;
      const matchesDate = this.dateFilter === '' || inv.date === this.dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  get filteredPatientsSuggestions(): PatientCatalogItem[] {
    return this.patientsCatalog.filter(p => 
      p.name.toLowerCase().includes(this.patientSearch.toLowerCase()) || 
      p.id.toLowerCase().includes(this.patientSearch.toLowerCase())
    );
  }

  setPaymentMethod(mode: 'Cash' | 'Card' | 'Transfer') {
    this.paymentMethod = mode;
  }

  generateInvoicePDF(inv: any) {
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
}
