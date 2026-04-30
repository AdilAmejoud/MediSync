import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { isStrongPassword } from "../utils/passwordValidator.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const addDoctor = async (req, res) => {
  try {
    const {
      name, email, speciality, fees,
      password, degree, experience, about, address,
    } = req.body;

    const imageFile = req.file;

    if (!name || !email) {
      return res.json({ success: false, message: "Name and email are required" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.json({ success: false, message: "User with this email already exists" });
    }

    const defaultPassword = password || 'Doctor@123';
    if (!isStrongPassword(defaultPassword)) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters long, and contain an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    let imageUrl = '';
    if (imageFile) {
      try {
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
        imageUrl = imageUpload.secure_url;
      } catch {}
    }

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword,
        avatar: imageUrl || null,
        role: "medecin",
        address: address || '',
      },
    });

    await prisma.doctor.create({
      data: {
        userId: user.id,
        specialty: speciality || 'General',
        consultationFee: fees ? Number(fees) : 300,
        room: degree || '',
      },
    });

    res.json({ success: true, message: "Doctor added successfully" });
  } catch (error) {
    console.error("Error adding doctor:", error);
    return res.json({ success: false, message: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Email and password are required" });
    }

    let adminUser = await prisma.user.findUnique({ where: { email } });
    if (!adminUser && email === process.env.ADMIN_EMAIL) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      adminUser = await prisma.user.create({
        data: { email, password: hashedPassword, role: "admin", name: "System Admin" },
      });
    }

    if (!adminUser || adminUser.role !== "admin") {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    let isMatch = false;
    if (password === process.env.ADMIN_PASSWORD && email === process.env.ADMIN_EMAIL) {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, adminUser.password);
    }

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    if (adminUser.twoFactorEnabled) {
      return res.json({
        success: true, requires2FA: true, userId: adminUser.id,
      });
    }

    const otp = generateOTP();
    await prisma.authToken.create({
      data: {
        user_id: adminUser.id, token_or_code: otp,
        type: "EMAIL_OTP", expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log(`\n=================== OTP EMAIL SIMULATION ===================`);
    console.log(`To: ${adminUser.email}`);
    console.log(`Subject: MediSync Admin Login Verification Code`);
    console.log(`Your verification code is: ${otp}`);
    console.log(`============================================================\n`);

    res.json({
      success: true, requiresOTP: true,
      email: adminUser.email,
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.json({ success: false, message: error.message });
  }
};

const allDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            avatar: true, address: true, phone: true,
          },
        },
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
      available: d.isActive,
      fees: d.consultationFee,
      address: d.user.address,
      experience: "",
      about: "",
      slots_booked: {},
      phone: d.user.phone,
    }));

    res.json({ success: true, doctors: mapped });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentAdmin = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        patient: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        doctor: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });

    const mapped = appointments.map((a) => ({
      id: a.id,
      userId: a.patient.user.id,
      docId: a.doctor.user.id,
      userData: a.patient.user,
      docData: a.doctor.user,
      slotDate: a.date.toISOString().split("T")[0],
      slotTime: a.date.toTimeString().slice(0, 5),
      amount: a.fee,
      data: a.createdAt.getTime(),
      cancelled: a.status === "CANCELLED",
      payment: false,
      isCompleted: a.status === "COMPLETED",
      status: a.status,
      patientName: a.patient.user.name,
      doctorName: a.doctor.user.name,
    }));

    res.json({ success: true, appointments: mapped });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.json({ success: false, message: "Appointment ID is required" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const adminDashboard = async (req, res) => {
  try {
    const doctorsCount = await prisma.doctor.count({ where: { isActive: true } });
    const patientsCount = await prisma.patient.count();
    const appointmentsCount = await prisma.appointment.count();

    const latestAppointments = await prisma.appointment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });

    const mapped = latestAppointments.map((a) => ({
      id: a.id,
      userId: a.patient.user.id,
      docId: a.doctor.user.id,
      slotDate: a.date.toISOString().split("T")[0],
      slotTime: a.date.toTimeString().slice(0, 5),
      amount: a.fee,
      cancelled: a.status === "CANCELLED",
      isCompleted: a.status === "COMPLETED",
      status: a.status,
    }));

    res.json({
      success: true,
      dashData: {
        doctors: doctorsCount,
        appointments: appointmentsCount,
        patients: patientsCount,
        latestAppointments: mapped,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentAdmin,
  appointmentCancel,
  adminDashboard,
};
