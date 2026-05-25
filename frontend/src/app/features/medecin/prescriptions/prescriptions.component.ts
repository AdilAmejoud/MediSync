import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';

@Component({
  selector: 'ms-medecin-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DataTableComponent, ModalComponent, DocumentViewerComponent],
  templateUrl: './prescriptions.component.html',
  styleUrl: './prescriptions.component.scss'
})
export class PrescriptionsComponent implements OnInit {
  prescriptions: any[] = [];
  loading = false;
  showAddPanel = false;
  selectedPatient = '';
  typedMedication = '';
  medicationsList: string[] = [];
  dosage = '5mg';
  frequency = 'Once daily';
  duration = '30';
  instructions = '';
  notes = '';

  columns: TableColumn[] = [
    { key: 'patient', label: 'Patient', type: 'avatar', subtitleKey: 'patId' },
    { key: 'date', label: 'Date Issued' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'actions', label: 'Actions', type: 'actions' }
  ];

  showPrescriptionViewer = false;
  prescriptionViewerData: Uint8Array | null = null;
  prescriptionViewerTitle = '';
  selectedPrescriptionRow: any = null;

  patientsCatalog: { id: string; name: string }[] = [];
  doctorId = '';
  doctorName = '';
  doctorSpecialty = '';

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private auth: AuthService,
    private pdf: PdfService
  ) {}

  ngOnInit() {
    this.loadPrescriptions();
    this.loadPatients();
    this.loadDoctorProfile();
  }

  loadDoctorProfile() {
    this.http.get<any>(`${environment.apiUrl}/auth/profile`).subscribe({
      next: (res) => {
        if (res.success && res.user?.doctor) {
          this.doctorId = res.user.doctor.id;
          this.doctorName = res.user.name;
          this.doctorSpecialty = res.user.doctor.specialty;
        }
      }
    });
  }

  loadPatients() {
    this.http.get<any>(`${environment.apiUrl}/patients`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.patientsCatalog = res.data.map((p: any) => ({ id: p.id, name: p.name }));
        }
      }
    });
  }

  loadPrescriptions() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/prescriptions`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.prescriptions = res.data.map((p: any) => ({
            id: p.id,
            patient: p.patientName,
            patId: '',
            date: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            meds: Array.isArray(p.medications) ? p.medications : [],
            medicationsDetail: p.medications,
            instructions: p.instructions || '',
            patientName: p.patientName,
            status: p.isActive ? 'Active' : 'Expired'
          }));
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  toggleAddPanel() {
    this.showAddPanel = !this.showAddPanel;
  }

  addMedication() {
    if (this.typedMedication.trim()) {
      this.medicationsList.push(this.typedMedication.trim());
      this.typedMedication = '';
    }
  }

  removeMedication(index: number) {
    this.medicationsList = this.medicationsList.filter((_, idx) => idx !== index);
  }

  onSavePrescription() {
    if (this.medicationsList.length === 0) return;
    const patient = this.patientsCatalog.find(p => this.selectedPatient.includes(p.name));

    this.http.post(`${environment.apiUrl}/prescriptions`, {
      patientId: patient?.id || '',
      doctorId: this.doctorId,
      medications: this.medicationsList.map(m => ({ name: m, dosage: this.dosage, frequency: this.frequency, duration: this.duration })),
      instructions: this.instructions,
      notes: this.notes
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Prescription created successfully!", "Success");
          this.showAddPanel = false;
          this.medicationsList = [];
          this.selectedPatient = '';
          this.instructions = '';
          this.notes = '';
          this.loadPrescriptions();
        } else {
          this.toastr.error(res.message || "Failed to create prescription");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  onActionClick(event: { action: string, row: any }) {
    if (event.action === 'delete') {
      this.http.delete(`${environment.apiUrl}/prescriptions/${event.row.id}`).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.toastr.success("Prescription deleted", "Success");
            this.loadPrescriptions();
          } else {
            this.toastr.error(res.message || "Failed to delete");
          }
        },
        error: (err) => this.toastr.error(err.error?.message || "Server error")
      });
    }
    if (event.action === 'view') {
      this.viewPrescription(event.row);
    }
    if (event.action === 'download') {
      this.downloadPrescription(event.row);
    }
  }

  private viewPrescription(r: any) {
    this.selectedPrescriptionRow = r;
    const meds = (r.medicationsDetail || r.meds || []).map((m: any) => ({
      name: typeof m === 'string' ? m : (m.name || ''),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
    }));
    this.prescriptionViewerData = this.pdf.generatePrescriptionArray({
      doctorName: this.doctorName,
      specialty: this.doctorSpecialty,
      patientName: r.patientName || r.patient,
      date: r.date || new Date().toLocaleDateString('en-CA'),
      medications: meds,
      instructions: r.instructions || '',
    });
    this.prescriptionViewerTitle = `Prescription - ${r.patientName || r.patient}`;
    this.showPrescriptionViewer = true;
  }

  downloadViewedPrescription() {
    if (this.selectedPrescriptionRow) {
      this.downloadPrescription(this.selectedPrescriptionRow);
    }
  }

  closePrescriptionViewer() {
    this.showPrescriptionViewer = false;
    this.prescriptionViewerData = null;
    this.selectedPrescriptionRow = null;
  }

  private downloadPrescription(r: any) {
    const meds = (r.medicationsDetail || r.meds || []).map((m: any) => ({
      name: typeof m === 'string' ? m : (m.name || ''),
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
    }));
    this.pdf.generatePrescription({
      doctorName: this.doctorName,
      specialty: this.doctorSpecialty,
      patientName: r.patientName || r.patient,
      date: r.date || new Date().toLocaleDateString('en-CA'),
      medications: meds,
      instructions: r.instructions || '',
    });
  }
}
