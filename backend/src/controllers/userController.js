import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import prisma from "../config/prisma.js";
import { isStrongPassword } from "../utils/passwordValidator.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }

    if (!isStrongPassword(password)) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters long, and contain an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.json({ success: false, message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "patient" },
    });

    await prisma.patient.create({ data: { userId: user.id } });

    const otp = generateOTP();
    await prisma.authToken.create({
      data: {
        user_id: user.id, token_or_code: otp,
        type: "EMAIL_OTP", expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log(`\n=================== OTP EMAIL SIMULATION ===================`);
    console.log(`To: ${user.email}`);
    console.log(`Subject: MediSync Registration Verification Code`);
    console.log(`Your verification code is: ${otp}`);
    console.log(`============================================================\n`);

    res.json({
      success: true, requiresOTP: true,
      email: user.email,
      message: "Registration successful. Verification code sent to your email.",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        success: true, requires2FA: true, userId: user.id,
        role: user.role
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: true,
        doctor: { include: { user: { select: { name: true } } } },
        secretary: true,
      },
    });

    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const { password, twoFactorSecret, ...safe } = userData;
    res.json({ success: true, userData: safe });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }
    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    const updateData = {
      name, phone,
      address: typeof address === "string" ? JSON.parse(address) : address,
      dateOfBirth: new Date(dob),
    };

    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      updateData.avatar = imageUpload.secure_url;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime, type, mode } = req.body;
    if (!userId || !docId || !slotDate || !slotTime) {
      return res.json({ success: false, message: "Missing required booking details" });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: docId },
      include: { user: true },
    });

    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }
    if (!doctor.isActive) {
      return res.json({ success: false, message: "Doctor not available" });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!patient) {
      return res.json({ success: false, message: "Patient not found" });
    }

    const appointmentDate = new Date(`${slotDate}T${slotTime}:00`);
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        date: appointmentDate,
        status: { notIn: ['CANCELLED'] }
      }
    });
    if (existing) {
      return res.json({ success: false, message: "This time slot is already booked" });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: appointmentDate,
        fee: doctor.consultationFee,
        type: type || "General Visit",
        mode: mode || "In-Person",
        status: "PENDING",
      },
    });

    // Create notifications for all secretaries
    const secretaries = await prisma.user.findMany({
      where: { role: "secretaire" }
    });
    for (const sec of secretaries) {
      await prisma.notification.create({
        data: {
          userId: sec.id,
          title: "New Appointment Booked",
          message: `Patient ${patient.user.name} booked a slot with ${doctor.user.name} on ${slotDate} at ${slotTime}.`,
          type: "warning"
        }
      });
    }

    res.json({
      success: true,
      message: "Appointment Booked",
      appointment: {
        id: appointment.id,
        userId,
        docId,
        slotDate,
        slotTime,
        amount: appointment.fee,
        data: appointment.createdAt.getTime(),
        cancelled: false,
        payment: false,
        isCompleted: false,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      return res.json({ success: false, message: "Patient not found" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { date: "desc" },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    const mapped = appointments.map((a) => ({
      id: a.id,
      userId,
      docId: a.doctor.user.id,
      docData: a.doctor.user,
      doctorName: a.doctor.user.name,
      doctorSpecialty: a.doctor.specialty,
      slotDate: a.date.toISOString().split("T")[0],
      slotTime: a.date.toTimeString().slice(0, 5),
      date: a.date,
      type: a.type,
      mode: a.mode,
      amount: a.fee,
      notes: a.notes,
      data: a.createdAt.getTime(),
      cancelled: a.status === "CANCELLED",
      payment: false,
      isCompleted: a.status === "COMPLETED",
      status: a.status,
    }));

    res.json({ success: true, appointments: mapped });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    if (!userId || !appointmentId) {
      return res.json({ success: false, message: "User ID and Appointment ID are required" });
    }

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      return res.json({ success: false, message: "Patient not found" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } }
      }
    });

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointmentData.patientId !== patient.id) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });

    // Notify the doctor
    await prisma.notification.create({
      data: {
        userId: appointmentData.doctor.user.id,
        title: "Appointment Cancelled",
        message: `Patient ${patient.user.name} cancelled the appointment scheduled for ${appointmentData.date.toLocaleString('en-US')}.`,
        type: "error"
      }
    });

    // Notify secretaries
    const secretaries = await prisma.user.findMany({
      where: { role: "secretaire" }
    });
    for (const sec of secretaries) {
      await prisma.notification.create({
        data: {
          userId: sec.id,
          title: "Appointment Cancelled",
          message: `Patient ${patient.user.name} cancelled the appointment with ${appointmentData.doctor.user.name} scheduled for ${appointmentData.date.toLocaleString('en-US')}.`,
          type: "error"
        }
      });
    }

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
};
