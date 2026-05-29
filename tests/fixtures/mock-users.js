const roles = ['admin', 'medecin', 'patient', 'secretaire'];

const roleDescriptions = {
  admin: 'System administrator — full system access',
  medecin: 'Medical practitioner — manages appointments, prescriptions, patients',
  patient: 'End-user who registers and books appointments',
  secretaire: 'Front-desk staff — manages scheduling, invoices, patient check-in',
};

const mockUsersByRole = {
  admin: {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@medisync.com',
    role: 'admin',
    isActive: true,
  },
  medecin: {
    id: 'doctor-001',
    name: 'Dr. Smith',
    email: 'doctor@medisync.com',
    role: 'medecin',
    isActive: true,
    doctor: {
      id: 'doctor-record-001',
      specialty: 'Cardiology',
      room: '101',
      consultationFee: 300,
    },
  },
  patient: {
    id: 'patient-001',
    name: 'John Patient',
    email: 'patient@test.com',
    role: 'patient',
    isActive: true,
    patient: {
      id: 'patient-record-001',
      patientCode: 'PAT-001',
      bloodType: 'O+',
    },
  },
  secretaire: {
    id: 'secretary-001',
    name: 'Jane Secretaire',
    email: 'secretaire@test.com',
    role: 'secretaire',
    isActive: true,
    secretary: {
      id: 'secretary-record-001',
      employeeId: 'EMP-001',
    },
  },
};

export { roles, roleDescriptions, mockUsersByRole };
