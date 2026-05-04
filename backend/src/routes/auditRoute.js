import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authAdmin from '../middlewares/authAdmin.js';

router.get('/', authAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

    res.json({
      success: true,
      data: logs.map(log => ({
        timestamp: log.createdAt,
        action: log.action + (log.resource ? ` — ${log.resource}` : ''),
        ip: log.ipAddress || '—',
        status: log.status === 'SUCCESS' ? 'Success' : log.status === 'FAILED' ? 'Failed' : 'Warning',
        user: log.user?.name || 'System'
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
