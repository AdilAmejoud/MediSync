import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastrService } from 'ngx-toastr';

type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft' | 'Pending';
type StatusFilter  = 'all' | 'paid' | 'unpaid' | 'overdue' | 'draft';

interface Invoice {
  id: string;
  invoiceId: string;
  patientName: string;
  patientInitials: string;
  avatarColor: string;
  doctorName: string;
  issueDate: Date;
  dueDate: Date | null;
  amount: number;
  status: InvoiceStatus;
  services: any[];
  rawDate: string;
}

const AVATAR_PALETTE = [
  '#6366F1','#8B5CF6','#EC4899','#14B8A6','#F59E0B',
  '#10B981','#3B82F6','#EF4444','#F97316','#06B6D4'
];

@Component({
  selector: 'ms-admin-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DocumentViewerComponent],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  allInvoices: Invoice[] = [];
  loading = signal(false);
  searchQuery = '';
  activeFilter = signal<StatusFilter>('all');

  readonly statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all',     label: 'All'     },
    { key: 'paid',    label: 'Paid'    },
    { key: 'unpaid',  label: 'Unpaid'  },
    { key: 'overdue', label: 'Overdue' },
    { key: 'draft',   label: 'Draft'   },
  ];

  // ── Document viewer ───────────────────────────────────────────────────────
  showInvoiceViewer = false;
  invoiceViewerData: Uint8Array | null = null;
  invoiceViewerTitle = '';
  selectedInvoice: Invoice | null = null;

  // ── Analytics ─────────────────────────────────────────────────────────────
  get totalInvoiced(): number  { return this.allInvoices.reduce((s, i) => s + i.amount, 0); }
  get paidAmount(): number     { return this.allInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0); }
  get paidCount(): number      { return this.allInvoices.filter(i => i.status === 'Paid').length; }
  get unpaidAmount(): number   { return this.allInvoices.filter(i => i.status === 'Unpaid' || i.status === 'Pending').reduce((s, i) => s + i.amount, 0); }
  get overdueAmount(): number  { return this.allInvoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0); }
  get pendingCount(): number   { return this.allInvoices.filter(i => i.status === 'Unpaid' || i.status === 'Pending').length; }

  // ── Filtered rows ─────────────────────────────────────────────────────────
  get filteredInvoices(): Invoice[] {
    let rows = this.allInvoices;
    const f = this.activeFilter();
    if (f !== 'all') rows = rows.filter(i => i.status.toLowerCase() === f);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) rows = rows.filter(i =>
      i.patientName.toLowerCase().includes(q) ||
      i.invoiceId.toLowerCase().includes(q)
    );
    return rows;
  }

  constructor(
    private http: HttpClient,
    private pdfService: PdfService,
    private toastr: ToastrService
  ) {}

  ngOnInit() { this.loadInvoices(); }

  loadInvoices() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/invoices`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allInvoices = res.data.map((inv: any, i: number) => {
            const name: string = inv.patientName || 'Unknown';
            const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('');
            const color    = AVATAR_PALETTE[i % AVATAR_PALETTE.length];

            // Parse services cleanly — no raw JSON strings exposed
            let services: { name: string; qty: number; price: number }[] = [];
            const raw = inv.service || inv.services || [];
            if (typeof raw === 'string') {
              try { services = JSON.parse(raw); } catch { services = [{ name: raw, qty: 1, price: inv.amountMAD || 0 }]; }
            } else if (Array.isArray(raw)) {
              services = raw.map((s: any) => ({
                name:  s.name  || s.serviceName || 'Service',
                qty:   s.qty   || 1,
                price: s.price || s.unitPrice   || 0,
              }));
            }

            // Normalise status
            const statusMap: Record<string, InvoiceStatus> = {
              Paid: 'Paid', PAID: 'Paid',
              Pending: 'Unpaid', PENDING: 'Unpaid',
              Overdue: 'Overdue', OVERDUE: 'Overdue',
              Draft: 'Draft', DRAFT: 'Draft',
            };

            return {
              id:               inv.id,
              invoiceId:        inv.invoiceNumber || inv.id?.slice(0,8).toUpperCase(),
              patientName:      name,
              patientInitials:  initials,
              avatarColor:      color,
              doctorName:       inv.doctorName ? `Dr. ${inv.doctorName}` : '—',
              issueDate:        new Date(inv.date || inv.createdAt || Date.now()),
              dueDate:          inv.dueDate ? new Date(inv.dueDate) : null,
              amount:           inv.amountMAD || inv.amount || 0,
              status:           statusMap[inv.status] || 'Unpaid',
              services,
              rawDate:          inv.date || inv.createdAt,
            } as Invoice;
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setFilter(f: StatusFilter) { this.activeFilter.set(f); }

  // ── Actions ───────────────────────────────────────────────────────────────
  viewInvoice(inv: Invoice) {
    this.selectedInvoice = inv;
    this.invoiceViewerData = this.pdfService.generateInvoiceArray({
      invoiceNumber: inv.invoiceId,
      patientName:   inv.patientName,
      doctorName:    inv.doctorName,
      date:          inv.rawDate ? new Date(inv.rawDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
      services:      inv.services?.length ? inv.services : [{ name: 'Service', qty: 1, price: inv.amount }],
      total:         inv.amount,
      status:        inv.status
    });
    this.invoiceViewerTitle  = `Invoice — ${inv.invoiceId}`;
    this.showInvoiceViewer   = true;
  }

  downloadInvoice(inv: Invoice) {
    this.pdfService.generateInvoice({
      invoiceNumber: inv.invoiceId,
      patientName:   inv.patientName,
      doctorName:    inv.doctorName,
      date:          inv.rawDate ? new Date(inv.rawDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
      services:      inv.services?.length ? inv.services : [{ name: 'Service', qty: 1, price: inv.amount }],
      total:         inv.amount,
      status:        inv.status
    });
    this.toastr.success('Invoice PDF downloaded!', 'Success');
  }

  downloadViewedInvoice() {
    if (this.selectedInvoice) this.downloadInvoice(this.selectedInvoice);
  }

  closeViewer() {
    this.showInvoiceViewer  = false;
    this.invoiceViewerData  = null;
    this.selectedInvoice    = null;
  }

  formatDate(d: Date | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isDueDateOverdue(d: Date | null): boolean {
    if (!d) return false;
    return new Date(d) < new Date();
  }
}
