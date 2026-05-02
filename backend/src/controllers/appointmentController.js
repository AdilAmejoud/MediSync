import prisma from '../config/prisma.js';
import QRCode from 'qrcode';

export const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId, patientId, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate()+1);
      where.date = { gte: d, lt: next };
    }
    const appointments = await prisma.appointment.findMany({
      where, orderBy: { date: 'desc' }, take: 50,
      include: {
        patient: { include: { user: { select: { name:true, email:true } } } },
        doctor: { include: { user: { select: { name:true } } } }
      }
    });
    const mapped = appointments.map(a => ({
      ...a,
      slotDate: a.date.toISOString().split('T')[0],
      slotTime: a.date.toTimeString().slice(0, 5)
    }));
    res.json({ success: true, appointments: mapped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, type, mode, notes, fee } = req.body;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    const appointment = await prisma.appointment.create({
      data: {
        patientId, doctorId, notes, type, mode,
        date: new Date(date),
        fee: fee || doctor?.consultationFee || 300,
        status: 'PENDING'
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });
    res.status(201).json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create appointment' });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, date } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (date) updateData.date = new Date(date);
    
    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    if (status === 'CONFIRMED') {
      // Notify Patient
      await prisma.notification.create({
        data: {
          userId: appointment.patient.user.id,
          title: "Appointment Approved",
          message: `Your appointment with ${appointment.doctor.user.name} on ${appointment.date.toLocaleString('en-US')} has been approved.`,
          type: "success"
        }
      });
      // Notify Doctor
      await prisma.notification.create({
        data: {
          userId: appointment.doctor.user.id,
          title: "New Confirmed Appointment",
          message: `A new appointment has been confirmed with patient ${appointment.patient.user.name} for ${appointment.date.toLocaleString('en-US')}.`,
          type: "success"
        }
      });
    } else if (date) {
      // Notify Patient
      await prisma.notification.create({
        data: {
          userId: appointment.patient.user.id,
          title: "Appointment Rescheduled",
          message: `Your appointment with ${appointment.doctor.user.name} has been rescheduled to ${appointment.date.toLocaleString('en-US')}.`,
          type: "warning"
        }
      });
      // Notify Doctor
      await prisma.notification.create({
        data: {
          userId: appointment.doctor.user.id,
          title: "Appointment Rescheduled",
          message: `Your appointment with ${appointment.patient.user.name} has been rescheduled to ${appointment.date.toLocaleString('en-US')}.`,
          type: "warning"
        }
      });
    }

    res.json({ success: true, appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.update({
      where: { id }, data: { status: 'CANCELLED' }
    });
    res.json({ success: true, appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
};

export const patientCheckIn = async (req, res) => {
  try {
    const patientUserId = req.user.id;
    const { clinicId } = req.body;

    if (!clinicId) {
      return res.json({ success: false, message: 'Invalid QR code' });
    }

    const patient = await prisma.patient.findUnique({ where: { userId: patientUserId } });
    if (!patient) {
      return res.json({ success: false, message: 'Patient not found' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        date: { gte: today, lt: tomorrow },
        status: 'CONFIRMED'
      },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        patient: { include: { user: { select: { name: true, id: true } } } }
      }
    });

    if (!appointment) {
      return res.json({ success: false, message: 'No confirmed appointment found for today' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CHECKED_IN' },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        patient: { include: { user: { select: { name: true, id: true } } } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('patientCheckedIn', {
        id: updated.id,
        patientName: updated.patient.user.name,
        userId: updated.patient.user.id,
        doctorName: updated.doctor.user.name,
        doctorId: updated.doctorId,
        status: 'CHECKED_IN',
        slotDate: updated.date.toISOString().split('T')[0],
        slotTime: updated.date.toTimeString().slice(0, 5),
        type: updated.type,
        mode: updated.mode
      });
    }

    res.json({ success: true, message: 'Check-in successful', data: { id: updated.id, status: 'CHECKED_IN' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Check-in failed' });
  }
};

export const generateClinicQR = async (req, res) => {
  try {
    const payload = JSON.stringify({
      clinicId: 'medisync',
      timestamp: new Date().toISOString(),
      version: '1'
    });
    const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
    res.json({ success: true, data: { qrDataUrl, payload } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'QR generation failed' });
  }
};
