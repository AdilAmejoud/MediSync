const mockUsers = {
  admin: {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@medisync.com',
    password: '$2b$10$hashed_admin_password',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  doctorUser: {
    id: 'doctor-001',
    name: 'Dr. Smith',
    email: 'doctor@medisync.com',
    password: '$2b$10$hashed_doctor_password',
    role: 'medecin',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  patientUser: {
    id: 'patient-001',
    name: 'John Patient',
    email: 'patient@test.com',
    password: '$2b$10$hashed_patient_password',
    role: 'patient',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  secretaireUser: {
    id: 'secretary-001',
    name: 'Jane Secretaire',
    email: 'secretaire@test.com',
    password: '$2b$10$hashed_secretary_password',
    role: 'secretaire',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
};

const mockDoctor = {
  id: 'doctor-record-001',
  userId: 'doctor-001',
  specialty: 'Cardiology',
  licenseNumber: 'LIC-12345',
  room: '101',
  consultationFee: 300,
  isActive: true,
  availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
};

const mockPatient = {
  id: 'patient-record-001',
  userId: 'patient-001',
  patientCode: 'PAT-001',
  gender: 'Male',
  bloodType: 'O+',
  allergies: ['Penicillin'],
  conditions: ['Hypertension'],
  emergencyContactName: 'Emergency Contact',
  emergencyContactPhone: '+1234567890',
};

const mockSecretary = {
  id: 'secretary-record-001',
  userId: 'secretary-001',
  employeeId: 'EMP-001',
};

const mockAppointment = {
  id: 'apt-001',
  patientId: 'patient-record-001',
  doctorId: 'doctor-record-001',
  date: new Date(Date.now() + 86400000),
  type: 'General Visit',
  mode: 'In-Person',
  status: 'PENDING',
  fee: 300,
  reminderSent24h: false,
  reminderSent1h: false,
};

const mockInvoice = {
  id: 'inv-001',
  patientId: 'patient-record-001',
  doctorId: 'doctor-record-001',
  amount: 300,
  services: [{ name: 'Consultation', cost: 300 }],
  status: 'PENDING',
  dueDate: new Date(Date.now() + 30 * 86400000),
};

const mockPrescription = {
  id: 'presc-001',
  patientId: 'patient-record-001',
  doctorId: 'doctor-record-001',
  medications: [{ name: 'Aspirin', dosage: '100mg', frequency: 'Once daily' }],
  isActive: true,
};

export {
  mockUsers,
  mockDoctor,
  mockPatient,
  mockSecretary,
  mockAppointment,
  mockInvoice,
  mockPrescription,
};
