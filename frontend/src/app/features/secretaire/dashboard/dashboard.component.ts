import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { interval, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { StatsService } from '../../../core/services/stats.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'ms-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, StatCardComponent, DataTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  error = signal('');
  time = signal(new Date());
  emergenciesActive = signal(false);

  stats = signal<any>(null);
  clinicQueue = signal<any[]>([]);
  invoices = signal<any[]>([]);
  rooms = signal<any[]>([]);

  todayAppointmentsCount = computed(() => this.stats()?.todayAppointments ?? 0);
  waitingRoomCount = computed(() => this.stats()?.waitingRoom ?? 0);
  invoicesPendingCount = computed(() => this.stats()?.invoicesToClose ?? 0);
  roomsAvailableCount = computed(() => this.stats()?.availableRooms ?? 0);
  todayRevenue = computed(() => this.stats()?.todayRevenue ?? 0);

  showWalkInModal = signal(false);
  walkInForm: any = { name: '', age: '', phone: '', reason: '', doctorId: '' };

  showEmergencyModal = signal(false);
  emergencyForm: any = { name: '', age: '', complaint: '', severity: 'Critical', doctorId: '', room: '' };

  showQRModal = signal(false);
  qrCodeUrl = signal('');
  qrLoading = signal(false);

  doctors: any[] = [];

  private timerSub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    private statsService: StatsService,
    private appointmentService: AppointmentService,
    private toastr: ToastrService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.timerSub = interval(1000).subscribe(() => this.time.set(new Date()));

    this.loadStats();
    this.pollSub = interval(5000).subscribe(() => this.refreshRooms());
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  get clockDisplayLabel(): string {
    const t = this.time().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const d = this.time().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).toUpperCase();
    return `${t} — ${d}`;
  }

  private loadStats() {
    this.statsService.getSecretaryStats().subscribe({
      next: (res) => {
        this.stats.set(res.data.stats);
        this.clinicQueue.set(res.data.patientsBeingAdmitted || []);
        this.invoices.set(res.data.invoicesDue || []);
        this.rooms.set(res.data.roomStatus || []);
        this.doctors = (res.data.roomStatus || []).map((r: any) => ({
          id: r.doctorId,
          name: r.doctor
        }));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load statistics');
        this.loading.set(false);
      }
    });
  }

  private refreshRooms() {
    this.appointmentService.getDoctorStatus().subscribe({
      next: (res) => {
        if (res.success) {
          this.rooms.set(res.data);
          const inConsult = res.data.filter((r: any) => r.status === 'In Consultation').length;
          this.stats.update(s => ({ ...s, availableRooms: (s?.totalRooms || 0) - inConsult }));
        }
      }
    });
  }

  private refreshAll() {
    this.loadStats();
  }

  onCheckIn(appt: any) {
    this.appointmentService.checkInPatient(appt.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.clinicQueue.update(list => list.map(a =>
            a.id === appt.id ? { ...a, status: 'CHECKED_IN' } : a
          ));
          this.stats.update(s => ({ ...s, waitingRoom: (s?.waitingRoom || 0) + 1 }));
          this.toastr.success(`${appt.patientName} checked in`);
        }
      },
      error: () => this.toastr.error('Check-in failed')
    });
  }

  onCancel(appt: any) {
    this.appointmentService.cancelAdmission(appt.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.clinicQueue.update(list => list.filter(a => a.id !== appt.id));
          this.stats.update(s => ({ ...s, todayAppointments: Math.max(0, (s?.todayAppointments || 0) - 1) }));
          this.toastr.info(`${appt.patientName} cancelled`);
        }
      },
      error: () => this.toastr.error('Cancel failed')
    });
  }

  onCollectPayment(inv: any) {
    this.appointmentService.collectPayment(inv.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.invoices.update(list => list.filter(i => i.id !== inv.id));
          this.stats.update(s => ({ ...s, invoicesToClose: Math.max(0, (s?.invoicesToClose || 0) - 1) }));
          this.toastr.success(`Payment collected: ${inv.amount} MAD`);
        }
      },
      error: () => this.toastr.error('Payment failed')
    });
  }

  openWalkInModal() {
    this.walkInForm = { name: '', age: '', phone: '', reason: '', doctorId: this.doctors[0]?.id || '' };
    this.showWalkInModal.set(true);
  }

  closeWalkInModal() {
    this.showWalkInModal.set(false);
  }

  submitWalkIn() {
    if (!this.walkInForm.name || !this.walkInForm.doctorId) {
      this.toastr.error('Patient name and doctor are required');
      return;
    }
    this.appointmentService.registerWalkIn(this.walkInForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success(`Walk-in ${this.walkInForm.name} registered`);
          this.showWalkInModal.set(false);
          this.refreshAll();
        }
      },
      error: () => this.toastr.error('Registration failed')
    });
  }

  openEmergencyModal() {
    this.emergencyForm = { name: '', age: '', complaint: '', severity: 'Critical', doctorId: this.doctors[0]?.id || '', room: '' };
    this.showEmergencyModal.set(true);
  }

  closeEmergencyModal() {
    this.showEmergencyModal.set(false);
  }

  submitEmergency() {
    if (!this.emergencyForm.name) {
      this.toastr.error('Patient name is required');
      return;
    }
    this.appointmentService.registerEmergency(this.emergencyForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.emergenciesActive.set(true);
          this.toastr.warning(`EMERGENCY: ${this.emergencyForm.name} — Doctor notified`);
          this.showEmergencyModal.set(false);
          this.refreshAll();
          setTimeout(() => this.emergenciesActive.set(false), 8000);
        }
      },
      error: () => this.toastr.error('Emergency registration failed')
    });
  }

  openQRModal() {
    this.showQRModal.set(true);
    this.loadQRCode();
  }

  closeQRModal() {
    this.showQRModal.set(false);
  }

  loadQRCode() {
    this.qrLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/appointments/clinic-qr`).subscribe({
      next: (res) => {
        if (res.success) this.qrCodeUrl.set(res.data.qrDataUrl);
        this.qrLoading.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load QR code');
        this.qrLoading.set(false);
      }
    });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'CHECKED_IN': return 'status-pill--checked-in';
      case 'CONFIRMED': return 'status-pill--confirmed';
      case 'IN_CONSULTATION': return 'status-pill--progress';
      case 'COMPLETED': return 'status-pill--arrived';
      case 'PENDING': return 'status-pill--scheduled';
      default: return 'status-pill--scheduled';
    }
  }

  roomStatusClass(status: string): string {
    switch (status) {
      case 'Available': return 'room-badge--available';
      case 'Waiting': return 'room-badge--waiting';
      case 'In Consultation': return 'room-badge--consultation';
      default: return 'room-badge--available';
    }
  }

  roomStatusDot(status: string): string {
    switch (status) {
      case 'Available': return '#10B981';
      case 'Waiting': return '#3B82F6';
      case 'In Consultation': return '#F97316';
      default: return '#10B981';
    }
  }
}
