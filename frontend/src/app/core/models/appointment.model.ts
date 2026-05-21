import { User } from './user.model';

export interface Appointment {
  id: string;
  userId: string;
  user?: User;
  docId: string;
  doctor?: User;
  slotDate: string;
  slotTime: string;
  userData: any;
  docData: any;
  amount: number;
  data: number; // Timestamp
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  patientName?: string; // helper fields used in various layouts
  doctorName?: string;
  patientId?: string;
  status?: 'Confirmed' | 'Cancelled' | 'Completed' | 'Pending'; // React components mapping
}
