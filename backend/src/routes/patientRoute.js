import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';

router.get('/', authUser, async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true, address: true, city: true, postalCode: true, dateOfBirth: true } },
        appointments: { take: 1, orderBy: { createdAt: 'desc' }, select: { doctor: { include: { user: { select: { name: true } } } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: patients.map(p => ({
        id: p.id,
        patientId: p.patientCode,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone || '',
        address: p.user.address || '',
        city: p.user.city || '',
        postalCode: p.user.postalCode || '',
        gender: p.gender || '',
        nationalId: p.nationalId || '',
        status: p.user.isActive ? 'Active' : 'Inactive',
        dateOfBirth: p.user.dateOfBirth,
        bloodType: p.bloodType || '',
        allergies: (p.allergies || []).join(', '),
        medications: p.medications || '',
        previousSurgeries: p.previousSurgeries || '',
        familyHistory: p.familyHistory || '',
        insuranceProvider: p.insuranceProvider || '',
        policyNumber: p.policyNumber || '',
        coverageType: p.coverageType || '',
        emergencyContactName: p.emergencyContactName || '',
        emergencyContactPhone: p.emergencyContactPhone || '',
        registeredDate: p.createdAt,
        assignedDoctor: p.appointments[0]?.doctor?.user?.name || ''
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/:id', authUser, async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id: req.params.id }, { patientCode: req.params.id }, { userId: req.params.id }]
      },
      include: {
        user: {
          select: { name: true, email: true, phone: true, address: true, city: true, dateOfBirth: true, isActive: true }
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            doctor: { include: { user: { select: { name: true } } } }
          }
        },
        documents: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        prescriptions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const bmi = (patient.height && patient.weight)
      ? (patient.weight / ((patient.height / 100) ** 2)).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        id: patient.id,
        patientCode: patient.patientCode,
        name: patient.user.name,
        email: patient.user.email,
        phone: patient.user.phone || '',
        address: patient.user.address || '',
        city: patient.user.city || '',
        gender: patient.gender || '',
        dateOfBirth: patient.user.dateOfBirth,
        bloodType: patient.bloodType || '',
        status: patient.user.isActive ? 'Active' : 'Inactive',
        allergies: patient.allergies || [],
        conditions: patient.conditions || [],
        height: patient.height,
        weight: patient.weight,
        bmi: bmi ? parseFloat(bmi) : null,
        pulse: patient.pulse,
        spo2: patient.spo2,
        temperature: patient.temperature,
        heartRate: patient.heartRate,
        appointments: patient.appointments.map(a => ({
          id: a.id,
          date: a.date,
          type: a.type,
          mode: a.mode,
          status: a.status,
          doctor: a.doctor?.user?.name || 'Unknown',
          notes: a.notes || ''
        })),
        documents: patient.documents.map(d => ({
          id: d.id,
          filename: d.filename,
          filepath: d.filepath,
          fileType: d.fileType,
          fileSize: d.fileSize,
          uploadedBy: d.uploadedBy,
          createdAt: d.createdAt
        })),
        prescriptions: patient.prescriptions.map(p => ({
          id: p.id,
          medications: p.medications,
          instructions: p.instructions,
          notes: p.notes,
          isActive: p.isActive,
          createdAt: p.createdAt
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authUser, async (req, res) => {
  try {
    const {
      bloodType, allergies, conditions,
      height, weight, pulse, spo2, temperature, heartRate,
      emergencyContactName, emergencyContactPhone,
      insuranceProvider, policyNumber
    } = req.body;

    const data = {};
    if (bloodType !== undefined) data.bloodType = bloodType;
    if (allergies !== undefined) data.allergies = allergies;
    if (conditions !== undefined) data.conditions = conditions;
    if (height !== undefined) {
      const h = Number(height);
      if (isNaN(h) || h <= 0) return res.status(400).json({ success: false, message: 'height must be a positive number' });
      data.height = h;
    }
    if (weight !== undefined) {
      const w = Number(weight);
      if (isNaN(w) || w <= 0) return res.status(400).json({ success: false, message: 'weight must be a positive number' });
      data.weight = w;
    }
    if (pulse !== undefined) data.pulse = Number(pulse);
    if (spo2 !== undefined) data.spo2 = Number(spo2);
    if (temperature !== undefined) data.temperature = Number(temperature);
    if (heartRate !== undefined) data.heartRate = Number(heartRate);
    if (emergencyContactName !== undefined) data.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) data.emergencyContactPhone = emergencyContactPhone;
    if (insuranceProvider !== undefined) data.insuranceProvider = insuranceProvider;
    if (policyNumber !== undefined) data.policyNumber = policyNumber;

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data
    });

    // Broadcast real-time vitals update to doctors viewing this patient's dossier
    const io = req.app.get('io');
    if (io) {
      io.emit('medicalFolderUpdated', {
        patientId: req.params.id,
        event: 'vitalsUpdated'
      });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
