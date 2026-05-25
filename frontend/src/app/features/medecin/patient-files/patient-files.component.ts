import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

type TabFilter = 'All' | 'Active' | 'Inactive';

interface PatientFile {
  id: string;
  name: string;
  patientId: string;
  age: number;
  bloodType: string;
  lastVisit: string;
  clinicalUnit: string;
  status: string;
  gender: string;
  assignedDoctor: string;
}

@Component({
  selector: 'ms-medecin-patient-files',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, AvatarComponent],
  templateUrl: './patient-files.component.html',
  styleUrl: './patient-files.component.scss'
})
export class PatientFilesComponent implements OnInit {
  patientFiles = signal<PatientFile[]>([]);
  loading = signal(false);
  activeTab = signal<TabFilter>('All');
  searchQuery = signal('');

  tabs: TabFilter[] = ['All', 'Active', 'Inactive'];

  filteredFiles = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const tab = this.activeTab();
    return this.patientFiles().filter(p => {
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        p.patientId.toLowerCase().includes(query);
      const matchesTab = tab === 'All' ||
        (tab === 'Active' && p.status === 'COMPLETED') ||
        (tab === 'Inactive' && (p.status === 'CANCELLED' || p.status === 'INACTIVE'));
      return matchesSearch && matchesTab;
    });
  });

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadPatientFiles();
  }

  loadPatientFiles() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/doctor/appointments`).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          const grouped = new Map<string, any>();
          res.appointments.forEach((a: any) => {
            const name = a.userData?.name || 'Unknown';
            if (!grouped.has(name)) {
              grouped.set(name, {
                id: a.userId || a.id,
                name,
                patientId: a.userId,
                age: a.userData?.age || 0,
                bloodType: a.userData?.bloodType || '',
                lastVisit: a.slotDate,
                clinicalUnit: a.docData?.speciality || '',
                status: a.status || 'PENDING',
                gender: a.userData?.gender || '',
                assignedDoctor: a.docData?.name || ''
              });
            }
          });
          this.patientFiles.set(Array.from(grouped.values()));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setTab(tab: TabFilter) {
    this.activeTab.set(tab);
  }

  viewDossier(patient: PatientFile) {
    this.router.navigate(['/medecin/patient-files', patient.id]);
  }
}
