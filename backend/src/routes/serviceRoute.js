import express from 'express';
const router = express.Router();
import prisma from "../config/prisma.js";
import authAdmin from '../middlewares/authAdmin.js';

router.get('/', authAdmin, async (req, res) => {
  try {
    // Check if services table has any records
    let services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Fallback: seed initial services from existing doctor records if empty
    if (services.length === 0) {
      const doctors = await prisma.doctor.findMany({
        include: { user: { select: { name: true } } }
      });

      const initialServices = doctors.map(d => ({
        title: `${d.specialty} Consultation`,
        speciality: d.specialty,
        fees: d.consultationFee
      }));

      // Filter unique initial services
      const unique = [];
      const seen = new Set();
      for (const s of initialServices) {
        const key = `${s.title}-${s.speciality}-${s.fees}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(s);
        }
      }

      if (unique.length > 0) {
        await prisma.service.createMany({ data: unique });
        services = await prisma.service.findMany({
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    res.json({ success: true, data: services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/', authAdmin, async (req, res) => {
  try {
    const { title, speciality, fees } = req.body;
    if (!title || !speciality || fees === undefined || fees === null) {
      return res.json({ success: false, message: 'Service title, speciality, and standard price are required.' });
    }

    const price = Number(fees);
    if (isNaN(price) || price < 0) {
      return res.json({ success: false, message: 'Please provide a valid standard price.' });
    }

    const newService = await prisma.service.create({
      data: {
        title,
        speciality,
        fees: price
      }
    });

    res.status(201).json({
      success: true,
      message: 'Service added successfully!',
      data: newService
    });
  } catch (err) {
    console.error('Error creating service:', err);
    res.json({ success: false, message: 'Failed to create service.' });
  }
});

export default router;
