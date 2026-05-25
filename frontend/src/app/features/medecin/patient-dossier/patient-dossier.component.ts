import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ToastrService } from 'ngx-toastr';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';
import { SocketService } from '../../../core/services/socket.service';

interface Allergy {
  allergen: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
}

interface Pathology {
  name: string;
  since: string;
}

interface VitalSigns {
  weight: string;
  height: string;
  bmi: string;
  bloodPressure: string;
}

interface Consultation {
  date: string;
  doctor: string;
  diagnosis: string;
  notes: string;
}

interface DossierDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  filepath?: string;
}

type DossierTab = 'overview' | 'consultations' | 'prescriptions' | 'documents';

interface PrescriptionItem {
  id: string;
  patientName: string;
  doctorName: string;
  doctorId: string;
  specialty: string;
  medications: { name: string; dosage?: string; frequency?: string; duration?: string }[];
  instructions: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'ms-patient-dossier',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent, DocumentViewerComponent],
  templateUrl: './patient-dossier.component.html',
  styleUrl: './patient-dossier.component.scss'
})
export class PatientDossierComponent implements OnInit, OnDestroy {
  patient = signal<any>(null);
  allergies = signal<Allergy[]>([]);
  pathologies = signal<Pathology[]>([]);
  vitals = signal<VitalSigns | null>(null);
  consultations = signal<Consultation[]>([]);
  documents = signal<DossierDocument[]>([]);
  prescriptions = signal<PrescriptionItem[]>([]);
  loading = signal(true);

