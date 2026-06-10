import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthResponse, UserResponse } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// TypeScript interfaces corresponding to Prisma schema models for type safety
export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'medecin' | 'patient' | 'secretaire';
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  dateOfBirth?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseDoctor {
  id: string;
  userId: string;
  user?: DatabaseUser;
  specialty: string;
  licenseNumber?: string | null;
  room?: string | null;
  consultationFee: number;
  isActive: boolean;
  availableDays: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  weeklySchedule: any;
  createdAt: string;
}

export interface DatabasePatient {
  id: string;
  userId: string;
  user?: DatabaseUser;
  patientCode: string;
  gender?: string | null;
  nationalId?: string | null;
  bloodType?: string | null;
  allergies: string[];
  conditions: string[];
  medications?: string | null;
  previousSurgeries?: string | null;
  familyHistory?: string | null;
  coverageType?: string | null;
  height?: number | null;
  weight?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  insuranceProvider?: string | null;
  policyNumber?: string | null;
  createdAt: string;
}

export interface DatabaseAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: DatabasePatient;
  doctor?: DatabaseDoctor;
  date: string;
  type: string;
  mode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  notes?: string | null;
  fee: number;
  reminderSent24h: boolean;
  reminderSent1h: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabasePrescription {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: DatabasePatient;
  doctor?: DatabaseDoctor;
  medications: any; // Json
  instructions?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DatabaseInvoice {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: DatabasePatient;
  doctor?: DatabaseDoctor;
  amount: number;
  services: any; // Json
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate: string;
  paidAt?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DatabaseNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface DatabaseMedicalDocument {
  id: string;
  patientId: string;
  filename: string;
  filepath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /**
   * Get the active Supabase client instance.
   */
  public get client(): SupabaseClient {
    return this.supabase;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Authentication Layer ─────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Signs in a user using email and password.
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      if (response.error) {
        throw response.error;
      }
      return response;
    } catch (error) {
      console.error('Supabase authentication signIn error:', error);
      throw error;
    }
  }

  /**
   * Registers a new user.
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.supabase.auth.signUp({
        email,
        password
      });
      if (response.error) {
        throw response.error;
      }
      return response;
    } catch (error) {
      console.error('Supabase authentication signUp error:', error);
      throw error;
    }
  }

  /**
   * Logs out the current user.
   */
  async signOut(): Promise<{ error: any }> {
    try {
      const response = await this.supabase.auth.signOut();
      if (response.error) {
        throw response.error;
      }
      return response;
    } catch (error) {
      console.error('Supabase authentication signOut error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the current authenticated user session metadata.
   */
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await this.supabase.auth.getUser();
      if (response.error) {
        throw response.error;
      }
      return response;
    } catch (error) {
      console.error('Supabase getCurrentUser error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Doctor Methods ───────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a list of active doctors alongside their User profile details.
   */
  async getDoctors(): Promise<DatabaseDoctor[]> {
    try {
      const { data, error } = await this.supabase
        .from('Doctor')
        .select(`
          *,
          user:User(*)
        `)
        .eq('isActive', true);

      if (error) {
        throw error;
      }
      return data as DatabaseDoctor[];
    } catch (error) {
      console.error('Error fetching doctors from Supabase:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single doctor's details by their ID.
   */
  async getDoctorById(id: string): Promise<DatabaseDoctor> {
    try {
      const { data, error } = await this.supabase
        .from('Doctor')
        .select(`
          *,
          user:User(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseDoctor;
    } catch (error) {
      console.error(`Error fetching doctor ID ${id} from Supabase:`, error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Patient Methods ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a list of patients.
   */
  async getPatients(): Promise<DatabasePatient[]> {
    try {
      const { data, error } = await this.supabase
        .from('Patient')
        .select(`
          *,
          user:User(*)
        `);

      if (error) {
        throw error;
      }
      return data as DatabasePatient[];
    } catch (error) {
      console.error('Error fetching patients from Supabase:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single patient's medical records and general profile by ID.
   */
  async getPatientById(id: string): Promise<DatabasePatient> {
    try {
      const { data, error } = await this.supabase
        .from('Patient')
        .select(`
          *,
          user:User(*),
          documents:MedicalDocument(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      return data as DatabasePatient;
    } catch (error) {
      console.error(`Error fetching patient ID ${id} from Supabase:`, error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Appointment Methods ──────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves appointments, optionally filtered by doctorId, patientId, or specific date.
   */
  async getAppointments(filters?: { doctorId?: string; patientId?: string; date?: string }): Promise<DatabaseAppointment[]> {
    try {
      let query = this.supabase
        .from('Appointment')
        .select(`
          *,
          doctor:Doctor(*, user:User(*)),
          patient:Patient(*, user:User(*))
        `);

      if (filters?.doctorId) {
        query = query.eq('doctorId', filters.doctorId);
      }
      if (filters?.patientId) {
        query = query.eq('patientId', filters.patientId);
      }
      if (filters?.date) {
        query = query.eq('date', filters.date);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) {
        throw error;
      }
      return data as DatabaseAppointment[];
    } catch (error) {
      console.error('Error fetching appointments from Supabase:', error);
      throw error;
    }
  }

  /**
   * Registers a new appointment slot.
   */
  async createAppointment(appointment: Omit<DatabaseAppointment, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent24h' | 'reminderSent1h'>): Promise<DatabaseAppointment> {
    try {
      const { data, error } = await this.supabase
        .from('Appointment')
        .insert([appointment])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseAppointment;
    } catch (error) {
      console.error('Error creating appointment in Supabase:', error);
      throw error;
    }
  }

  /**
   * Updates the status of an existing appointment.
   */
  async updateAppointmentStatus(id: string, status: DatabaseAppointment['status']): Promise<DatabaseAppointment> {
    try {
      const { data, error } = await this.supabase
        .from('Appointment')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseAppointment;
    } catch (error) {
      console.error(`Error updating status for appointment ID ${id} in Supabase:`, error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Prescription Methods ─────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves prescriptions, optionally filtered by patient ID.
   */
  async getPrescriptions(patientId?: string): Promise<DatabasePrescription[]> {
    try {
      let query = this.supabase
        .from('Prescription')
        .select(`
          *,
          doctor:Doctor(*, user:User(*)),
          patient:Patient(*, user:User(*))
        `);

      if (patientId) {
        query = query.eq('patientId', patientId);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });

      if (error) {
        throw error;
      }
      return data as DatabasePrescription[];
    } catch (error) {
      console.error('Error fetching prescriptions from Supabase:', error);
      throw error;
    }
  }

  /**
   * Creates a new electronic prescription.
   */
  async createPrescription(prescription: Omit<DatabasePrescription, 'id' | 'createdAt' | 'isActive'>): Promise<DatabasePrescription> {
    try {
      const { data, error } = await this.supabase
        .from('Prescription')
        .insert([prescription])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabasePrescription;
    } catch (error) {
      console.error('Error creating prescription in Supabase:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Invoice Methods ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves invoice data, optionally filtered by patient.
   */
  async getInvoices(patientId?: string): Promise<DatabaseInvoice[]> {
    try {
      let query = this.supabase
        .from('Invoice')
        .select(`
          *,
          doctor:Doctor(*, user:User(*)),
          patient:Patient(*, user:User(*))
        `);

      if (patientId) {
        query = query.eq('patientId', patientId);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });

      if (error) {
        throw error;
      }
      return data as DatabaseInvoice[];
    } catch (error) {
      console.error('Error fetching invoices from Supabase:', error);
      throw error;
    }
  }

  /**
   * Updates an invoice payment status.
   */
  async updateInvoiceStatus(id: string, status: DatabaseInvoice['status'], paidAt?: string): Promise<DatabaseInvoice> {
    try {
      const updatePayload: Partial<DatabaseInvoice> = { status };
      if (status === 'PAID') {
        updatePayload.paidAt = paidAt || new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('Invoice')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseInvoice;
    } catch (error) {
      console.error(`Error updating status for invoice ID ${id} in Supabase:`, error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Notification Methods ─────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves notifications list for a specific user.
   */
  async getNotifications(userId: string): Promise<DatabaseNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('Notification')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) {
        throw error;
      }
      return data as DatabaseNotification[];
    } catch (error) {
      console.error(`Error fetching notifications for user ID ${userId} from Supabase:`, error);
      throw error;
    }
  }

  /**
   * Logs a new notification in the database.
   */
  async createNotification(notification: Omit<DatabaseNotification, 'id' | 'createdAt' | 'isRead'>): Promise<DatabaseNotification> {
    try {
      const { data, error } = await this.supabase
        .from('Notification')
        .insert([notification])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseNotification;
    } catch (error) {
      console.error('Error creating notification in Supabase:', error);
      throw error;
    }
  }

  /**
   * Updates notification read status.
   */
  async markNotificationAsRead(id: string): Promise<DatabaseNotification> {
    try {
      const { data, error } = await this.supabase
        .from('Notification')
        .update({ isRead: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data as DatabaseNotification;
    } catch (error) {
      console.error(`Error marking notification ID ${id} as read in Supabase:`, error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Service Methods ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves clinical services/fees mapping.
   */
  async getServices(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('Service')
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching clinic services from Supabase:', error);
      throw error;
    }
  }
}
