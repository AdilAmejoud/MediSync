import {
  Component, OnInit, OnDestroy, signal
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';

type ActiveTab = 'overview' | 'consultations' | 'documents';

interface VitalCard {
  key: string;
  label: string;
  suffix: string;
}

interface ConsultationEntry {
  date: string;
  doctor: string;
  type: string;
  notes: string;
  status: string;
}

interface MedicalDocument {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string | Date;
  filepath?: string;
}

@Component({
  selector: 'ms-patient-medical-folder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, DocumentViewerComponent],
  templateUrl: './medical-folder.component.html',
  styleUrl: './medical-folder.component.scss',
  providers: [DatePipe]
})
export class MedicalFolderComponent implements OnInit, OnDestroy {

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('overview');

  readonly tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview',       label: 'Overview'       },
    { key: 'consultations',  label: 'Consultations'  },
    { key: 'documents',      label: 'Documents'      },
  ];

  // ── Patient profile ────────────────────────────────────────────────────────
  patientData = signal<any>(null);
  patientName  = '';
  patientAge   = 0;
  patientInitials = '';
  bloodType    = '';
  allergies: string[] = [];
  conditions:  string[] = [];

  // ── Vitals ─────────────────────────────────────────────────────────────────
  vitalsRaw: Record<string, number | null> = {};

  readonly vitalCards: VitalCard[] = [
    { key: 'weight',      label: 'Weight',      suffix: 'Kg'  },
    { key: 'height',      label: 'Height',      suffix: 'cm'  },
    { key: 'bmi',         label: 'BMI',         suffix: ''    },
    { key: 'pulse',       label: 'Pulse',       suffix: 'bpm' },
    { key: 'spo2',        label: 'SPO2',        suffix: '%'   },
    { key: 'temperature', label: 'Temperature', suffix: '°C'  },
    { key: 'heartRate',   label: 'Heart Rate',  suffix: 'bpm' },
  ];

  // ── Consultations ──────────────────────────────────────────────────────────
  consultations: ConsultationEntry[] = [];

  // ── Documents ──────────────────────────────────────────────────────────────
  documents = signal<MedicalDocument[]>([]);
  sortOrder: 'newest' | 'oldest' | 'name' = 'newest';
  loading = signal(false);

  // ── Document viewer ───────────────────────────────────────────────────────
  showDocViewer  = false;
  docViewerData: Uint8Array | null = null;
  docViewerTitle = '';
  selectedDoc: MedicalDocument | null = null;

  // ── Upload state ──────────────────────────────────────────────────────────
  isDragOver  = signal(false);
  isUploading = signal(false);
  uploadError = signal('');

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private socket: SocketService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    this.patientName    = user?.name || 'Patient';
    this.patientInitials = this.getInitials(this.patientName);
    this.loadPatientProfile();

    this.socket.on('medicalFolderUpdated', (payload: any) => {
      const myId = this.patientData()?.id;
      if (!payload?.patientId || payload.patientId === myId) {
        this.loadDocuments(myId);
      }
    });
  }

  ngOnDestroy() {
    this.socket.off('medicalFolderUpdated');
  }

  // ── Tab navigation ────────────────────────────────────────────────────────
  setTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }

  // ── Data loaders ──────────────────────────────────────────────────────────
  loadPatientProfile() {
    this.loading.set(true);
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.loading.set(false); return; }

    this.http.get<any>(`${environment.apiUrl}/patients/${userId}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          this.patientData.set(d);
          this.bloodType  = d.bloodType || '';
          this.allergies  = d.allergies || [];
          this.conditions = d.conditions || [];

          this.vitalsRaw = {
            weight: d.weight ?? null,
            height: d.height ?? null,
            bmi:    d.bmi    ?? null,
            pulse:  d.pulse  ?? null,
            spo2:   d.spo2   ?? null,
            temperature: d.temperature ?? null,
            heartRate:   d.heartRate   ?? null,
          };

          if (d.dateOfBirth) {
            this.patientAge = Math.floor(
              (Date.now() - new Date(d.dateOfBirth).getTime()) / 31_557_600_000
            );
          }

          this.consultations = (d.appointments || [])
            .filter((a: any) => a.status === 'COMPLETED')
            .map((a: any) => ({
              date:   a.date,
              doctor: a.doctor || 'Unknown Doctor',
              type:   a.type   || 'General Visit',
              notes:  a.notes  || 'No notes recorded.',
              status: a.status,
            }));

          this.loadDocuments(d.id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadDocuments(patientId?: string) {
    const pid = patientId || this.patientData()?.id;
    const url = pid
      ? `${environment.apiUrl}/documents?patientId=${pid}`
      : `${environment.apiUrl}/documents`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const userName = this.auth.currentUser()?.name || '';
          let docs: MedicalDocument[] = res.data.filter(
            (d: any) => d.patientId === pid || d.patientName === userName
          );
          this.documents.set(this.sortDocs(docs));
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getVitalValue(key: string): string {
    const val = this.vitalsRaw[key];
    if (val === null || val === undefined) return '—';
    const card = this.vitalCards.find(c => c.key === key);
    return `${val}${card?.suffix ? ' ' + card.suffix : ''}`;
  }

  get sortedDocuments(): MedicalDocument[] {
    return this.documents();
  }

  onSortChange(order: string) {
    this.sortOrder = order as 'newest' | 'oldest' | 'name';
    this.documents.update(docs => this.sortDocs([...docs]));
  }

  private sortDocs(docs: MedicalDocument[]): MedicalDocument[] {
    switch (this.sortOrder) {
      case 'oldest': return docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'name':   return docs.sort((a, b) => a.filename.localeCompare(b.filename));
      default:       return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  onZoneDragOver(e: DragEvent)  { e.preventDefault(); this.isDragOver.set(true);  }
  onZoneDragLeave(e: DragEvent) { e.preventDefault(); this.isDragOver.set(false); }

  onZoneDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  triggerUpload() {
    if (this.isUploading()) return;
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.dcm,.dicom';
    input.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) this.uploadFile(f); };
    input.click();
  }

  private uploadFile(file: File) {
    const MAX = 20 * 1024 * 1024;
    if (file.size > MAX) { this.uploadError.set('File too large. Max 20 MB.'); return; }

    const allowed = ['application/pdf','image/jpeg','image/jpg','image/png','image/gif','application/dicom'];
    const isDicom  = file.name.toLowerCase().endsWith('.dcm') || file.name.toLowerCase().endsWith('.dicom');
    if (!allowed.includes(file.type) && !isDicom) {
      this.uploadError.set('Unsupported type. Use PDF, JPG, PNG, or DICOM.');
      return;
    }

    this.uploadError.set('');
    this.isUploading.set(true);

    const fd = new FormData();
    fd.append('file', file);

    this.http.post<any>(`${environment.apiUrl}/documents/upload`, fd).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success) this.loadDocuments(this.patientData()?.id);
        else this.uploadError.set(res.message || 'Upload failed.');
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(err?.error?.message || 'Upload failed.');
      }
    });
  }

  // ── Document viewer ───────────────────────────────────────────────────────
  viewDocument(doc: MedicalDocument) {
    this.selectedDoc = doc;
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'arraybuffer' }).subscribe({
      next: (data) => { this.docViewerData = new Uint8Array(data); this.docViewerTitle = doc.filename; this.showDocViewer = true; },
      error: () => { if (doc.filepath) window.open(doc.filepath, '_blank'); }
    });
  }

  downloadDocument(doc: MedicalDocument) {
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.filename; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { if (doc.filepath) { const a = document.createElement('a'); a.href = doc.filepath; a.download = doc.filename; a.click(); } }
    });
  }

  closeDocViewer() { this.showDocViewer = false; this.docViewerData = null; this.selectedDoc = null; }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('');
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  getFileIconType(doc: MedicalDocument): 'pdf' | 'image' | 'dicom' {
    const t = (doc.fileType || '').toLowerCase();
    const n = (doc.filename  || '').toLowerCase();
    if (t.includes('pdf')   || n.endsWith('.pdf'))             return 'pdf';
    if (t.includes('dicom') || n.endsWith('.dcm') || n.endsWith('.dicom')) return 'dicom';
    return 'image';
  }

  formatDocDate(date: string | Date): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '—';
  }
}
