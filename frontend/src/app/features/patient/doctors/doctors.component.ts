import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'ms-patient-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent, ModalComponent, DatePickerComponent],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.scss'
})
export class DoctorsComponent implements OnInit {
  doctors: any[] = [];
  filteredDoctors: any[] = [];
  loading = false;
  searchQuery = '';

  activeTab: 'All' | 'My Doctors' = 'All';
  myDoctorIds = new Set<string>();

  // Profile Modal State
  showProfileModal = false;
  selectedDoctor: any = null;

  // Booking Modal State
  showBookingModal = false;
  selectedDoctorId = '';
  selectedDate = '';
  selectedTime = '09:00';

  timeSlots: any[] = [
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
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/user/appointments`).subscribe({
      next: (apptsRes) => {
        if (apptsRes.success && apptsRes.appointments) {
          const ids = apptsRes.appointments.map((a: any) => a.docId);
          this.myDoctorIds = new Set<string>(ids);
        }
        this.fetchDoctorsList();
      },
      error: () => {
        this.fetchDoctorsList();
      }
    });
  }

  private fetchDoctorsList() {
    this.http.get<any>(`${environment.apiUrl}/doctor/list`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res.doctors || res.data || [];
        this.doctors = list.map((d: any, idx: number) => {
          const isPrimary = idx % 2 === 0;
          return {
            id: d.id || d._id,
            name: d.name,
            speciality: d.speciality || d.specialty || '',
            email: d.email,
            image: d.image || d.avatar,
            degree: d.degree || d.room || 'M.D. Cardiologist',
            experience: d.experience || '12+ Years Experience',
            about: d.about || 'Dedicated medical professional focused on providing exceptional clinical care and personalized treatment plans for all patients.',
            available: d.available !== undefined ? d.available : true,
            fees: d.fees || 300,
            address: d.address || 'MediSync Clinic, Suite 402',
            phone: d.phone || '+212 522-456789',
            consultsCount: d.consultsCount || 0,
            referralType: isPrimary ? 'PRIMARY CARE' : 'SPECIALIST REFERRAL'
          };
        });
        this.filterDoctors();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  setTab(tab: 'All' | 'My Doctors') {
    this.activeTab = tab;
    this.filterDoctors();
  }

  filterDoctors() {
    const q = this.searchQuery.toLowerCase().trim();
    let list = [...this.doctors];

    // Filter by Active Tab
    if (this.activeTab === 'My Doctors') {
      list = list.filter(d => this.myDoctorIds.has(d.id));
    }

    // Filter by Search Query
    if (q) {
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.speciality.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q)
      );
    }

    this.filteredDoctors = list;
  }

  bookAppointment(doc: any) {
    this.showProfileModal = false;
    this.selectedDoctorId = doc.id;
    this.selectedDate = '';
    this.selectedTime = '09:00';
    this.showBookingModal = true;
  }

  confirmBooking() {
    if (!this.selectedDoctorId || !this.selectedDate || !this.selectedTime) {
      this.toastr.warning('Please fill in all booking details.', 'Warning');
      return;
    }
    const payload = {
      docId: this.selectedDoctorId,
      slotDate: this.selectedDate,
      slotTime: this.selectedTime
    };
    this.http.post<any>(`${environment.apiUrl}/user/book-appointment`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastr.success('Appointment booked successfully!', 'Success');
          this.showBookingModal = false;
          // Refresh doctors completed appointments count
          this.loadDoctors();
        } else {
          this.toastr.error(res.message || 'Failed to book appointment.', 'Error');
        }
      },
      error: (err) => {
        this.toastr.error('Failed to book appointment. Please try again.', 'Error');
      }
    });
  }

  viewProfile(doc: any) {
    this.selectedDoctor = doc;
    this.showProfileModal = true;
  }
}
