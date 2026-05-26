import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastrService } from 'ngx-toastr';

type PaymentFilter = 'all' | 'card' | 'cash' | 'bank' | 'insurance';

interface Transaction {
  rowNum: number;
  id: string;
  rawId: string;
  invoiceId: string;
  patientName: string;
  patientInitials: string;
  avatarColor: string;
  paymentMode: 'card' | 'cash' | 'bank' | 'insurance' | 'unknown';
  amount: number;
  amountDisplay: string;
  amountSign: '+' | '-';
  status: 'Completed' | 'Refunded' | 'Processing' | 'Paid' | 'Pending';
  dateTime: Date;
  rawDate: string;
  services: any[];
  doctorName: string;
}

const AVATAR_PALETTE = [
  '#6366F1','#8B5CF6','#EC4899','#14B8A6','#F59E0B',
  '#10B981','#3B82F6','#EF4444','#F97316','#06B6D4'
];

@Component({
  selector: 'ms-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  allTransactions: Transaction[] = [];
  loading = signal(false);
  searchQuery = '';
  activeFilter = signal<PaymentFilter>('all');

  readonly paymentFilters: { key: PaymentFilter; label: string }[] = [
    { key: 'all',       label: 'All'           },
    { key: 'card',      label: 'Card'          },
    { key: 'cash',      label: 'Cash'          },
    { key: 'bank',      label: 'Bank Transfer' },
    { key: 'insurance', label: 'Insurance'     },
  ];

  // ── Analytics ─────────────────────────────────────────────────────────────
  get totalTransactions(): number {
    return this.allTransactions.reduce((s, t) => s + t.amount, 0);
  }
  get refundedAmount(): number {
    return this.allTransactions.filter(t => t.status === 'Refunded').reduce((s, t) => s + t.amount, 0);
  }
  get processingAmount(): number {
    return this.allTransactions.filter(t => t.status === 'Processing').reduce((s, t) => s + t.amount, 0);
  }
  get netCashFlow(): number {
    return this.totalTransactions - this.refundedAmount;
  }

  // ── Filtered rows ─────────────────────────────────────────────────────────
  get filteredTransactions(): Transaction[] {
    let rows = this.allTransactions;
    const f = this.activeFilter();
    if (f !== 'all') rows = rows.filter(t => t.paymentMode === f);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) rows = rows.filter(t =>
      t.patientName.toLowerCase().includes(q) ||
      t.invoiceId.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
    return rows;
  }

  constructor(
    private http: HttpClient,
    private pdfService: PdfService,
    private toastr: ToastrService
  ) {}

  ngOnInit() { this.loadTransactions(); }

  loadTransactions() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/invoices`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allTransactions = res.data.map((inv: any, i: number) => {
            const name: string = inv.patientName || 'Unknown';
            const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('');
            const color = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            const isRefund = inv.status === 'Refunded';
            const statusMap: Record<string, Transaction['status']> = {
              Paid: 'Completed', PAID: 'Completed',
              Pending: 'Processing', PENDING: 'Processing',
              Overdue: 'Refunded', OVERDUE: 'Refunded',
            };
            return {
              rowNum: i + 1,
              id: `#TXN-${String(i + 900).padStart(3, '0')}`,
              rawId: inv.id,
              invoiceId: inv.invoiceNumber || inv.id?.slice(0,8).toUpperCase(),
              patientName: name,
              patientInitials: initials,
              avatarColor: color,
              paymentMode: this.detectMode(inv),
              amount: inv.amountMAD || inv.amount || 0,
              amountDisplay: `${isRefund ? '-' : '+'}${(inv.amountMAD || 0).toFixed(2)} MAD`,
              amountSign: isRefund ? '-' : '+',
              status: statusMap[inv.status] || 'Completed',
              dateTime: new Date(inv.date || inv.createdAt || Date.now()),
              rawDate: inv.date || inv.createdAt,
              services: inv.services || [],
              doctorName: inv.doctorName || '',
            } as Transaction;
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private detectMode(inv: any): Transaction['paymentMode'] {
    const m = (inv.paymentMethod || inv.method || '').toLowerCase();
    if (m.includes('card') || m.includes('visa') || m.includes('credit')) return 'card';
    if (m.includes('cash'))       return 'cash';
    if (m.includes('bank') || m.includes('transfer') || m.includes('wire')) return 'bank';
    if (m.includes('insur'))      return 'insurance';
    return 'card'; // default
  }

  setFilter(f: PaymentFilter) { this.activeFilter.set(f); }

  exportLedger() {
    this.toastr.info('Exporting ledger...', 'Export');
  }

  openReceipt(t: Transaction) {
    this.pdfService.generateInvoice({
      invoiceNumber: t.invoiceId,
      patientName:   t.patientName,
      doctorName:    t.doctorName,
      date:          new Date(t.dateTime).toLocaleDateString('en-US'),
      services:      t.services?.length ? t.services : [{ name: 'Consultation', qty: 1, price: t.amount }],
      total:         t.amount,
      status:        t.status
    });
    this.toastr.success('Receipt generated!', 'Receipt');
  }

  getPaymentLabel(mode: string): string {
    const map: Record<string, string> = {
      card: 'Card', cash: 'Cash', bank: 'Bank Transfer', insurance: 'Insurance', unknown: '—'
    };
    return map[mode] || '—';
  }

  getPaymentIcon(mode: string): string {
    const map: Record<string, string> = {
      card: 'heroCreditCard', cash: 'heroBanknotes',
      bank: 'heroArrowsRightLeft', insurance: 'heroShieldCheck', unknown: 'heroQuestionMarkCircle'
    };
    return map[mode] || 'heroQuestionMarkCircle';
  }

  formatDate(d: Date): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
