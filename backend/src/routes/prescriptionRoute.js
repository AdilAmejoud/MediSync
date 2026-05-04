import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';

router.get('/', authUser, async (req, res) => {
  try {
    const where = {};
    if (req.query.patientId) {
      where.patientId = req.query.patientId;
    }
    const prescriptions = await prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        patient: { include: { user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } }
      }
    });

    res.json({
      success: true,
      data: prescriptions.map(p => ({
        id: p.id,
        patientName: p.patient?.user?.name || 'Unknown',
        doctorName: p.doctor?.user?.name || 'Unknown',
        doctorId: p.doctorId,
        specialty: p.doctor?.specialty || 'General Medicine',
        medications: p.medications,
        instructions: p.instructions || '',
        notes: p.notes || '',
        isActive: p.isActive,
        createdAt: p.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

router.get('/:id', authUser, async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true } } } }
      }
    });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }
    res.json({
      success: true,
      data: {
        id: prescription.id,
        patientName: prescription.patient?.user?.name || 'Unknown',
        doctorName: prescription.doctor?.user?.name || 'Unknown',
        specialty: prescription.doctor?.specialty || 'General Medicine',
        medications: prescription.medications,
        instructions: prescription.instructions || '',
        notes: prescription.notes || '',
        isActive: prescription.isActive,
        createdAt: prescription.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authUser, async (req, res) => {
  try {
    const { patientId, doctorId, medications, instructions, notes } = req.body;
    if (!patientId || !doctorId || !medications) {
      return res.status(400).json({ success: false, message: "patientId, doctorId, and medications are required" });
    }
    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        medications: medications || [],
        instructions: instructions || '',
        notes: notes || ''
      }
    });
    res.json({ success: true, data: prescription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/toggle-status', authUser, async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({ where: { id: req.params.id } });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }
    const updated = await prisma.prescription.update({
      where: { id: req.params.id },
      data: { isActive: !prescription.isActive }
    });
    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authUser, async (req, res) => {
  try {
    await prisma.prescription.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Prescription deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
