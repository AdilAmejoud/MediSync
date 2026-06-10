import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (p) => bcrypt.hashSync(p, 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@medisync.com' },
    update: {},
    create: {
      name: 'Dr. Sarah Jenkins',
      email: 'admin@medisync.com',
      password: hash('Admin@123'),
      role: 'admin',
      phone: '+212600000001'
    }
  });

  // Doctors
  const doctorData = [
    { name: 'Dr. Mick Thompson', email: 'mick@medisync.com', specialty: 'Cardiology', room: 'Room 101', fee: 500 },
    { name: 'Dr. Sarah Johnson', email: 'sarah@medisync.com', specialty: 'Orthopedics', room: 'Room 102', fee: 600 },
    { name: 'Dr. Emily Carter', email: 'emily@medisync.com', specialty: 'Pediatrics', room: 'Room 201', fee: 400 },
    { name: 'Dr. Alex Morgan', email: 'alex@medisync.com', specialty: 'Neurology', room: 'Room 202', fee: 550 },
    { name: 'Dr. David Lee', email: 'david@medisync.com', specialty: 'Dermatology', room: 'Lab 01', fee: 450 },
  ];

  for (const d of doctorData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name, email: d.email,
        password: hash('Doctor@123'), role: 'medecin'
      }
    });
    await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, specialty: d.specialty,
        room: d.room, consultationFee: d.fee, isActive: true
      }
    });
  }

  // Patients
  const patientData = [
    { name: 'John Doe', email: 'john@medisync.com', blood: 'O+' },
    { name: 'Sarah Connor', email: 'sarah.c@medisync.com', blood: 'A+' },
    { name: 'Marcus Aurelius', email: 'marcus@medisync.com', blood: 'B+' },
    { name: 'Diana Prince', email: 'diana@medisync.com', blood: 'AB-' },
    { name: 'Alberto Ripley', email: 'alberto@medisync.com', blood: 'O-' },
  ];

  for (const p of patientData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.name, email: p.email,
        password: hash('Patient@123'), role: 'patient'
      }
    });
    await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, bloodType: p.blood,
        pulse: 75, spo2: 98, temperature: 36.8,
        heartRate: 72, weight: 75, height: 175
      }
    });
  }

  // Secretary
  const secUser = await prisma.user.upsert({
    where: { email: 'secretary@medisync.com' },
    update: {},
    create: {
      name: 'Sarah Jenkins',
      email: 'secretary@medisync.com',
      password: hash('Secretary@123'),
      role: 'secretaire'
    }
  });
  await prisma.secretary.upsert({
    where: { userId: secUser.id },
    update: {},
    create: { userId: secUser.id }
  });

  // Create appointments for the last 12 months
  const doctors = await prisma.doctor.findMany({ take: 3 });
  const patients = await prisma.patient.findMany({ take: 4 });
  const statuses = ['COMPLETED','COMPLETED','COMPLETED','CANCELLED','PENDING','CONFIRMED'];
  const types = ['General Visit','Follow-up','Emergency','Specialist'];
  const modes = ['In-Person','Online'];

  for (let m = 0; m < 12; m++) {
    const count = Math.floor(Math.random() * 20) + 10;
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      date.setDate(Math.floor(Math.random() * 28) + 1);
      date.setHours(9 + Math.floor(Math.random() * 8));
      date.setMinutes([0,30][Math.floor(Math.random()*2)]);
      const doctor = doctors[Math.floor(Math.random()*doctors.length)];
      const patient = patients[Math.floor(Math.random()*patients.length)];
      await prisma.appointment.create({
        data: {
          doctorId: doctor.id,
          patientId: patient.id,
          date,
          type: types[Math.floor(Math.random()*types.length)],
          mode: modes[Math.floor(Math.random()*modes.length)],
          status: statuses[Math.floor(Math.random()*statuses.length)],
          fee: doctor.consultationFee,
        }
      });
    }
  }

  // Invoices
  const allPatients = await prisma.patient.findMany({ take: 4 });
  const allDoctors = await prisma.doctor.findMany({ take: 3 });
  const invoiceStatuses = ['PAID','PAID','PAID','PENDING','OVERDUE'];
  for (let i = 0; i < 15; i++) {
    const p = allPatients[i % allPatients.length];
    const d = allDoctors[i % allDoctors.length];
    const due = new Date();
    due.setDate(due.getDate() + (i % 3 === 0 ? -3 : i % 3 === 1 ? 1 : 7));
    await prisma.invoice.create({
      data: {
        patientId: p.id,
        doctorId: d.id,
        amount: d.consultationFee,
        services: [{ name: 'Consultation', qty: 1, price: d.consultationFee }],
        status: invoiceStatuses[i % invoiceStatuses.length],
        dueDate: due,
        paidAt: invoiceStatuses[i % invoiceStatuses.length] === 'PAID' ? new Date() : null
      }
    });
  }

  console.log('Seed complete. Test credentials:');
  console.log('Admin:     admin@medisync.com / Admin@123');
  console.log('Doctor:    mick@medisync.com  / Doctor@123');
  console.log('Patient:   john@medisync.com  / Patient@123');
  console.log('Secretary: secretary@medisync.com / Secretary@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
