export interface Invoice {
  id: string; // INV-XXXX
  patientName: string;
  patientId: string;
  doctorName: string;
  service: string;
  date: string;
  amountMAD: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod?: 'Cash' | 'Card' | 'Transfer';
  notes?: string;
}
