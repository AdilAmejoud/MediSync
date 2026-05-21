export interface Prescription {
  id: string;
  patient: string;
  patId: string;
  date: string;
  meds: string[];
  status: 'Active' | 'Expired' | 'Renewed';
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  notes?: string;
}
