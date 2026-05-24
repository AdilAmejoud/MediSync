import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { PdfService } from '../../../core/services/pdf.service';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';

@Component({
  selector: 'ms-patient-prescriptions',
  standalone: true,
  imports: [CommonModule, DataTableComponent, DocumentViewerComponent],
  templateUrl: './prescriptions.component.html',
  styleUrl: './prescriptions.component.scss'
})
export class PrescriptionsComponent implements OnInit {
  columns: TableColumn[] = [
    { key: 'doctor', label: 'Doctor' },
    { key: 'date', label: 'Issued Date' },
    { key: 'meds', label: 'Medications' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'actions', label: 'Actions', type: 'actions' }
  ];

  prescriptions: any[] = [];
  loading = false;

  showPrescriptionViewer = false;
  prescriptionViewerData: Uint8Array | null = null;
  prescriptionViewerTitle = '';
  selectedPrescriptionRow: any = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private pdf: PdfService
  ) {}

  ngOnInit() {
    this.loadPrescriptions();
  }

  loadPrescriptions() {
    this.loading = true;
    const userName = this.auth.currentUser()?.name || '';
    this.http.get<any>(`${environment.apiUrl}/prescriptions`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.prescriptions = res.data
            .filter((p: any) => p.patientName === userName)
            .map((p: any) => ({
              id: p.id,
              doctor: p.doctorName,
              specialty: p.specialty || 'General Medicine',
              patientName: p.patientName,
              date: new Date(p.createdAt).toISOString().split('T')[0],
              meds: Array.isArray(p.medications) 
                ? p.medications.map((m: any) => m.name || m).join(', ') 
                : '',
              medicationsDetail: p.medications,
              instructions: p.instructions || '',
              status: p.isActive ? 'Active' : 'Expired'
            }));
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onActionClick(event: { action: string, row: any }) {
    if (event.action === 'download') {
      this.downloadPrescription(event.row);
    }
    if (event.action === 'view') {
      this.viewPrescription(event.row);
    }
  }

  private viewPrescription(r: any) {
    this.selectedPrescriptionRow = r;
    const meds = (r.medicationsDetail || []).map((m: any) => ({
      name: typeof m === 'string' ? m : (m.name || ''),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
    }));
    this.prescriptionViewerData = this.pdf.generatePrescriptionArray({
      doctorName: r.doctor,
      specialty: r.specialty,
      patientName: r.patientName,
      date: r.date,
      medications: meds,
      instructions: r.instructions,
    });
    this.prescriptionViewerTitle = `Prescription - ${r.patientName}`;
    this.showPrescriptionViewer = true;
  }

  downloadViewedPrescription() {
    if (this.selectedPrescriptionRow) {
      this.downloadPrescription(this.selectedPrescriptionRow);
    }
  }

  private downloadPrescription(r: any) {
    const meds = (r.medicationsDetail || []).map((m: any) => ({
      name: typeof m === 'string' ? m : (m.name || ''),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
    }));
    this.pdf.generatePrescription({
      doctorName: r.doctor,
      specialty: r.specialty,
      patientName: r.patientName,
      date: r.date,
      medications: meds,
      instructions: r.instructions,
    });
  }

  closePrescriptionViewer() {
    this.showPrescriptionViewer = false;
    this.prescriptionViewerData = null;
  }
}
