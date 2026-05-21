export interface Patient {
  id: string;
  _id?: string;
  name: string;
  email: string;
  image: string;
  address?: {
    line1?: string;
    line2?: string;
  };
  gender?: string;
  dob?: string;
  phone?: string;
  status?: 'Active' | 'Inactive'; // matching React components like OperationsPatients
}
