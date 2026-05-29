import bcrypt from 'bcrypt';
import prisma from '../../backend/config/prisma.js';

const seedTestDatabase = async () => {
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@medisync.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@medisync.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@medisync.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'doctor@medisync.com',
      password: hashedPassword,
      role: 'medecin',
      isActive: true,
      doctor: {
        create: {
          specialty: 'Cardiology',
          licenseNumber: 'LIC-12345',
          room: '101',
          consultationFee: 300,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '17:00',
        },
      },
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@test.com' },
    update: {},
    create: {
      name: 'John Patient',
      email: 'patient@test.com',
      password: hashedPassword,
      role: 'patient',
      isActive: true,
      patient: {
        create: {
          gender: 'Male',
          bloodType: 'O+',
        },
      },
    },
  });

  const secretaireUser = await prisma.user.upsert({
    where: { email: 'secretaire@test.com' },
    update: {},
    create: {
      name: 'Jane Secretaire',
      email: 'secretaire@test.com',
      password: hashedPassword,
      role: 'secretaire',
      isActive: true,
      secretary: {
        create: {},
      },
    },
  });

  return { adminUser, doctorUser, patientUser, secretaireUser };
};

const clearTestDatabase = async () => {
  await prisma.authToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.careSheet.deleteMany();
  await prisma.medicalDocument.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.secretary.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();
};

export { seedTestDatabase, clearTestDatabase };
