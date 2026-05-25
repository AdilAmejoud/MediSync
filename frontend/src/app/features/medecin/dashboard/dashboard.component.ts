import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { interval, Subscription } from 'rxjs';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatsService } from '../../../core/services/stats.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';

type Phase = 'all' | 'checked-in' | 'consultation' | 'completed';
type ApptState = 'launch' | 'finish' | 'next' | 'empty';

@Component({
  selector: 'ms-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent, DataTableComponent, NgIconComponent, ModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  error = signal('');

  doctorName = '';
  currentTime = signal(new Date());
  private timerSub?: Subscription;
  private socketSubs: (() => void)[] = [];

  stats: any = null;
  nextAppointment: any = null;
  recentVisits: any[] = [];
  chartData: any[] = [];
  miniStats: any[] = [];
  todayAppointmentsList = signal<any[]>([]);
  perfSummary: any = null;
  chartMax = 400;

  activePhase = signal<Phase>('all');
  appointmentState = signal<ApptState>('launch');
  activePatient = signal<any>(null);
  currentAppointmentIndex = signal(0);
  pendingReviewPatients = signal<any[]>([]);
  pendingReviewsLocal = signal(0);

  showMedicalRecord = signal(false);
  medicalRecordPatient = signal<any>(null);
  medicalRecordData = signal<any>(null);
  loadingMedicalRecord = signal(false);

  waitingRoomCount = computed(() => this.todayAppointmentsList().filter((a: any) =>
    a.status === 'CHECKED_IN'
  ).length);
  inConsultationCount = computed(() => {
    if (this.activePatient() && this.appointmentState() !== 'launch' && this.appointmentState() !== 'empty') {
      return 1;
    }
    return this.todayAppointmentsList().filter((a: any) => a.status === 'IN_CONSULTATION').length;
  });
  completedCount = computed(() => this.todayAppointmentsList().filter((a: any) => a.status === 'COMPLETED').length);
  todayAppointmentsCount = computed(() => this.todayAppointmentsList().length);
  pendingReviewsCount = computed(() => (this.stats?.pendingReviews ?? 0) + this.pendingReviewsLocal());

  filteredAppointments = computed(() => {
    const phase = this.activePhase();
    if (phase === 'all') return this.todayAppointmentsList();
    if (phase === 'checked-in') {
      return this.todayAppointmentsList().filter((a: any) =>
        a.status === 'CHECKED_IN'
      );
    }
    const statusMap: Record<string, string | undefined> = {
      consultation: 'IN_CONSULTATION',
      completed: 'COMPLETED'
    };
    const targetStatus = statusMap[phase];
    return this.todayAppointmentsList().filter((a: any) => a.status === targetStatus);
  });

  visitTracking = signal<any[]>([]);

  completedVisits = computed(() => {
    const visits = this.visitTracking().filter((v: any) => v.status === 'COMPLETED');
    return visits.slice().sort((a: any, b: any) => new Date(b.rawDate || b.date).getTime() - new Date(a.rawDate || a.date).getTime());
  });

  constructor(
    private statsService: StatsService,
    private appointmentService: AppointmentService,
    private auth: AuthService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    this.doctorName = user?.name || 'Doctor';

    this.timerSub = interval(1000).subscribe(() => this.currentTime.set(new Date()));

    this.socketService.on('patientCheckedIn', (data: any) => {
      this.todayAppointmentsList.update(list => {
        if (list.some(a => a.id === data.id)) return list;
        return [...list, data];
      });
    });

    this.statsService.getDoctorStats().subscribe({
      next: (res) => {
        this.stats = res.data.stats;
        this.nextAppointment = res.data.nextAppointment;
        this.chartData = (res.data.chartData?.monthly || []).map((m: any) => ({
          month: m.month,
          consultations: m.total,
          cancelled: m.cancelled,
          completion: m.completed && m.total ? Math.round((m.completed / m.total) * 100) : 0
        }));
        this.recentVisits = res.data.recentVisits || [];
        this.visitTracking.set((res.data.recentVisits || []).map((v: any, i: number) => ({
          no: String(i + 1).padStart(2, '0'),
          name: v.patientName,
          sub: v.patientInitials,
          date: this.formatApptDate(v.date),
          rawDate: v.date,
          mode: v.mode || 'In-Person',
          status: v.status,
          type: v.type === 'Follow-up' ? 'Follow-up' : 'First Visit'
        })));

        const allToday = res.data.todayAppointmentsList || [];
        this.todayAppointmentsList.set(allToday.filter((a: any) => a.status !== 'CANCELLED'));
        this.perfSummary = res.data.perfSummary;

        const maxVal = Math.max(...this.chartData.map((d: any) => d.consultations), 1);
        this.chartMax = Math.ceil(maxVal / 100) * 100 || 400;

        this.pendingReviewsLocal.set(0);
        this.pendingReviewPatients.set(
          (res.data.pendingReviewAppointments || []).map((a: any) => ({
            id: a.id,
            patientName: a.patientName,
            patientInitials: a.patientInitials,
            type: a.type || 'Lab Review',
            date: a.date,
            source: 'backlog'
          }))
        );

        this.loadInitialPatient();

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load statistics');
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  private loadInitialPatient() {
    const all = this.todayAppointmentsList();
    const checkedIn = all.find((a: any) => a.status === 'CHECKED_IN');
    const inConsultation = all.find((a: any) => a.status === 'IN_CONSULTATION');

    if (inConsultation) {
      this.activePatient.set(inConsultation);
      this.appointmentState.set('finish');
    } else if (checkedIn) {
      this.activePatient.set(checkedIn);
      this.appointmentState.set('launch');
    } else if (this.nextAppointment) {
      this.activePatient.set(this.nextAppointment);
      this.appointmentState.set('launch');
    } else {
      this.activePatient.set(null);
      this.appointmentState.set('empty');
    }
  }

  formatApptDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();

    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = dDate.getTime() - dToday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (diffDays === 0) {
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow, ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday, ${timeStr}`;
    } else {
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[date.getMonth()];
      const minutesStr = String(date.getMinutes()).padStart(2, '0');
      const hoursStr = String(date.getHours()).padStart(2, '0');
      return `${day} ${monthStr} - ${hoursStr}:${minutesStr}`;
    }
  }

  onLaunchAppointment() {
    const target = this.activePatient();
    if (!target) return;

    this.appointmentService.startDoctorAppointment(target.id).subscribe({
      next: () => {
        target.status = 'IN_CONSULTATION';
        this.todayAppointmentsList.update(list =>
          list.map((a: any) => a.id === target.id ? { ...a, status: 'IN_CONSULTATION' } : a)
        );
        this.appointmentState.set('finish');
      },
      error: () => {
        this.appointmentState.set('finish');
      }
    });
  }

  onFinishAppointment() {
    const target = this.activePatient();
    if (!target) return;

    this.appointmentService.completeDoctorAppointment(target.id).subscribe({
      next: () => {
        target.status = 'COMPLETED';
        this.todayAppointmentsList.update(list =>
          list.map((a: any) => a.id === target.id ? { ...a, status: 'COMPLETED' } : a)
        );

        this.visitTracking.update(list => [{
          no: String(list.length + 1).padStart(2, '0'),
          name: target.patientName,
          sub: target.patientInitials,
          date: 'Just now',
          rawDate: new Date().toISOString(),
          mode: target.mode || 'In-Person',
          status: 'COMPLETED',
          type: target.type === 'Follow-up' ? 'Follow-up' : 'First Visit'
        }, ...list]);

        this.pendingReviewPatients.update(list => [target, ...list]);
        this.pendingReviewsLocal.update(c => c + 1);

        this.appointmentState.set('next');
      },
      error: () => {
        this.appointmentState.set('next');
      }
    });
  }

  onNextAppointment() {
    const nextCheckedIn = this.todayAppointmentsList().find((a: any) => a.status === 'CONFIRMED');

    if (nextCheckedIn) {
      this.activePatient.set(nextCheckedIn);
      this.appointmentState.set('launch');
    } else {
      this.activePatient.set(null);
      this.appointmentState.set('empty');
    }
  }

  markReviewed(patient: any) {
    this.pendingReviewPatients.update(list => list.filter(p => p.id !== patient.id));
    this.pendingReviewsLocal.update(c => Math.max(0, c - 1));
  }

  filterByPhase(phase: Phase) {
    this.activePhase.set(phase);
  }

  openMedicalRecord(patient: any) {
    this.medicalRecordPatient.set(patient);
    this.loadingMedicalRecord.set(true);
    this.showMedicalRecord.set(true);

    this.appointmentService.getDoctorAppointments().subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          const patientAppts = res.appointments.filter(
            (a: any) => a.userData?.name === patient.patientName
          );
          this.medicalRecordData.set(patientAppts);
        } else {
          this.medicalRecordData.set([]);
        }
        this.loadingMedicalRecord.set(false);
      },
      error: () => {
        this.medicalRecordData.set([]);
        this.loadingMedicalRecord.set(false);
      }
    });
  }

  closeMedicalRecord() {
    this.showMedicalRecord.set(false);
    this.medicalRecordPatient.set(null);
    this.medicalRecordData.set(null);
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'CHECKED_IN': return 'badge-primary';
      case 'CONFIRMED': return 'badge-info';
      case 'IN_CONSULTATION': return 'badge-warning';
      case 'COMPLETED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-neutral';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'CHECKED_IN': return 'Checked-in';
      case 'CONFIRMED': return 'Booked';
      case 'IN_CONSULTATION': return 'In Consultation';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  getPatientVitals(patient: any): any {
    if (patient?.vitals) return patient.vitals;
    return { bp: '120/80', hr: '75 bpm', weight: '70 kg' };
  }
}
