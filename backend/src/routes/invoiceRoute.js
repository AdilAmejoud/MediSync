import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';

function parseServices(services) {
  if (Array.isArray(services)) return services.map(s => s.name || s.serviceName || s).join(', ');
  if (typeof services === 'string') {
    try { return JSON.parse(services).map(s => s.name || s.serviceName || s).join(', '); }
    catch { return services; }
  }
  return String(services);
}

router.get('/', authUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { patient: true }
    });

    let whereClause = {};
    if (user && user.role === 'patient') {
      if (user.patient) {
        whereClause = { patientId: user.patient.id };
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        patient: { include: { user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } }
      }
    });

    res.json({
      success: true,
      data: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.id.slice(0, 8).toUpperCase(),
        patientName: inv.patient?.user?.name || 'Unknown',
        patientId: inv.patient?.patientCode || inv.patientId,
        doctorName: inv.doctor?.user?.name || '',
        service: parseServices(inv.services),
        services: (() => {
          if (Array.isArray(inv.services)) return inv.services;
          if (typeof inv.services === 'string') {
            try { return JSON.parse(inv.services); }
            catch { return []; }
          }
          return [];
        })(),
        date: inv.createdAt.toISOString().split('T')[0],
        amountMAD: inv.amount,
        status: inv.status === 'PAID' ? 'Paid' : inv.status === 'PENDING' ? 'Pending' : 'Overdue',
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        reviewedAt: inv.reviewedAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/', authUser, async (req, res) => {
  try {
    const { patientId, doctorId, amount, services, dueDate, notes } = req.body;
    if (!patientId || !amount) {
      return res.status(400).json({ success: false, message: "patientId and amount are required" });
    }
    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        doctorId: doctorId || '',
        amount: Number(amount),
        services: services || [],
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: notes || '',
        status: 'PENDING'
      }
    });
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/pay', authUser, async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() }
    });
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/review', authUser, async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { reviewedAt: new Date() }
    });
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
