import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authAdmin from '../middlewares/authAdmin.js';

router.get('/', authAdmin, async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'medecin', 'secretaire'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        doctor: { select: { specialty: true } },
        secretary: { select: { employeeId: true } }
      }
    });

    res.json({
      success: true,
      data: staff.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role === 'medecin' ? 'Doctor' : s.role === 'secretaire' ? 'Secretary' : 'Admin',
        specialty: s.doctor?.specialty || '',
        status: s.isActive ? 'Active' : 'Inactive'
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

export default router;
