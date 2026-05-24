import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatsService } from '../../../core/services/stats.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';

import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'ms-patient-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, NgIconComponent, RouterLink, ModalComponent, DocumentViewerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  error = signal('');

  patientName = '';
  patientId = '';

  stats: any = null;
  vitals: any = {};
  nextAppointment: any = null;
  recentAppointments: any[] = [];
  documents: any[] = [];
  activePrescriptions = 0;
  myDoctors: any[] = [];
  recentActivities: any[] = [];

  showDetailsModal = false;
  selectedApptDetails: any = null;

  showQRScanner = signal(false);
  qrScanResult = signal('');
  qrScanning = signal(false);
  qrErrorMessage = signal('');
  qrSuccessMessage = signal('');
  private html5QrCode: any = null;

  vitalsLabels = [
    { label: 'Weight', key: 'weight', suffix: ' Kg' },
    { label: 'Height', key: 'height', suffix: ' cm' },
    { label: 'BMI Index', key: 'bmi', suffix: '' },
    { label: 'Pulse', key: 'pulse', suffix: ' %' },
    { label: 'SPO2 (Oxygen)', key: 'spo2', suffix: ' %' },
    { label: 'Temperature', key: 'temperature', suffix: ' °C' },
    { label: 'Heart Rate', key: 'heartRate', suffix: ' bpm' }
  ];

  constructor(
    private statsService: StatsService,
    private auth: AuthService,
    private http: HttpClient,
    private socket: SocketService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    this.patientName = user?.name || 'Patient';
    this.patientId = user?.id ? `PT-${user.id.slice(-4).toUpperCase()}` : '';

    this.loadStats(true);

    this.socket.on('medicalFolderUpdated', (payload: any) => {
      // Reload stats silently or with loader
      this.loadStats(false);
    });
  }

  loadStats(showLoader: boolean = true) {
    if (showLoader) {
      this.loading.set(true);
    }
    this.statsService.getPatientStats().subscribe({
      next: (res) => {
        this.stats = res.data.stats;
        this.vitals = res.data.vitals || {};
        this.nextAppointment = res.data.nextAppointment;
        this.recentAppointments = res.data.recentAppointments || [];
        this.documents = res.data.documents || [];
        this.activePrescriptions = res.data.stats?.activePrescriptions ?? 0;
        this.myDoctors = res.data.myDoctors || [];
        this.recentActivities = res.data.recentActivities || [];
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load statistics');
        this.loading.set(false);
      }
    });
  }

  getVitalDisplay(key: string): string {
    const val = this.vitals[key];
    if (val === null || val === undefined) return '--';
    const item = this.vitalsLabels.find(v => v.key === key);
    return val + (item?.suffix || '');
  }

  getVitalStatus(key: string): string {
    const val = this.vitals[key];
    if (val === null || val === undefined) return '--';
    const statusMap: Record<string, string> = {
      weight: 'Stable', height: 'Verified', bmi: 'Normal',
      pulse: 'Regular', spo2: 'Excellent', temperature: 'Normal', heartRate: 'Healthy'
    };
    return statusMap[key] || 'OK';
  }

  getVitalBadgeClass(key: string): string {
    const val = this.vitals[key];
    if (val === null || val === undefined) return 'vital-badge';
    const infoKeys = ['height', 'pulse'];
    const warningKeys = ['temperature'];
    if (infoKeys.includes(key)) return 'vital-badge info';
    if (warningKeys.includes(key)) return 'vital-badge warning';
    return 'vital-badge success';
  }

  isPdf(doc: any): boolean {
    return (doc.fileType || '').includes('pdf') ||
           (doc.filename || '').toLowerCase().endsWith('.pdf');
  }

  getDocIconClass(doc: any): string {
    if (this.isPdf(doc)) return 'doc-icon doc-icon--pdf';
    return 'doc-icon doc-icon--image';
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  viewDetails(appt: any) {
    if (!appt) return;
    
    let statusStr = 'Pending';
    const s = appt.status?.toUpperCase();
    if (s === 'CONFIRMED' || s === 'RESCHEDULED' || s === 'UPCOMING') {
      statusStr = 'Upcoming';
    } else if (s === 'COMPLETED') {
      statusStr = 'Completed';
    } else if (s === 'CANCELLED') {
      statusStr = 'Cancelled';
    } else if (s === 'PENDING') {
      statusStr = 'Pending';
    }

    this.selectedApptDetails = {
      id: appt.id,
      doctorName: appt.doctorName,
      doctorSpecialty: appt.specialty || 'General Practitioner',
      date: appt.date,
      type: appt.type || 'General Visit',
      mode: appt.mode || 'In-Person',
      fee: appt.fee || 300,
      notes: appt.notes || '',
      status: statusStr
    };
    this.showDetailsModal = true;
  }

  ngOnDestroy() {
    this.stopScanner();
    this.socket.off('medicalFolderUpdated');
  }

  async openScanner() {
    this.showQRScanner.set(true);
    this.qrScanResult.set('');
    this.qrErrorMessage.set('');
    this.qrSuccessMessage.set('');
    this.qrScanning.set(true);

    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader');
        this.html5QrCode = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop();
            this.qrScanning.set(false);
            this.qrScanResult.set(decodedText);
            this.processCheckIn(decodedText);
          },
          () => {}
        );
      } catch {
        this.qrErrorMessage.set('Camera access denied or not available');
        this.qrScanning.set(false);
      }
    }, 300);
  }

  closeScanner() {
    this.stopScanner();
    this.showQRScanner.set(false);
  }

  private stopScanner() {
    if (this.html5QrCode) {
      try { this.html5QrCode.stop(); } catch {}
      try { this.html5QrCode.clear(); } catch {}
      this.html5QrCode = null;
    }
  }

  showDocViewer = false;
  docViewerData: Uint8Array | null = null;
  docViewerTitle = '';

  viewDashboardDocument(doc: any) {
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'arraybuffer' }).subscribe({
      next: (data) => {
        this.docViewerData = new Uint8Array(data);
        this.docViewerTitle = doc.filename;
        this.showDocViewer = true;
      },
      error: () => {
        const a = document.createElement('a');
        a.href = `${environment.apiUrl}/documents/${doc.id}/download`;
        a.download = doc.filename;
        a.click();
      }
    });
  }

  downloadDashboardDocument(doc: any) {
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  closeDocViewer() {
    this.showDocViewer = false;
    this.docViewerData = null;
  }

  getDocForViewer(): any {
    return this.documents.find(d => d.filename === this.docViewerTitle) || this.documents[0];
  }

  private processCheckIn(decodedText: string) {
    let clinicId: string;
    try {
      const parsed = JSON.parse(decodedText);
      clinicId = parsed.clinicId;
    } catch {
      clinicId = decodedText;
    }

    this.http.post<any>(`${environment.apiUrl}/appointments/check-in`, { clinicId }).subscribe({
      next: (res) => {
        if (res.success) {
          this.qrSuccessMessage.set(res.message || 'Check-in successful!');
          this.qrErrorMessage.set('');
        } else {
          this.qrErrorMessage.set(res.message || 'Check-in failed');
        }
      },
      error: (err) => {
        this.qrErrorMessage.set(err.error?.message || 'Server error, please try again');
      }
    });
  }
}
