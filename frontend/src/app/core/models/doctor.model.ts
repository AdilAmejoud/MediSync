export interface Doctor {
  id: string;
  _id?: string; // support MongoDB/Prisma compatibility
  name: string;
  email: string;
  image: string;
  speciality?: string;
  degree?: string;
  experience?: string;
  about?: string;
  available: boolean;
  fees?: number;
  slots_booked?: Record<string, string[]>;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
  };
}
