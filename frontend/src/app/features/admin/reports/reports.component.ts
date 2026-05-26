import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';
import { StatsService } from '../../../core/services/stats.service';
import { ToastrService } from 'ngx-toastr';
import { NgIconComponent } from '@ng-icons/core';
import jsPDF from 'jspdf';

@Component({
  selector: 'ms-admin-reports',
  standalone: true,
  imports: [CommonModule, DocumentViewerComponent, NgIconComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  reports: any[] = [];
  loading = false;
  generating = false;

  // Live Summary Cards
  summaryStats = signal<any>({
    occupancy: { value: '0%', trend: '+0%', trendUp: true },
    waitTime: { value: '0 min', trend: '-0 min', trendUp: false },
    admissions: { value: '0 Patients', trend: '+0%', trendUp: true }
  });

  // Month Picker State Signals
  now = new Date();
  selectedMonth = signal<number>(this.now.getMonth() + 1);
  selectedYear = signal<number>(this.now.getFullYear());
  currentPickerYear = signal<number>(this.now.getFullYear());
  showMonthPicker = signal<boolean>(false);

  monthsList = [
    { value: 1, name: 'January', abbr: 'Jan' },
    { value: 2, name: 'February', abbr: 'Feb' },
    { value: 3, name: 'March', abbr: 'Mar' },
    { value: 4, name: 'April', abbr: 'Apr' },
    { value: 5, name: 'May', abbr: 'May' },
    { value: 6, name: 'June', abbr: 'Jun' },
    { value: 7, name: 'July', abbr: 'Jul' },
    { value: 8, name: 'August', abbr: 'Aug' },
    { value: 9, name: 'September', abbr: 'Sep' },
    { value: 10, name: 'October', abbr: 'Oct' },
    { value: 11, name: 'November', abbr: 'Nov' },
    { value: 12, name: 'December', abbr: 'Dec' }
  ];

  // Chart Rendering State Signals
  chartData = signal<any[]>([]);
  maxCompleted = signal<number>(10);
  maxRevenue = signal<number>(1000);

  // Chart Interactive Tooltip Signal
  hoveredBar = signal<{
    x: number;
    y: number;
    month: string;
    type: string;
    value: number;
  } | null>(null);

  // PDF Overlay Modal State
  showReportViewer = false;
  reportViewerData: Uint8Array | null = null;
  reportViewerTitle = '';
  selectedReport: any = null;

  constructor(
    private http: HttpClient,
    private statsService: StatsService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadReports();
    this.loadMonthlyTrends();
  }

  loadReports() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/reports`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reports = res.data;
        }
        if (res.success && res.summaryStats) {
          this.summaryStats.set(res.summaryStats);
        }
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load clinic reports list.');
        this.loading = false;
      }
    });
  }

  loadMonthlyTrends() {
    this.statsService.getMonthlyTrends(this.selectedMonth(), this.selectedYear()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.chartData.set(res.data);
          // Auto-compute max scale bounds
          const maxComp = Math.max(...res.data.map((d: any) => d.completed), 10);
          const maxRev = Math.max(...res.data.map((d: any) => d.revenue), 1000);
          this.maxCompleted.set(maxComp);
          this.maxRevenue.set(maxRev);
        }
      },
      error: () => {
        this.toastr.error('Failed to load monthly revenue trends.');
      }
    });
  }

  generateDetailedReport() {
    this.generating = true;
    this.http.post<any>(`${environment.apiUrl}/reports`, {}).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.toastr.success('Detailed clinic audit report generated successfully!', 'Success');
          // Prepend new report to list in real-time
          this.reports.unshift(res.data);
        }
        this.generating = false;
      },
      error: () => {
        this.toastr.error('Failed to generate detailed clinic report.');
        this.generating = false;
      }
    });
  }

  // Month Picker Actions
  getFormattedSelectedDate(): string {
    const monthObj = this.monthsList.find(m => m.value === this.selectedMonth());
    return `${monthObj ? monthObj.name : ''} ${this.selectedYear()}`;
  }

  toggleMonthPicker() {
    this.showMonthPicker.set(!this.showMonthPicker());
    if (this.showMonthPicker()) {
      this.currentPickerYear.set(this.selectedYear());
    }
  }

  prevYear(event: MouseEvent) {
    event.stopPropagation();
    this.currentPickerYear.update(y => y - 1);
  }

  nextYear(event: MouseEvent) {
    event.stopPropagation();
    this.currentPickerYear.update(y => y + 1);
  }

  selectMonth(monthVal: number) {
    this.selectedMonth.set(monthVal);
    this.selectedYear.set(this.currentPickerYear());
    this.showMonthPicker.set(false);
    this.loadMonthlyTrends();
  }

  // Tooltip Helpers
  showTooltip(event: MouseEvent, month: string, type: string, value: number) {
    const target = event.currentTarget as SVGAElement;
    const rect = target.getBoundingClientRect();
    const parentRect = target.parentElement?.parentElement?.getBoundingClientRect();

    if (parentRect) {
      this.hoveredBar.set({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top,
        month,
        type,
        value
      });
    }
  }

  hideTooltip() {
    this.hoveredBar.set(null);
  }

  get revenueYLabels(): number[] {
    const maxVal = this.maxRevenue();
    return [maxVal, maxVal * 2 / 3, maxVal * 1 / 3, 0];
  }

  // PDF Actions
  viewReport(report: any) {
    this.selectedReport = report;
    this.reportViewerData = this.generateReportArray(report);
    this.reportViewerTitle = report.title;
    this.showReportViewer = true;
  }

  downloadReport(report: any) {
    const doc = this.buildReportDoc(report);
    doc.save(`${report.title.replace(/\s+/g, '_')}.pdf`);
  }

  downloadViewedReport() {
    if (this.selectedReport) {
      this.downloadReport(this.selectedReport);
    }
  }

  closeReportViewer() {
    this.showReportViewer = false;
    this.reportViewerData = null;
    this.selectedReport = null;
  }

  private generateReportArray(report: any): Uint8Array {
    const doc = this.buildReportDoc(report);
    return new Uint8Array(doc.output('arraybuffer'));
  }

  private buildReportDoc(report: any): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    // Draw header block
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('MediSync', 14, 12);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Clinic Report', 14, 20);
    doc.text(report.date, w - 14, 20, { align: 'right' });

    // Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(report.title, 14, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 46, w - 14, 46);

    // If there are specific DB-compiled metrics, render a gorgeous structured table
    if (report.metrics) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Clinic Operational & Financial Indicators', 14, 55);
      doc.line(14, 58, w - 14, 58);

      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Key Indicator Description', 16, 64);
      doc.text('Database Record Value', w - 16, 64, { align: 'right' });
      doc.line(14, 67, w - 14, 67);

      let y = 74;
      const rows = [
        { label: 'Total Registered Clinic Patients', val: `${report.metrics.totalPatients} Patients` },
        { label: 'Active Medical Staff (Doctors)', val: `${report.metrics.activeDoctors} Doctors` },
        { label: 'Total Consultations Booked', val: `${report.metrics.totalAppts} Slots` },
        { label: 'Successfully Completed Consultations', val: `${report.metrics.completedAppts} Completed` },
        { label: 'Total Collected Invoiced Revenue', val: `${report.metrics.revenue.toLocaleString()} MAD` }
      ];

      rows.forEach(r => {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(r.label, 16, y);
        doc.setFont('helvetica', 'normal');
        doc.text(r.val, w - 16, y, { align: 'right' });
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 3, w - 14, y + 3);
        y += 9;
      });
      
      doc.setFontSize(9); doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.text(`Electronically compiled from database at ${report.metrics.generatedAt || report.date}.`, 14, y + 8);
    } else {
      // General description layout
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(report.description, w - 28);
      doc.text(lines, 14, 55);
    }

    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('MediSync · Healthcare Management Platform · © 2026', w / 2, ph - 10, { align: 'center' });

    return doc;
  }
}
