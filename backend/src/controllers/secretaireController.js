import prisma from "../config/prisma.js";

export const checkInPatient = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.json({ success: false, message: "Appointment ID is required" });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } } }
    });
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CHECKED_IN" }
    });

    res.json({
      success: true,
      message: "Patient checked in successfully",
      data: {
        id: appointment.id,
        patientName: appointment.patient.user.name,
        status: "CHECKED_IN"
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const cancelAdmission = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.json({ success: false, message: "Appointment ID is required" });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } } }
    });
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" }
    });

    res.json({
      success: true,
      message: "Admission cancelled",
      data: {
        id: appointment.id,
        patientName: appointment.patient.user.name,
        status: "CANCELLED"
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const collectPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.json({ success: false, message: "Invoice ID is required" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { patient: { include: { user: true } } }
    });
    if (!invoice) {
      return res.json({ success: false, message: "Invoice not found" });
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date() }
    });

    res.json({
      success: true,
      message: "Payment collected",
      data: {
        id: invoice.id,
        patientName: invoice.patient.user.name,
        amount: invoice.amount,
        status: "PAID"
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const registerWalkIn = async (req, res) => {
  try {
    const { name, age, phone, reason, doctorId } = req.body;
    if (!name) {
      return res.json({ success: false, message: "Patient name is required" });
    }
    if (!doctorId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: `walkin-${Date.now()}@medisync.com`,
        password: "temporary",
        role: "patient",
        phone: phone || null
      }
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientCode: `WK-${Date.now().toString(36).toUpperCase()}`,
        weight: age ? parseFloat(age) : null
      }
    });

    const appointmentDate = new Date();
    appointmentDate.setHours(appointmentDate.getHours() + 1, 0, 0, 0);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: appointmentDate,
        type: reason || "Walk-in",
        mode: "In-Person",
        status: "CONFIRMED",
        fee: doctor.consultationFee || 300,
        notes: reason || null
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } }
      }
    });

    res.json({
      success: true,
      message: "Walk-in patient registered",
      data: {
        id: appointment.id,
        patientName: appointment.patient.user.name,
        doctorName: appointment.doctor.user.name,
        time: appointmentDate.toTimeString().slice(0, 5),
        status: "CONFIRMED"
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const registerEmergency = async (req, res) => {
  try {
    const { name, age, complaint, severity, doctorId, room } = req.body;
    if (!name) {
      return res.json({ success: false, message: "Patient name is required" });
    }

    let targetDoctorId = doctorId;
    let targetRoom = room;

    if (!targetDoctorId) {
      const availableDoctor = await prisma.doctor.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });
      if (availableDoctor) {
        targetDoctorId = availableDoctor.id;
        targetRoom = targetRoom || availableDoctor.room || `Room ${101}`;
      }
    }

    if (!targetDoctorId) {
      return res.json({ success: false, message: "No available doctor found" });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: targetDoctorId },
      include: { user: true }
    });
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: `emergency-${Date.now()}@medisync.com`,
        password: "temporary",
        role: "patient",
        phone: null
      }
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientCode: `ER-${Date.now().toString(36).toUpperCase()}`,
        weight: age ? parseFloat(age) : null
      }
    });

    const appointmentDate = new Date();

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: appointmentDate,
        type: "Emergency",
        mode: "In-Person",
        status: "CONFIRMED",
        fee: doctor.consultationFee || 300,
        notes: `EMERGENCY: ${complaint || 'No details'} (Severity: ${severity || 'Critical'})`
      }
    });

    await prisma.notification.create({
      data: {
        userId: doctor.userId,
        title: "Emergency Admission",
        message: `CRITICAL patient ${name} assigned to you. ${complaint ? 'Complaint: ' + complaint : ''}`.trim(),
        type: "emergency",
        link: "/medecin/dashboard"
      }
    });

    res.json({
      success: true,
      message: "Emergency admission registered",
      data: {
        id: appointment.id,
        patientName: name,
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        doctorUserId: doctor.userId,
        room: targetRoom,
        severity: severity || "Critical",
        status: "CONFIRMED"
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getDoctorConsultationStatus = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true } },
        appointments: {
          where: { status: { in: ['CONFIRMED', 'IN_CONSULTATION', 'COMPLETED'] } },
          orderBy: { date: 'desc' },
          take: 1,
          include: {
            patient: { include: { user: { select: { name: true } } } }
          }
        }
      }
    });

    const rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105', 'Room 106'];

    const data = doctors.map((d, i) => {
      const latestAppt = d.appointments[0];
      let status = 'Available';
      let patientName = null;
      let patientStatus = null;

      if (latestAppt) {
        patientStatus = latestAppt.status;
        patientName = latestAppt.patient.user.name;

        if (patientStatus === 'IN_CONSULTATION') {
          status = 'In Consultation';
        } else if (patientStatus === 'CONFIRMED') {
          status = 'Waiting';
        } else if (patientStatus === 'COMPLETED') {
          const hasUnpaidInvoice = false;
          if (hasUnpaidInvoice) {
            status = 'Needs Invoicing';
          }
        }
      }

      const invoiceCount = 0;

      return {
        room: rooms[i % rooms.length],
        doctorId: d.id,
        doctorUserId: d.userId,
        doctorName: d.user.name,
        status,
        patientName,
        patientStatus,
        hasPendingInvoice: false
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
