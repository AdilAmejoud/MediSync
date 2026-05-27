import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ToastrService } from 'ngx-toastr';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

type TabFilter = 'All' | 'Confirmed' | 'Pending' | 'Cancelled';

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  specialty: string;
  dateTime: string;
  slotDate: string;
  slotTime: string;
  type: string;
  mode: string;
  status: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
}

interface PatientCatalogItem {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  booked: boolean;
}

@Component({
  selector: 'ms-secretary-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent, ModalComponent, DatePickerComponent],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  // ─── Data ─────────────────────────────────────────────────
  appointments = signal<Appointment[]>([]);
  loading = signal(false);
  private pollInterval: any;

  // ─── Filters ──────────────────────────────────────────────
  activeTab = signal<TabFilter>('All');
  searchQuery = signal('');
  doctorFilter = signal('');
  dateFilter = signal('');

  tabs: TabFilter[] = ['All', 'Confirmed', 'Pending', 'Cancelled'];

  // ─── Metrics ──────────────────────────────────────────────
  todayCount = computed(() => {
    const today = this.localDateStr(new Date());
    return this.appointments().filter(a =>
      a.slotDate === today && ['Confirmed', 'Pending', 'Checked-in'].includes(a.status)
    ).length;
  });

  pendingCount = computed(() =>
    this.appointments().filter(a => a.status === 'Pending').length
  );

  cancelledCount = computed(() =>
    this.appointments().filter(a => a.status === 'Cancelled').length
  );

  // ─── Filtered rows ────────────────────────────────────────
  filteredAppointments = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();
    const doctor = this.doctorFilter();
    const date = this.dateFilter();
    return this.appointments().filter(a => {
      const matchesSearch = !query ||
        a.patientName.toLowerCase().includes(query) ||
        a.patientId.toLowerCase().includes(query);
      const matchesTab = tab === 'All' || a.status === tab;
      const matchesDoctor = !doctor || a.doctorName === doctor;
      const matchesDate = !date || a.slotDate === date;
      return matchesSearch && matchesTab && matchesDoctor && matchesDate;
    });
  });

  // ─── Form State ───────────────────────────────────────────
  doctorOptions: DoctorOption[] = [];
  patientCatalog: PatientCatalogItem[] = [];

  showNewForm = signal(false);

  patientSearch = '';
  selectedPatient: PatientCatalogItem | null = null;
  showPatientResults = false;
  selectedDoctor = '';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedTimeSlot = '09:00';
  consultationType: 'General Visit' | 'Follow-up' | 'Emergency' | 'Specialist' = 'General Visit';
  mode: 'In-Person' | 'Online' = 'In-Person';
  notes = '';
  sendEmail = true;

  consultationTypes: ('General Visit' | 'Follow-up' | 'Emergency' | 'Specialist')[] =
    ['General Visit', 'Follow-up', 'Emergency', 'Specialist'];
  modes: ('In-Person' | 'Online')[] = ['In-Person', 'Online'];

  timeSlots: TimeSlot[] = [
    { time: '09:00', booked: false }, { time: '09:30', booked: false },
    { time: '10:00', booked: false }, { time: '10:30', booked: false },
    { time: '11:00', booked: false }, { time: '11:30', booked: false },
    { time: '14:00', booked: false }, { time: '14:30', booked: false },
    { time: '15:00', booked: false }, { time: '15:30', booked: false },
    { time: '16:00', booked: false }, { time: '16:30', booked: false }
  ];

  // ─── Reschedule Modal State ───────────────────────────────
  showRescheduleModal = false;
  selectedApptToReschedule: Appointment | null = null;
  rescheduleDate = '';
  rescheduleTime = '09:00';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadAppointments();
    this.loadDoctors();
    this.loadPatients();
    this.pollInterval = setInterval(() => this.loadAppointmentsSilently(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ─── Data Loading ─────────────────────────────────────────

  loadPatients() {
    this.http.get<any>(`${environment.apiUrl}/patients`).subscribe({
      next: (res) => {
        if (res.success && res.data)
          this.patientCatalog = res.data.map((p: any) => ({ id: p.id, name: p.name }));
      }
    });
  }

  loadAppointments() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments.set(res.appointments.map((a: any) => this.mapAppt(a)));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadAppointmentsSilently() {
    this.http.get<any>(`${environment.apiUrl}/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments)
          this.appointments.set(res.appointments.map((a: any) => this.mapAppt(a)));
      }
    });
  }

  private mapAppt(a: any): Appointment {
    return {
      id: a.id,
      patientName: a.patient?.user?.name || 'Unknown',
      patientId: a.patient?.id || '',
      doctorName: a.doctor?.user?.name || 'Unknown',
      specialty: a.doctor?.specialty || '',
      slotDate: a.slotDate || this.localDateStr(new Date()),
      slotTime: a.slotTime || '09:00',
      dateTime: a.slotDate ? `${a.slotDate} · ${a.slotTime}` : '',
      type: a.type || 'General Visit',
      mode: a.mode || 'In-Person',
      status: this.normalizeStatus(a.status)
    };
  }

  private normalizeStatus(status: string): string {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'PENDING': return 'Pending';
      case 'CANCELLED': return 'Cancelled';
      case 'CHECKED_IN': return 'Checked-in';
      case 'COMPLETED': return 'Completed';
      case 'IN_CONSULTATION': return 'In Consultation';
      default: return status;
    }
  }

  loadDoctors() {
    this.http.get<any>(`${environment.apiUrl}/doctor/list`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res.doctors || res.data || [];
        this.doctorOptions = list.map((d: any) => ({
          id: d._id, name: d.name, specialty: d.speciality || d.specialty || ''
        }));
      }
    });
  }

  // ─── Tab ──────────────────────────────────────────────────

  setTab(tab: TabFilter) {
    this.activeTab.set(tab);
  }

  // ─── New Appointment Form ─────────────────────────────────

  toggleNewForm() {
    this.showNewForm.update(v => !v);
  }

  get filteredPatientCatalog(): PatientCatalogItem[] {
    return this.patientCatalog.filter(p =>
      p.name.toLowerCase().includes(this.patientSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(this.patientSearch.toLowerCase())
    );
  }

  handlePatientSelect(pat: PatientCatalogItem) {
    this.selectedPatient = pat;
    this.patientSearch = `${pat.name} (${pat.id})`;
    this.showPatientResults = false;
  }

  handleCreateAppointment() {
    if (!this.selectedPatient) {
      this.toastr.error("Please select a patient from the search suggestions first.");
      return;
    }

    const docOption = this.doctorOptions.find(d => d.name === this.selectedDoctor);
    const payload = {
      patientId: this.selectedPatient.id,
      doctorId: docOption?.id || '',
      date: `${this.selectedDate}T${this.selectedTimeSlot}:00`,
      type: this.consultationType,
      mode: this.mode,
      notes: this.notes
    };

    this.http.post<any>(`${environment.apiUrl}/appointments`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success("Appointment scheduled successfully!");
          this.loadAppointments();
        }
        this.showNewForm.set(false);
        this.selectedPatient = null;
        this.patientSearch = '';
        this.notes = '';
      },
      error: () => this.toastr.error("Failed to create appointment")
    });
  }

  // ─── Actions ──────────────────────────────────────────────

  handleConfirm(id: string) {
    this.http.patch(`${environment.apiUrl}/appointments/${id}/status`, { status: 'CONFIRMED' }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Appointment confirmed");
          this.loadAppointments();
        }
      }
    });
  }

  handleReject(id: string) {
    this.http.patch(`${environment.apiUrl}/appointments/${id}/status`, { status: 'CANCELLED' }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Appointment rejected");
          this.loadAppointments();
        }
      }
    });
  }

  // ─── Reschedule ───────────────────────────────────────────

  openRescheduleModal(appt: Appointment) {
    this.selectedApptToReschedule = appt;
    this.rescheduleDate = appt.slotDate || this.localDateStr(new Date());
    this.rescheduleTime = appt.slotTime || '09:00';
    this.showRescheduleModal = true;
  }

  confirmReschedule() {
    if (!this.selectedApptToReschedule) return;
    const payload = {
      date: `${this.rescheduleDate}T${this.rescheduleTime}:00`,
      status: 'CONFIRMED'
    };
    this.http.patch<any>(`${environment.apiUrl}/appointments/${this.selectedApptToReschedule.id}/status`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success("Appointment rescheduled and confirmed!");
          this.loadAppointments();
        }
        this.showRescheduleModal = false;
        this.selectedApptToReschedule = null;
      },
      error: () => this.toastr.error("Failed to reschedule appointment")
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private localDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Confirmed': return 'status-pill--confirmed';
      case 'Pending': return 'status-pill--pending';
      case 'Cancelled': return 'status-pill--cancelled';
      case 'Checked-in': return 'status-pill--checked-in';
      case 'Completed': return 'status-pill--completed';
      case 'In Consultation': return 'status-pill--in-consultation';
      default: return '';
    }
  }
}
