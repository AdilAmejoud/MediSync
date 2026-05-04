import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';

router.get('/', authUser, async (req, res) => {
  try {
    const sheets = await prisma.careSheet.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Resolve patient & doctor names from their respective tables
    // CareSheet has no Prisma relations — patientId/doctorId are plain strings
    const patientIds = [...new Set(sheets.map(s => s.patientId).filter(Boolean))];
    const doctorIds  = [...new Set(sheets.map(s => s.doctorId).filter(Boolean))];

    const [patients, doctors] = await Promise.all([
      patientIds.length
        ? prisma.patient.findMany({
            where: { id: { in: patientIds } },
            select: { id: true, patientCode: true, user: { select: { name: true } } },
          })
        : [],
      doctorIds.length
        ? prisma.doctor.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, user: { select: { name: true } } },
          })
        : [],
    ]);

    const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));
    const doctorMap  = Object.fromEntries(doctors.map(d => [d.id, d]));

    res.json({
      success: true,
      data: sheets.map(s => ({
        id: s.id.slice(0, 8).toUpperCase(),
        patientName: patientMap[s.patientId]?.user?.name || 'Unknown',
        patientId: patientMap[s.patientId]?.patientCode || s.patientId,
        doctorName: doctorMap[s.doctorId]?.user?.name || 'Unknown',
        date: s.consultationDate.toISOString().split('T')[0],
        actsCount: Array.isArray(s.medicalActs) ? s.medicalActs.length : 0,
        insuranceName: s.insuranceProvider || '',
        totalAmount: s.totalAmount,
        status: s.status
      }))
    });
  } catch (err) {
    console.error('[care-sheets GET]', err);
    res.status(500).json({ error: 'Failed to fetch care sheets', detail: err.message });
  }
});


router.put('/:id', authUser, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Draft', 'Submitted', 'Reimbursed'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const existing = await prisma.careSheet.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Care sheet not found" });
    }
    if (existing.status === 'Draft' && status !== 'Submitted') {
      return res.status(400).json({ success: false, message: "Draft can only transition to Submitted" });
    }
    if (existing.status === 'Submitted' && status !== 'Reimbursed') {
      return res.status(400).json({ success: false, message: "Submitted can only transition to Reimbursed" });
    }

    const updated = await prisma.careSheet.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authUser, async (req, res) => {
  try {
    const { patientId, doctorId, consultationDate, medicalActs, insuranceProvider, policyNumber, totalAmount, status } = req.body;
    if (!patientId || !doctorId || !consultationDate) {
      return res.status(400).json({ success: false, message: "patientId, doctorId, and consultationDate are required" });
    }
    const sheet = await prisma.careSheet.create({
      data: {
        patientId,
        doctorId,
        consultationDate: new Date(consultationDate),
        medicalActs: medicalActs || [],
        insuranceProvider: insuranceProvider || '',
        policyNumber: policyNumber || '',
        totalAmount: totalAmount || 0,
        status: status || 'Draft'
      }
    });
    res.json({ success: true, data: sheet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
