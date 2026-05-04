import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';

// Get notifications
router.get('/', authUser, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.body.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.put('/mark-read', authUser, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.body.userId },
      data: { isRead: true }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Clear all notifications
router.delete('/', authUser, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.body.userId }
    });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Mark single notification as read
router.patch('/:id/read', authUser, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete single notification
router.delete('/:id', authUser, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
