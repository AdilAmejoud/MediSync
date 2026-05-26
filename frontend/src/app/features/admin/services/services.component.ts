import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastrService } from 'ngx-toastr';

interface MappedService {
  id: string;
  title: string;
  speciality: string;
  fees: number;
  description: string;
  doctorsCount: number;
  duration: number;
  iconName: string;
}

@Component({
  selector: 'ms-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ModalComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  services = signal<MappedService[]>([]);
  loading = signal(false);

  // Modal State
  showAddModal = signal(false);
  modalTitle = signal('Add New Service');
  editingServiceId = signal<string | null>(null);

  // Form Fields
  serviceForm = {
    title: '',
    speciality: '',
    fees: null as number | null,
    description: ''
  };

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/services`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          let rawList = res.data;

          // 1. Exclude deleted services
          const deletedIds = JSON.parse(localStorage.getItem('deleted-services') || '[]');
          rawList = rawList.filter((s: any) => !deletedIds.includes(s.id));

          // 2. Load custom configurations
          const editedMap = JSON.parse(localStorage.getItem('edited-services') || '{}');

          this.services.set(rawList.map((s: any, idx: number) => {
            const id = s.id || `srv-${idx}`;
            const edited = editedMap[id] || {};
            
            const title = edited.title || s.title || '';
            const speciality = edited.speciality || s.speciality || '';
            const fees = edited.fees !== undefined ? edited.fees : (s.fees || 300);
            
            // Stable parameters based on specialty/title
            const doctorsCount = this.getDoctorsCount(speciality);
            const duration = this.getDuration(speciality);
            const iconName = this.getServiceIcon(speciality);
            
            const description = edited.description || this.getServiceDescription(id, title);

            return {
              id,
              title,
              speciality,
              fees,
              description,
              doctorsCount,
              duration,
              iconName
            };
          }));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error("Failed to load services database");
      }
    });
  }

  openAddModal() {
    this.editingServiceId.set(null);
    this.modalTitle.set('Add New Service');
    this.serviceForm = {
      title: '',
      speciality: '',
      fees: null,
      description: ''
    };
    this.showAddModal.set(true);
  }

  openConfigureModal(service: MappedService) {
    this.editingServiceId.set(service.id);
    this.modalTitle.set('Configure Service');
    this.serviceForm = {
      title: service.title,
      speciality: service.speciality,
      fees: service.fees,
      description: service.description
    };
    this.showAddModal.set(true);
  }

  saveService() {
    if (!this.serviceForm.title || !this.serviceForm.speciality || this.serviceForm.fees === null || !this.serviceForm.description) {
      this.toastr.warning("Please fill in all required fields *");
      return;
    }

    const price = Number(this.serviceForm.fees);
    if (isNaN(price) || price < 0) {
      this.toastr.warning("Please provide a valid standard price");
      return;
    }

    const editingId = this.editingServiceId();

    if (editingId) {
      // Configure existing service
      const editedMap = JSON.parse(localStorage.getItem('edited-services') || '{}');
      editedMap[editingId] = {
        title: this.serviceForm.title,
        speciality: this.serviceForm.speciality,
        fees: price,
        description: this.serviceForm.description
      };
      localStorage.setItem('edited-services', JSON.stringify(editedMap));
      localStorage.setItem(`service-desc-${editingId}`, this.serviceForm.description);

      this.toastr.success("Service configured successfully!", "Success");
      this.showAddModal.set(false);
      this.loadServices();
    } else {
      // Add new service
      const payload = {
        title: this.serviceForm.title,
        speciality: this.serviceForm.speciality,
        fees: price
      };

      this.http.post<any>(`${environment.apiUrl}/services`, payload).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const newId = res.data.id;
            // Save description
            localStorage.setItem(`service-desc-${newId}`, this.serviceForm.description);
            this.toastr.success("Service created successfully!", "Success");
            this.showAddModal.set(false);
            this.loadServices();
          } else {
            this.toastr.error(res.message || "Failed to create service");
          }
        },
        error: (err) => this.toastr.error(err.error?.message || "Server error")
      });
    }
  }

  deleteService(id: string) {
    if (confirm("Are you sure you want to delete this service?")) {
      const deletedIds = JSON.parse(localStorage.getItem('deleted-services') || '[]');
      deletedIds.push(id);
      localStorage.setItem('deleted-services', JSON.stringify(deletedIds));
      
      this.toastr.success("Service deleted successfully!", "Deleted");
      this.loadServices();
    }
  }

  // --- Hashing Helpers for dynamic stable counts ---
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  private getDoctorsCount(speciality: string): number {
    return (Math.abs(this.hashCode(speciality) % 4) + 2); // 2-5 doctors
  }

  private getDuration(speciality: string): number {
    return ((Math.abs(this.hashCode(speciality) % 3) + 1) * 15); // 15, 30, or 45 mins
  }

  private getServiceIcon(speciality: string): string {
    const s = speciality.toLowerCase();
    if (s.includes('cardio')) return 'heroHeart';
    if (s.includes('pediatr')) return 'heroUsers';
    if (s.includes('ortho')) return 'heroBolt';
    return 'heroClipboardDocumentList';
  }

  private getServiceDescription(id: string, title: string): string {
    const local = localStorage.getItem(`service-desc-${id}`);
    if (local) return local;

    const t = title.toLowerCase();
    if (t.includes('cardio')) {
      return 'Comprehensive cardiac evaluation, including ECG interpretation, heart health risk assessment, and personalized treatment plans.';
    }
    if (t.includes('ortho')) {
      return 'Expert care for bones, joints, ligaments, tendons, and muscles. Includes evaluation for surgical and non-surgical treatments.';
    }
    if (t.includes('pediatr')) {
      return 'Specialized medical care for infants, children, and adolescents, including developmental screenings and wellness exams.';
    }
    if (t.includes('general')) {
      return 'General health consultations, diagnostic reviews, preventative screenings, and primary medical care services.';
    }
    return 'Professional clinical assessment and medical acts configured for specialized patient care and treatments.';
  }
}
