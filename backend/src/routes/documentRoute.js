import express from 'express';
const router = express.Router();
import path from 'path';
import prisma from "../config/prisma.js";
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';

// ─── GET all documents (admin/doctor usage) ────────────────────────────────
router.get('/', authUser, async (req, res) => {
  try {
    const { patientId } = req.query;
    const where = patientId ? { patientId } : {};

    const documents = await prisma.medicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: { include: { user: { select: { name: true } } } }
      }
    });

    res.json({
      success: true,
      data: documents.map(d => ({
        id: d.id,
        filename: d.filename,
        filepath: d.filepath,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadedBy: d.uploadedBy,
        patientName: d.patient?.user?.name || 'Unknown',
        createdAt: d.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── GET documents by patient ID ───────────────────────────────────────────
router.get('/patient/:patientId', authUser, async (req, res) => {
  try {
    const documents = await prisma.medicalDocument.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: { include: { user: { select: { name: true } } } }
      }
    });

    res.json({
      success: true,
      data: documents.map(d => ({
        id: d.id,
        filename: d.filename,
        filepath: d.filepath,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadedBy: d.uploadedBy,
        patientName: d.patient?.user?.name || 'Unknown',
        createdAt: d.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── GET download / stream a document ──────────────────────────────────────
router.get('/:id/download', authUser, async (req, res) => {
  try {
    const doc = await prisma.medicalDocument.findUnique({
      where: { id: req.params.id }
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path.resolve(doc.filepath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /upload — Patient self-upload (links to JWT user's patient record)
router.post('/upload', authUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Resolve the Patient record from the authenticated user's ID
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found for this user' });
    }

    const document = await prisma.medicalDocument.create({
      data: {
        patientId: patient.id,
        filename: req.file.originalname,
        filepath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: 'Patient'
      }
    });

    // Broadcast real-time update to all connected clients (doctors, etc.)
    const io = req.app.get('io');
    if (io) {
      io.emit('medicalFolderUpdated', {
        patientId: patient.id,
        event: 'documentUploaded',
        document: {
          id: document.id,
          filename: document.filename,
          fileType: document.fileType,
          fileSize: document.fileSize,
          createdAt: document.createdAt
        }
      });
    }

    res.json({ success: true, data: document });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST / — Doctor/Admin upload (existing endpoint, patientId in body) ──
router.post('/', authUser, upload.single('file'), async (req, res) => {
  try {
    const { patientId, uploadedBy } = req.body;
    if (!patientId || !req.file) {
      return res.status(400).json({ success: false, message: 'patientId and file are required' });
    }

    const document = await prisma.medicalDocument.create({
      data: {
        patientId,
        filename: req.file.originalname,
        filepath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: uploadedBy || 'Doctor'
      }
    });

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('medicalFolderUpdated', {
        patientId,
        event: 'documentUploaded',
        document: {
          id: document.id,
          filename: document.filename,
          fileType: document.fileType,
          fileSize: document.fileSize,
          createdAt: document.createdAt
        }
      });
    }

    res.json({ success: true, data: document });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE a document ─────────────────────────────────────────────────────
router.delete('/:id', authUser, async (req, res) => {
  try {
    const doc = await prisma.medicalDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    await prisma.medicalDocument.delete({ where: { id: req.params.id } });

    const io = req.app.get('io');
    if (io) {
      io.emit('medicalFolderUpdated', { patientId: doc.patientId, event: 'documentDeleted' });
    }

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
