import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PdfService } from '../../../core/services/pdf.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { DocumentViewerComponent } from '../../../shared/components/document-viewer/document-viewer.component';
import { environment } from '../../../../environments/environment';

interface TimeSlot {
  time: string;
  booked: boolean;
}

@Component({
  selector: 'ms-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ModalComponent, DatePickerComponent, DocumentViewerComponent],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit {
  appointments: any[] = [];
  doctors: any[] = [];
  loading = false;

  // Filters & Search
  searchQuery = '';
  currentFilter = 'All';

  // Booking Modal State
  showAddModal = false;
  selectedDoctorId = '';
  selectedDate = '';
  selectedTime = '09:00';
  selectedType = 'General Visit';
  selectedMode = 'In-Person';

  // Reschedule Modal State
  showRescheduleModal = false;
  selectedApptToReschedule: any = null;
  rescheduleDate = '';
  rescheduleTime = '09:00';

  // Details Modal State
  showDetailsModal = false;
  selectedApptDetails: any = null;
  autoOpenDetailsId: string | null = null;

  showInvoiceViewer = false;
  invoiceViewerData: Uint8Array | null = null;
  invoiceViewerTitle = '';
  selectedInvoiceAppt: any = null;

  timeSlots: TimeSlot[] = [
    { time: '09:00', booked: false },
    { time: '09:30', booked: false },
    { time: '10:00', booked: false },
    { time: '10:30', booked: false },
    { time: '11:00', booked: false },
    { time: '11:30', booked: false },
    { time: '14:00', booked: false },
    { time: '14:30', booked: false },
    { time: '15:00', booked: false },
    { time: '15:30', booked: false },
    { time: '16:00', booked: false },
    { time: '16:30', booked: false }
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private pdfService: PdfService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAppointments();
    this.loadDoctors();

    // Check if docId is passed in query parameters to auto-open booking modal
    this.route.queryParams.subscribe(params => {
      if (params['docId']) {
        this.selectedDoctorId = params['docId'];
        this.showAddModal = true;
      }
      if (params['viewApptId']) {
        this.autoOpenDetailsId = params['viewApptId'];
        this.checkAutoOpenDetails();
      }
    });
  }

  loadDoctors() {
    this.http.get<any>(`${environment.apiUrl}/doctor/list`).subscribe({
      next: (res) => {
        this.doctors = Array.isArray(res) ? res : res.doctors || res.data || [];
      }
    });
  }

  loadBookedSlots() {
    if (!this.selectedDoctorId || !this.selectedDate) return;
    const doc = this.doctors.find(d => d.id === this.selectedDoctorId);
    const modelId = doc?._id || '';
    if (!modelId) return;
    this.http.get<any>(`${environment.apiUrl}/appointments?doctorId=${modelId}&date=${this.selectedDate}`).subscribe({
      next: (res) => {
        const booked: string[] = [];
        if (res.success && res.appointments) {
          for (const a of res.appointments) {
            const d = new Date(a.date);
            const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            booked.push(t);
          }
        }
        this.timeSlots = this.timeSlots.map(s => ({
          ...s,
          booked: booked.includes(s.time)
        }));
      }
    });
  }

  resetTimeSlots() {
    this.timeSlots = this.timeSlots.map(s => ({ ...s, booked: false }));
  }

  loadAppointments() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/user/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments = res.appointments.map((a: any) => {
            let statusStr = 'Pending';
            const s = a.status?.toUpperCase();
            if (s === 'CONFIRMED' || s === 'RESCHEDULED') {
              statusStr = 'Upcoming';
            } else if (s === 'COMPLETED') {
              statusStr = 'Completed';
            } else if (s === 'CANCELLED') {
              statusStr = 'Cancelled';
            } else if (s === 'PENDING') {
              statusStr = 'Pending';
            }

            return {
              id: a.id,
              docId: a.docId || a.doctor?.user?.id || '',
              doctorModelId: a.doctor?.id || '',
              doctorName: a.doctorName || a.docData?.name || 'Unknown',
              doctorSpecialty: a.doctorSpecialty || a.docData?.specialty || 'General Practice',
              doctorAvatar: a.docData?.avatar || null,
              date: a.date || `${a.slotDate}T${a.slotTime}:00`,
              slotDate: a.slotDate,
              slotTime: a.slotTime,
              type: a.type || 'General Visit',
              mode: a.mode || 'In-Person',
              fee: a.amount || a.fee || 300,
              notes: a.notes,
              status: statusStr,
              rawStatus: a.status
            };
          });
          this.checkAutoOpenDetails();
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getFilteredAppointments() {
    return this.appointments.filter(a => {
      // 1. Filter by status tab
      if (this.currentFilter !== 'All') {
        if (a.status !== this.currentFilter) {
          return false;
        }
      }
      // 2. Filter by search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const docName = a.doctorName?.toLowerCase() || '';
        const specialty = a.doctorSpecialty?.toLowerCase() || '';
        const id = a.id?.toLowerCase() || '';
        return docName.includes(query) || specialty.includes(query) || id.includes(query);
      }
      return true;
    });
  }

  get nextAppointment() {
    // Find upcoming/pending appointments whose date is in the future
    const now = new Date().getTime();
    const upcoming = this.appointments.filter(a => {
      const isUpcomingStatus = a.status === 'Upcoming' || a.status === 'Pending';
      const apptTime = new Date(a.date).getTime();
      return isUpcomingStatus && apptTime >= now;
    });

    if (upcoming.length === 0) {
      // Fallback: if all upcoming are technically in the past relative to system clock, just take the first upcoming/pending
      const allUpcoming = this.appointments.filter(a => a.status === 'Upcoming' || a.status === 'Pending');
      if (allUpcoming.length === 0) return null;
      return allUpcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }

    return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }

  formatDateStr(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  getInitials(name: string): string {
    if (!name) return 'DR';
    const parts = name.replace('Dr. ', '').split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 45%)`;
  }

  openNewAppointmentModal() {
    this.resetTimeSlots();
    this.selectedDoctorId = '';
    this.selectedDate = '';
    this.selectedTime = '09:00';
    this.showAddModal = true;
  }

  bookAppointment() {
    if (!this.selectedDoctorId || !this.selectedDate || !this.selectedTime) {
      this.toastr.warning('Please fill in all booking details.', 'Warning');
      return;
    }
    const payload = {
      docId: this.selectedDoctorId,
      slotDate: this.selectedDate,
      slotTime: this.selectedTime,
      type: this.selectedType,
      mode: this.selectedMode
    };
    this.http.post<any>(`${environment.apiUrl}/user/book-appointment`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success('Appointment booked successfully!', 'Success');
          this.loadAppointments();
          this.showAddModal = false;
          // reset form
          this.selectedDoctorId = '';
          this.selectedDate = '';
          this.selectedTime = '09:00';
          this.selectedType = 'General Visit';
          this.selectedMode = 'In-Person';
        } else {
          this.toastr.error(res.message || 'Failed to book appointment.', 'Error');
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to book appointment.', 'Error');
      }
    });
  }

  cancelAppointment(apptId: string) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.http.post(`${environment.apiUrl}/user/cancel-appointment`, { appointmentId: apptId }).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.toastr.success('Appointment cancelled successfully!', 'Success');
            this.loadAppointments();
          } else {
            this.toastr.error(res.message || 'Failed to cancel appointment.', 'Error');
          }
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Failed to cancel appointment.', 'Error');
        }
      });
    }
  }

  openRescheduleModal(appt: any) {
    this.selectedApptToReschedule = appt;
    this.rescheduleDate = appt.slotDate || '';
    this.rescheduleTime = appt.slotTime || '09:00';
    this.showRescheduleModal = true;
    if (this.rescheduleDate) {
      this.http.get<any>(`${environment.apiUrl}/appointments?doctorId=${appt.doctorModelId || ''}&date=${this.rescheduleDate}`).subscribe({
        next: (res) => {
          const booked: string[] = [];
          if (res.success && res.appointments) {
            for (const a of res.appointments) {
              if (a.id === appt.id) continue;
              const d = new Date(a.date);
              const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              booked.push(t);
            }
          }
          this.timeSlots = this.timeSlots.map(s => ({
            ...s,
            booked: booked.includes(s.time)
          }));
        }
      });
    }
  }

  confirmReschedule() {
    if (!this.selectedApptToReschedule || !this.rescheduleDate || !this.rescheduleTime) {
      this.toastr.warning('Please select date and time slot.', 'Warning');
      return;
    }
    const payload = {
      date: `${this.rescheduleDate}T${this.rescheduleTime}:00`,
      status: 'PENDING'
    };
    this.http.patch<any>(`${environment.apiUrl}/appointments/${this.selectedApptToReschedule.id}/status`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success('Appointment rescheduled successfully!', 'Success');
          this.showRescheduleModal = false;
          this.selectedApptToReschedule = null;
          this.loadAppointments();
        } else {
          this.toastr.error(res.message || 'Failed to reschedule appointment.', 'Error');
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to reschedule appointment.', 'Error');
      }
    });
  }

  viewDetails(appt: any) {
    this.selectedApptDetails = appt;
    this.showDetailsModal = true;
  }

  viewInvoice(appt: any) {
    this.selectedInvoiceAppt = appt;
    const patientName = this.authService.currentUser()?.name || 'Patient';
    this.invoiceViewerData = this.pdfService.generateInvoiceArray({
      invoiceNumber: `INV-${appt.id.slice(-6).toUpperCase()}`,
      patientName: patientName,
      doctorName: appt.doctorName,
      date: new Date(appt.date).toLocaleDateString('en-US'),
      services: [
        { name: `${appt.type} (${appt.mode})`, qty: 1, price: appt.fee }
      ],
      total: appt.fee,
      status: 'PAID'
    });
    this.invoiceViewerTitle = `Invoice - ${appt.doctorName}`;
    this.showInvoiceViewer = true;
  }

  downloadViewedInvoice() {
    if (this.selectedInvoiceAppt) {
      this.downloadInvoice(this.selectedInvoiceAppt);
    }
  }

  closeInvoiceViewer() {
    this.showInvoiceViewer = false;
    this.invoiceViewerData = null;
    this.selectedInvoiceAppt = null;
  }

  downloadInvoice(appt: any) {
    const patientName = this.authService.currentUser()?.name || 'Patient';
    this.pdfService.generateInvoice({
      invoiceNumber: `INV-${appt.id.slice(-6).toUpperCase()}`,
      patientName: patientName,
      doctorName: appt.doctorName,
      date: new Date(appt.date).toLocaleDateString('en-US'),
      services: [
        { name: `${appt.type} (${appt.mode})`, qty: 1, price: appt.fee }
      ],
      total: appt.fee,
      status: 'PAID'
    });
    this.toastr.success('Invoice PDF downloaded successfully!', 'Success');
  }

  checkAutoOpenDetails() {
    if (this.autoOpenDetailsId && this.appointments.length > 0) {
      const appt = this.appointments.find(a => a.id === this.autoOpenDetailsId);
      if (appt) {
        this.viewDetails(appt);
        this.autoOpenDetailsId = null;
      }
    }
  }
}
