import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

interface StyledPatient {
  id: string;
  name: string;
  patientId: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  avatarColor?: string;
  initials?: string;
}

@Component({
  selector: 'ms-admin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss'
})
export class PatientsComponent implements OnInit {
  patients = signal<StyledPatient[]>([]);
  loading = signal(false);

  // Search and Filter States
  searchQuery = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Filtered Patients List
  filteredPatients = computed(() => {
    let list = this.patients();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.activeFilter();

    // 1. Search Query filter (name or ID)
    if (query) {
      list = list.filter(p => 
        (p.name || '').toLowerCase().includes(query) || 
        (p.patientId || '').toLowerCase().includes(query)
      );
    }

    // 2. Status Segment filter
    if (status === 'active') {
      list = list.filter(p => p.status.toLowerCase() === 'active');
    } else if (status === 'inactive') {
      list = list.filter(p => p.status.toLowerCase() === 'inactive');
    }

    return list;
  });

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/patients`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED'];
          
          this.patients.set(res.data.map((p: any, idx: number) => {
            const initials = (p.name || '')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase();

            return {
              id: p.id,
              name: p.name,
              patientId: p.patientId || `PT-${p.id.slice(-4).toUpperCase()}`,
              email: p.email,
              phone: p.phone || '—',
              gender: p.gender || '—',
              status: p.status || 'Active',
              avatarColor: colors[idx % colors.length],
              initials: initials || 'PT'
            };
          }));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error("Failed to load patient records");
      }
    });
  }
}
