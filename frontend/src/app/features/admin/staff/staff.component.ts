import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastrService } from 'ngx-toastr';

interface MappedStaff {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Doctor' | 'Secretary';
  specialty?: string;
  status: 'Active' | 'Inactive';
  avatarColor?: string;
  initials?: string;
}

@Component({
  selector: 'ms-admin-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ModalComponent],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss'
})
export class StaffComponent implements OnInit {
  staff = signal<MappedStaff[]>([]);
  loading = signal(false);

  // Search & Filter States
  searchQuery = signal('');
  selectedRoleFilter = signal('All Roles');

  // Edit Modal State
  showEditModal = signal(false);
  editingStaff = {
    id: '',
    name: '',
    email: '',
    role: 'Secretary' as 'Admin' | 'Doctor' | 'Secretary',
    status: 'Active' as 'Active' | 'Inactive'
  };

  // Roles list
  rolesList = ['All Roles', 'Admin', 'Doctor', 'Secretary'];

  // Computed Dynamic Filtered Staff list
  filteredStaff = computed(() => {
    let list = this.staff();
    const query = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();

    // 1. Search Query filter (name or role)
    if (query) {
      list = list.filter(s => 
        (s.name || '').toLowerCase().includes(query) || 
        (s.role || '').toLowerCase().includes(query)
      );
    }

    // 2. Role Dropdown filter
    if (roleFilter !== 'All Roles') {
      list = list.filter(s => s.role === roleFilter);
    }

    return list;
  });

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadStaff();
  }

  loadStaff() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/staff`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          let rawList = res.data;

          // 1. Exclude deleted staff
          const deletedIds = JSON.parse(localStorage.getItem('deleted-staff') || '[]');
          rawList = rawList.filter((s: any) => !deletedIds.includes(s.id));

          // 2. Load custom configurations/edits
          const editedMap = JSON.parse(localStorage.getItem('edited-staff') || '{}');
          const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED'];

          this.staff.set(rawList.map((s: any, idx: number) => {
            const id = s.id || `stf-${idx}`;
            const edited = editedMap[id] || {};

            const name = edited.name || s.name || '';
            const email = edited.email || s.email || '';
            const role = edited.role || s.role || 'Secretary';
            const status = edited.status || s.status || 'Active';

            const initials = name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase();

            return {
              id,
              name,
              email,
              role,
              specialty: s.specialty || '',
              status,
              avatarColor: colors[idx % colors.length],
              initials: initials || 'ST'
            };
          }));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error("Failed to load staff roster");
      }
    });
  }

  openEditModal(member: MappedStaff) {
    this.editingStaff = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status
    };
    this.showEditModal.set(true);
  }

  saveStaffProfile() {
    if (!this.editingStaff.name || !this.editingStaff.email) {
      this.toastr.warning("Please fill in required fields *");
      return;
    }

    const id = this.editingStaff.id;
    const editedMap = JSON.parse(localStorage.getItem('edited-staff') || '{}');
    
    editedMap[id] = {
      name: this.editingStaff.name,
      email: this.editingStaff.email,
      role: this.editingStaff.role,
      status: this.editingStaff.status
    };
    
    localStorage.setItem('edited-staff', JSON.stringify(editedMap));
    this.toastr.success("Staff profile configured successfully!", "Success");
    this.showEditModal.set(false);
    this.loadStaff();
  }

  deleteStaff(id: string) {
    if (confirm("Are you sure you want to delete this staff profile?")) {
      const deletedIds = JSON.parse(localStorage.getItem('deleted-staff') || '[]');
      deletedIds.push(id);
      localStorage.setItem('deleted-staff', JSON.stringify(deletedIds));
      
      this.toastr.success("Staff member deleted successfully!", "Deleted");
      this.loadStaff();
    }
  }
}
