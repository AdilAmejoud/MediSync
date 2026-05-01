import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const docData = await prisma.doctor.findUnique({
      where: { userId: docId },
    });

    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    await prisma.doctor.update({
      where: { userId: docId },
      data: { isActive: !docData.isActive },
    });

    res.json({ success: true, message: "Availability changed successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            avatar: true, address: true, phone: true,
          },
        },
        appointments: {
          where: { status: "COMPLETED" },
          select: { id: true }
        }
      },
    });

    const mapped = doctors.map((d) => ({
      id: d.user.id,
      _id: d.id,
      name: d.user.name,
      email: d.user.email,
      image: d.user.avatar,
      speciality: d.specialty,
      degree: d.room || "",
      experience: "12+ Years Experience",
      about: "Dedicated medical professional focused on providing exceptional clinical care and personalized treatment plans for all patients.",
      available: d.isActive,
      fees: d.consultationFee,
      address: d.user.address,
      slots_booked: {},
      phone: d.user.phone,
      consultsCount: d.appointments.length
    }));

    res.json({ success: true, doctors: mapped });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: "Email and password are required" });
    }

    const doctor = await prisma.user.findFirst({
      where: { email, role: "medecin" },
    });

    if (!doctor) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    if (doctor.twoFactorEnabled) {
      return res.json({
        success: true, requires2FA: true, userId: doctor.id,
        role: "medecin"
      });
    }

    const token = jwt.sign({ id: doctor.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true, token,
      user: { id: doctor.id, name: doctor.name, email: doctor.email, role: doctor.role, avatar: doctor.avatar }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const { startDate, endDate } = req.query;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const whereClause = { doctorId: doctor.id, status: { not: "PENDING" } };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
      include: {
        patient: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });

    const mapped = appointments.map((a) => ({
      id: a.id,
      userId: a.patient.user.id,
      docId,
      userData: a.patient.user,
      slotDate: a.date.toISOString().split("T")[0],
      slotTime: a.date.toTimeString().slice(0, 5),
      amount: a.fee,
      data: a.createdAt.getTime(),
      cancelled: a.status === "CANCELLED",
      payment: false,
      isCompleted: a.status === "COMPLETED",
      status: a.status,
      type: a.type,
      mode: a.mode,
      notes: a.notes,
    }));

    res.json({ success: true, appointments: mapped });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const blockTime = async (req, res) => {
  try {
    const { docId, date, startTime, endTime, reason } = req.body;
    if (!docId || !date || !startTime || !endTime) {
      return res.json({ success: false, message: "docId, date, startTime, and endTime are required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const slot = await prisma.unavailableSlot.create({
      data: {
        doctorId: doctor.id,
        date: new Date(date),
        startTime,
        endTime,
        reason: reason || null,
      },
    });

    res.json({ success: true, data: slot });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getBlockedSlots = async (req, res) => {
  try {
    const { docId, startDate, endDate } = req.query;
    if (!docId || !startDate || !endDate) {
      return res.json({ success: false, message: "docId, startDate, and endDate are required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const slots = await prisma.unavailableSlot.findMany({
      where: {
        doctorId: doctor.id,
        date: { gte: new Date(startDate), lte: new Date(endDate + "T23:59:59.999Z") },
      },
      orderBy: { date: "asc" },
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    if (!docId || !appointmentId) {
      return res.json({ success: false, message: "Doctor ID and Appointment ID are required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (appointmentData && appointmentData.doctorId === doctor.id) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "COMPLETED" },
      });

      const existingInvoice = await prisma.invoice.findFirst({
        where: { patientId: appointmentData.patientId, doctorId: doctor.id, status: "PENDING" }
      });

      if (!existingInvoice) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        await prisma.invoice.create({
          data: {
            patientId: appointmentData.patientId,
            doctorId: doctor.id,
            amount: appointmentData.fee || 300,
            services: [{ name: "Consultation", amount: appointmentData.fee || 300 }],
            status: "PENDING",
            dueDate,
            notes: `Auto-generated for completed appointment ${appointmentData.id}`
          }
        });
      }

      return res.json({ success: true, message: "Appointment Completed", invoiceCreated: true });
    } else {
      return res.json({ success: false, message: "Mark failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    if (!docId || !appointmentId) {
      return res.json({ success: false, message: "Doctor ID and Appointment ID are required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (appointmentData && appointmentData.doctorId === doctor.id) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });
      return res.json({ success: true, message: "Appointment Cancelled" });
    } else {
      return res.json({ success: false, message: "Cancelled failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id, status: { not: "PENDING" } },
      orderBy: { date: "desc" },
      include: {
        patient: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    const patientIds = [...new Set(appointments.map((a) => a.patient.user.id))];

    const latestAppointments = appointments.slice(0, 5).map((a) => ({
      id: a.id,
      userId: a.patient.user.id,
      docId,
      slotDate: a.date.toISOString().split("T")[0],
      slotTime: a.date.toTimeString().slice(0, 5),
      amount: a.fee,
      cancelled: a.status === "CANCELLED",
      isCompleted: a.status === "COMPLETED",
    }));

    res.json({
      success: true,
      dashData: {
        appointments: appointments.length,
        patients: patientIds.length,
        latestAppointments,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: docId },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            avatar: true, address: true, phone: true,
          },
        },
      },
    });

    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const profileData = {
      id: doctor.user.id,
      _id: doctor.id,
      name: doctor.user.name,
      email: doctor.user.email,
      image: doctor.user.avatar,
      speciality: doctor.specialty,
      degree: doctor.room || "",
      experience: "",
      about: "",
      available: doctor.isActive,
      fees: doctor.consultationFee,
      address: doctor.user.address,
      slots_booked: {},
      phone: doctor.user.phone,
      availableDays: doctor.availableDays,
      startTime: doctor.startTime,
      endTime: doctor.endTime,
      slotDuration: doctor.slotDuration,
      weeklySchedule: doctor.weeklySchedule,
    };

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available, availableDays, startTime, endTime, slotDuration, weeklySchedule } = req.body;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const updateData = {};
    if (fees !== undefined) updateData.consultationFee = Number(fees);
    if (available !== undefined) updateData.isActive = Boolean(available);

    if (weeklySchedule !== undefined) {
      updateData.weeklySchedule = weeklySchedule;
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const enabledDays = dayKeys.filter(d => weeklySchedule[d]?.enabled === true);
      const enabledFullDays = enabledDays.map(d => d.charAt(0).toUpperCase() + d.slice(1));
      updateData.availableDays = enabledFullDays;

      let minStart = '23:59';
      let maxEnd = '00:00';
      for (const d of enabledDays) {
        const cfg = weeklySchedule[d];
        if (cfg?.startTime && cfg.startTime < minStart) minStart = cfg.startTime;
        if (cfg?.endTime && cfg.endTime > maxEnd) maxEnd = cfg.endTime;
      }
      if (minStart !== '23:59') updateData.startTime = minStart;
      if (maxEnd !== '00:00') updateData.endTime = maxEnd;
    } else {
      if (availableDays !== undefined) updateData.availableDays = availableDays;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
    }

    if (slotDuration !== undefined) updateData.slotDuration = Number(slotDuration);

    if (Object.keys(updateData).length > 0) {
      await prisma.doctor.update({
        where: { userId: docId },
        data: updateData,
      });
    }

    if (address !== undefined) {
      await prisma.user.update({
        where: { id: docId },
        data: { address: typeof address === "string" ? JSON.parse(address) : address },
      });
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentStart = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    if (!docId || !appointmentId) {
      return res.json({ success: false, message: "Doctor ID and Appointment ID are required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: docId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (appointmentData && appointmentData.doctorId === doctor.id) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "IN_CONSULTATION" },
      });
      return res.json({ success: true, message: "Appointment started" });
    } else {
      return res.json({ success: false, message: "Start failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  appointmentStart,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  blockTime,
  getBlockedSlots,
};