  activeDossierTab = signal<DossierTab>('overview');
  dossierTabs: { key: DossierTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'consultations', label: 'Consultations' },
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'documents', label: 'Documents' },
  ];

  doctorId = '';
  patientId = '';
  prescriptionMedications = '';
  prescriptionInstructions = '';
  prescriptionNotes = '';

  showPrescriptionViewer = signal(false);
  viewedPrescription = signal<PrescriptionItem | null>(null);

  showDocViewer = false;
  docViewerData: Uint8Array | null = null;
  docViewerTitle = '';
  selectedDoc: DossierDocument | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.patientId = id;
      this.loadDoctorProfile();
      this.loadPatientData(id);
      this.loadPrescriptions();
    }

    // Real-time: auto-refresh when patient uploads a doc or updates vitals
    this.socketService.on('medicalFolderUpdated', (payload: any) => {
      if (payload?.patientId === this.patientId) {
        this.loadPatientData(this.patientId);
        this.toastr.info('Medical folder updated by patient', 'Live Update', { timeOut: 3000 });
      }
    });
  }

  ngOnDestroy() {
    this.socketService.off('medicalFolderUpdated');
  }

  private loadDoctorProfile() {
    this.http.get<any>(`${environment.apiUrl}/auth/profile`).subscribe({
      next: (res) => {
        if (res.success && res.user?.doctor) {
          this.doctorId = res.user.doctor.id;
        }
      }
    });
  }

  private loadPatientData(id: string) {
    this.loading.set(true);

    this.http.get<any>(`${environment.apiUrl}/patients/${id}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          this.patient.set(d);
          this.mapMedicalData(d);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load patient data');
        this.loading.set(false);
      }
    });
  }

  private loadPrescriptions() {
    this.http.get<any>(`${environment.apiUrl}/prescriptions`, {
      params: { patientId: this.patientId }
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.prescriptions.set(res.data);
        }
      }
    });
  }

  private mapMedicalData(d: any) {
    this.allergies.set(
      (d.allergies || []).map((a: string) => ({
        allergen: a,
        severity: 'Moderate' as const
      }))
    );

    this.pathologies.set(
      (d.conditions || []).map((c: string) => ({
        name: c,
        since: 'Ongoing'
      }))
    );

    this.vitals.set({
      weight: d.weight ? `${d.weight} kg` : '\u2014',
      height: d.height ? `${d.height} cm` : '\u2014',
      bmi: d.bmi ? `${d.bmi}` : '\u2014',
      bloodPressure: '\u2014'
    });

    this.consultations.set(
      (d.appointments || [])
        .filter((a: any) => a.status === 'COMPLETED')
        .map((a: any) => ({
          date: this.formatDate(a.date),
          doctor: a.doctor || 'Unknown',
          diagnosis: a.type || 'General Visit',
          notes: a.notes || 'No notes recorded'
        }))
    );

    this.documents.set(
      (d.documents || []).map((doc: any) => ({
        id: doc.id,
        name: doc.filename,
        type: this.mimeToLabel(doc.fileType),
        date: this.formatDate(doc.createdAt),
        filepath: doc.filepath
      }))
    );
  }

  private formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private mimeToLabel(mime: string): string {
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('dicom') || mime.includes('dcm')) return 'DICOM';
    if (mime.includes('image')) return 'Image';
    if (mime.includes('word') || mime.includes('document')) return 'DOC';
    return mime.split('/').pop()?.toUpperCase() || 'File';
  }

  goBack() {
    this.router.navigate(['/medecin/patient-files']);
  }

  setDossierTab(tab: DossierTab) {
    this.activeDossierTab.set(tab);
  }

  submitPrescription() {
    if (!this.prescriptionMedications.trim()) {
      this.toastr.error('Please enter at least one medication');
      return;
    }

    const medications = this.prescriptionMedications
      .split('\n')
      .map(m => m.trim())
      .filter(m => m.length > 0)
      .map(m => ({ name: m, dosage: 'As directed', frequency: 'As prescribed' }));

    this.http.post(`${environment.apiUrl}/prescriptions`, {
      patientId: this.patient()?.id,
      doctorId: this.doctorId,
      medications,
      instructions: this.prescriptionInstructions,
      notes: this.prescriptionNotes
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success('Prescription issued successfully');
          this.prescriptionMedications = '';
          this.prescriptionInstructions = '';
          this.prescriptionNotes = '';
          this.loadPrescriptions();
        }
      },
      error: () => this.toastr.error('Failed to create prescription')
    });
  }

  viewPrescription(p: PrescriptionItem) {
    this.viewedPrescription.set(p);
    this.showPrescriptionViewer.set(true);
  }

  closePrescriptionViewer() {
    this.showPrescriptionViewer.set(false);
    this.viewedPrescription.set(null);
  }

  togglePrescriptionStatus(p: PrescriptionItem) {
    this.http.patch(`${environment.apiUrl}/prescriptions/${p.id}/toggle-status`, {}).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.prescriptions.update(list =>
            list.map(item =>
              item.id === p.id ? { ...item, isActive: res.data.isActive } : item
            )
          );
          this.toastr.success(`Prescription ${res.data.isActive ? 'activated' : 'expired'}`);
        }
      },
      error: () => this.toastr.error('Failed to update prescription status')
    });
  }

  formatPrescriptionDate(createdAt: string): string {
    if (!createdAt) return '\u2014';
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  triggerUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.uploadFile(file);
    };
    input.click();
  }

  private uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', this.patient()?.id || '');
    formData.append('uploadedBy', 'Doctor');

    this.http.post(`${environment.apiUrl}/documents`, formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success('Document uploaded successfully');
          const id = this.route.snapshot.paramMap.get('id');
          if (id) this.loadPatientData(id);
        }
      },
      error: () => this.toastr.error('Failed to upload document')
    });
  }

  viewDocument(doc: DossierDocument) {
    this.selectedDoc = doc;
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'arraybuffer' }).subscribe({
      next: (data) => {
        this.docViewerData = new Uint8Array(data);
        this.docViewerTitle = doc.name;
        this.showDocViewer = true;
      },
      error: () => {
        if (doc.filepath) {
          window.open(doc.filepath, '_blank');
        }
      }
    });
  }

  downloadDocument(doc: DossierDocument) {
    this.http.get(`${environment.apiUrl}/documents/${doc.id}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        if (doc.filepath) {
          const a = document.createElement('a');
          a.href = doc.filepath;
          a.download = doc.name;
          a.click();
        }
      }
    });
  }

  closeDocViewer() {
    this.showDocViewer = false;
    this.docViewerData = null;
    this.selectedDoc = null;
  }

  getAge(dob: string): number {
    if (!dob) return 0;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  }

  severityClass(severity: string): string {
    switch (severity) {
      case 'Severe': return 'badge--danger';
      case 'Moderate': return 'badge--warning';
      case 'Mild': return 'badge--info';
      default: return 'badge--neutral';
    }
  }
}
