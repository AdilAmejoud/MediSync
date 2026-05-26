import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DoctorService } from '../../../core/services/doctor.service';
import { Doctor } from '../../../core/models/doctor.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

interface RoomDoctor extends Doctor {
  roomText?: string;
  avatarColor?: string;
  initials?: string;
}

@Component({
  selector: 'ms-admin-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ModalComponent],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.scss'
})
export class DoctorsComponent implements OnInit {
  doctors = signal<RoomDoctor[]>([]);
  loading = signal(false);
  showAddPanel = signal(false);

  // Filter and Search States
  searchQuery = signal('');
  selectedSpecialty = signal('All Specialties');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Selected Doctor for Profile Details Modal
  selectedDoctor = signal<RoomDoctor | null>(null);

  // Available Specialties list
  specialtiesList = ['All Specialties', 'Cardiology', 'Orthopedics', 'Pediatrics', 'General Medicine'];

  // New Doctor Form Fields
  newDoctor = {
    name: '',
    email: '',
    speciality: 'Cardiology',
    fees: 300,
    available: true
  };

  // Filtered Doctors list
  filteredDoctors = computed(() => {
    let list = this.doctors();
    const query = this.searchQuery().toLowerCase().trim();
    const specialty = this.selectedSpecialty();
    const status = this.activeFilter();

    // 1. Search Query filter (name or specialty)
    if (query) {
      list = list.filter(d => 
        (d.name || '').toLowerCase().includes(query) || 
        (d.speciality || '').toLowerCase().includes(query)
      );
    }

    // 2. Specialty Dropdown filter
    if (specialty !== 'All Specialties') {
      list = list.filter(d => d.speciality === specialty);
    }

    // 3. Status Tab filter
    if (status === 'active') {
      list = list.filter(d => d.available === true);
    } else if (status === 'inactive') {
      list = list.filter(d => d.available === false);
    }

    return list;
  });

  constructor(
    private doctorService: DoctorService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.loading.set(true);
    this.doctorService.getDoctors().subscribe({
      next: (res: any) => {
        if (res.success) {
          const rawList = res.doctors || res.data || [];
          const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED'];
          
          this.doctors.set(rawList.map((d: any, idx: number) => {
            const initials = (d.name || '')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase();
            
            return {
              ...d,
              roomText: `Room ${101 + (idx % 8)}`,
              avatarColor: colors[idx % colors.length],
              initials: initials || 'DR'
            };
          }));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error("Failed to load doctor files");
      }
    });
  }

  toggleAddPanel() {
    this.showAddPanel.set(!this.showAddPanel());
  }

  onSaveDoctor() {
    if (!this.newDoctor.name || !this.newDoctor.email) return;
    this.http.post(`${environment.apiUrl}/admin/add-doctor`, {
      name: this.newDoctor.name,
      email: this.newDoctor.email,
      speciality: this.newDoctor.speciality,
      fees: this.newDoctor.fees,
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success("Doctor added successfully!", "Success");
          this.showAddPanel.set(false);
          this.newDoctor = { name: '', email: '', speciality: 'Cardiology', fees: 300, available: true };
          this.loadDoctors();
        } else {
          this.toastr.error(res.message || "Failed to add doctor");
        }
      },
      error: (err) => this.toastr.error(err.error?.message || "Server error")
    });
  }

  // Toggles Availability state on the doctor
  toggleAvailability(doc: RoomDoctor) {
    this.loading.set(true);
    this.doctorService.changeAvailability(doc.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(`Dr. ${doc.name}'s status updated!`, "Success");
          this.loadDoctors();
        } else {
          this.toastr.error(res.message || "Failed to update status");
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.message || "Server error");
        this.loading.set(false);
      }
    });
  }

  // Stable Hash function to generate patient count based on ID
  getPatientsCount(docId: string): number {
    let hash = 0;
    for (let i = 0; i < docId.length; i++) {
      hash = docId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 90) + 30; // Between 30 and 120 patients
  }

  openProfile(doc: RoomDoctor) {
    this.selectedDoctor.set(doc);
  }

  closeProfile() {
    this.selectedDoctor.set(null);
  }
}
