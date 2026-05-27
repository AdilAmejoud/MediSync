import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { ToastrService } from 'ngx-toastr';

type TabFilter = 'All' | 'Active' | 'Inactive';

interface Patient {
  id: string;
  name: string;
  age: number;
  dob: string;
  phone: string;
  email: string;
  registeredDate: string;
  assignedDoctor: string;
  gender: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'ms-secretary-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss'
})
export class PatientsComponent implements OnInit {
  patients = signal<Patient[]>([]);
  loading = signal(false);
  activeTab = signal<TabFilter>('All');
  searchQuery = signal('');

  tabs: TabFilter[] = ['All', 'Active', 'Inactive'];

  filteredPatients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();
    return this.patients().filter(p => {
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query);
      const matchesTab = tab === 'All' || p.status === tab;
      return matchesSearch && matchesTab;
    });
  });

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/patients`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.patients.set(res.data.map((p: any) => ({
            id: p.patientId,
            name: p.name,
            age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / 31557600000) : 0,
            dob: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
            phone: p.phone,
            email: p.email,
            registeredDate: p.registeredDate ? new Date(p.registeredDate).toISOString().split('T')[0] : '',
            assignedDoctor: p.assignedDoctor || '',
            gender: p.gender || '',
            status: p.status || 'Active',
          })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setTab(tab: TabFilter) {
    this.activeTab.set(tab);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
}
