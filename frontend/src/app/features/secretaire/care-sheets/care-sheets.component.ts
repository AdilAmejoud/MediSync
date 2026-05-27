import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastrService } from 'ngx-toastr';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';
import jsPDF from 'jspdf';

type StatusTab = 'All' | 'Submitted' | 'Draft' | 'Reimbursed';

interface CareSheet {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  date: string;
  actsCount: number;
  insuranceName: string;
  status: 'Submitted' | 'Draft' | 'Reimbursed';
}

interface ActCatalogItem {
  name: string;
  code: string;
  fee: number;
}

interface PatientCatalogItem {
  id: string;
  patientCode: string;
  name: string;
}

interface ActLine {
  name: string;
  code: string;
  fee: number;
}

@Component({
  selector: 'ms-secretary-care-sheets',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent, DatePickerComponent, DocumentViewerComponent],
  templateUrl: './care-sheets.component.html',
  styleUrl: './care-sheets.component.scss'
})
export class CareSheetsComponent implements OnInit {
  careSheets: CareSheet[] = [];
  loading = false;

  actCatalog: ActCatalogItem[] = [
    { name: "Consultation Général", code: "C-11", fee: 250 },
    { name: "Electrocardiographie", code: "ECG-5", fee: 400 },
    { name: "Radiographie Thoracique", code: "RAD-12", fee: 320 },
    { name: "Injections Intraveineuses", code: "INJ-3", fee: 100 },
    { name: "Prélèvement Sanguin", code: "LAB-2", fee: 80 }
  ];

  patientsCatalog: PatientCatalogItem[] = [];

  doctorOptions: string[] = [];
  doctorsCatalog: { id: string; name: string }[] = [];

  // ─── Filters ───────────────────────────────────────────
  statusTabs: StatusTab[] = ['All', 'Submitted', 'Draft', 'Reimbursed'];
  activeStatusTab: StatusTab = 'All';
  searchQuery = '';
  dateFilter = '';

  // ─── Side drawer visibility ────────────────────────────
  showSheetPanel = false;

  // ─── Form states ───────────────────────────────────────
  patientSearch = '';
  selectedPatientId = '';
  selectedPatientName = '';
  showPatientResults = false;
  selectedDoctor = '';
  consultationDate = '2026-05-23';
  insuranceProvider = 'CNOPS';
  policyNumber = '';
  hasSignature = false;

  // ─── Medical acts line items ───────────────────────────
  actsList: ActLine[] = [
    { name: this.actCatalog[0].name, code: this.actCatalog[0].code, fee: this.actCatalog[0].fee }
  ];

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadCareSheets();
    this.loadDoctors();
    this.loadPatients();
  }

  // ─── Data Loading ────────────────────────────────────────

  loadCareSheets() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/care-sheets`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.careSheets = res.data;
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

  // ─── Stats Getters ─────────────────────────────────────

  get totalCount(): number {
    return this.careSheets.length;
  }

  get submittedCount(): number {
    return this.careSheets.filter(cs => cs.status === 'Submitted').length;
  }

  get draftCount(): number {
    return this.careSheets.filter(cs => cs.status === 'Draft').length;
  }

  get reimbursedCount(): number {
    return this.careSheets.filter(cs => cs.status === 'Reimbursed').length;
  }

  // ─── Tab & Filter ─────────────────────────────────────

  setStatusTab(tab: StatusTab) {
    this.activeStatusTab = tab;
  }

  get filteredSheets(): CareSheet[] {
    return this.careSheets.filter(cs => {
      const matchesTab = this.activeStatusTab === 'All' || cs.status === this.activeStatusTab;
      const matchesSearch = !this.searchQuery ||
        cs.patientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cs.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cs.insuranceName.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesDate = !this.dateFilter || cs.date === this.dateFilter;
      return matchesTab && matchesSearch && matchesDate;
    });
  }

  // ─── Status Mutation ──────────────────────────────────

  submitCareSheet(id: string) {
    this.http.put(`${environment.apiUrl}/care-sheets/${id}`, { status: 'Submitted' }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.careSheets = this.careSheets.map(cs =>
            cs.id === id ? { ...cs, status: 'Submitted' as const } : cs
          );
          this.toastr.success('Care sheet submitted to insurance provider', 'Submitted');
        } else {
          this.toastr.error(res.message || 'Failed to submit care sheet');
        }
      },
      error: (err) => this.toastr.error(err.error?.message || 'Server error')
    });
  }

  // ─── Create Care Sheet ────────────────────────────────

  handlePatientSelect(p: PatientCatalogItem) {
    this.selectedPatientId = p.id;
    this.selectedPatientName = p.name;
    this.patientSearch = `${p.name} (${p.patientCode})`;
    this.showPatientResults = false;
  }

  handleAddActLine() {
    this.actsList = [
      ...this.actsList,
      { name: this.actCatalog[0].name, code: this.actCatalog[0].code, fee: this.actCatalog[0].fee }
    ];
  }

  handleRemoveActLine(idx: number) {
    if (this.actsList.length === 1) return;
    this.actsList = this.actsList.filter((_, i) => i !== idx);
  }

  handleActChange(idx: number, actName: string) {
    const matched = this.actCatalog.find(a => a.name === actName);
    const updated = [...this.actsList];
    updated[idx] = { 
      name: actName, 
      code: matched ? matched.code : 'C-10', 
      fee: matched ? matched.fee : 250 
    };
    this.actsList = updated;
  }

  get totalFee(): number {
    return this.actsList.reduce((curr, act) => curr + act.fee, 0);
  }

  handleCreateCareSheet(status: 'Submitted' | 'Draft') {
    if (!this.selectedPatientId) {
      alert("Please select an active patient registry from the matching autocomplete dropdown first.");
      return;
    }

    const doctor = this.doctorsCatalog.find(d => d.name === this.selectedDoctor);

    this.http.post(`${environment.apiUrl}/care-sheets`, {
      patientId: this.selectedPatientId,
      doctorId: doctor?.id || '',
      consultationDate: this.consultationDate,
      medicalActs: this.actsList,
      insuranceProvider: this.insuranceProvider,
      policyNumber: this.policyNumber,
      totalAmount: this.totalFee,
      status
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(`Care sheet created successfully! Status: ${status}`, "Success");
          this.showSheetPanel = false;
          this.selectedPatientId = '';
          this.selectedPatientName = '';
          this.patientSearch = '';
          this.policyNumber = '';
          this.actsList = [{ name: this.actCatalog[0].name, code: this.actCatalog[0].code, fee: this.actCatalog[0].fee }];
          this.hasSignature = false;
          this.loadCareSheets();
        } else {
          this.toastr.error(res.message || "Failed to create care sheet");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  toggleSignature() {
    this.hasSignature = !this.hasSignature;
  }

  // ─── PDF Viewer ──────────────────────────────────────────

  showCareSheetViewer = false;
  careSheetViewerData: Uint8Array | null = null;
  careSheetViewerTitle = '';
  selectedCareSheet: CareSheet | null = null;

  viewCareSheet(cs: CareSheet) {
    this.selectedCareSheet = cs;
    this.careSheetViewerData = this.generateCareSheetArray(cs);
    this.careSheetViewerTitle = `Care Sheet - ${cs.patientName}`;
    this.showCareSheetViewer = true;
  }

  downloadViewedCareSheet() {
    if (this.selectedCareSheet) {
      const doc = this.buildCareSheetDoc(this.selectedCareSheet);
      doc.save(`care_sheet_${this.selectedCareSheet.id}.pdf`);
    }
  }

  closeCareSheetViewer() {
    this.showCareSheetViewer = false;
    this.careSheetViewerData = null;
    this.selectedCareSheet = null;
  }

  private generateCareSheetArray(cs: CareSheet): Uint8Array {
    const doc = this.buildCareSheetDoc(cs);
    return new Uint8Array(doc.output('arraybuffer'));
  }

  private buildCareSheetDoc(cs: CareSheet): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MediSync', 14, 12);
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text('Feuille de Soins', 14, 20);
    doc.text(`#${cs.id}`, w - 14, 12, { align: 'right' });
    doc.text(cs.date, w - 14, 20, { align: 'right' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('Patient:', 14, 40);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(cs.patientName, 35, 40);
    doc.text(`Patient ID: ${cs.patientId}`, 35, 47);

    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('Doctor:', 14, 56);
    doc.setFont('helvetica','normal');
    doc.text(cs.doctorName, 35, 56);

    doc.setFont('helvetica','bold');
    doc.text('Insurance:', 14, 64);
    doc.setFont('helvetica','normal');
    doc.text(cs.insuranceName, 35, 64);

    doc.text(`Medical Acts: ${cs.actsCount}`, 14, 72);
    doc.line(14, 77, w - 14, 77);

    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Status:', 14, 86);
    doc.setFont('helvetica','normal');
    doc.text(cs.status, 30, 86);

    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8); doc.setTextColor(156, 163, 180);
    doc.text('MediSync · Healthcare Management Platform · © 2026', w / 2, ph - 10, { align: 'center' });

    return doc;
  }

  get filteredPatientsSuggestions(): PatientCatalogItem[] {
    return this.patientsCatalog.filter(p => 
      p.name.toLowerCase().includes(this.patientSearch.toLowerCase()) || 
      p.id.toLowerCase().includes(this.patientSearch.toLowerCase())
    );
  }
}
