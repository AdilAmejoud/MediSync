/**
 * MediSync Microservices Architecture — Planned Extension
 * 
 * This service is part of the planned microservices architecture
 * for future scalability. Currently, all functionality is handled
 * by the main monolithic backend (/backend/server.js).
 * 
 * This file represents the target architecture for production
 * deployment at scale. See /docs/README.md for architecture details.
 */
import express from "express";
import cors from "cors";
import "dotenv/config";
import { createClient } from "redis";
import prisma from "../../config/prisma.js";

const app = express();
const PORT = process.env.BOOKING_SERVICE_PORT || 3003;

// Standard Middlewares
app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true
}));

// Verify Database Connection
prisma.$connect()
  .then(() => console.log("[BOOKING-SERVICE] PostgreSQL Connected successfully"))
  .catch((err) => {
    console.error("[BOOKING-SERVICE] Database connection error:", err.message);
    process.exit(1);
  });

// Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (err) => console.error("[BOOKING-SERVICE] Redis Client Error:", err));

// Connect to Redis
let redisConnected = false;
try {
  await redisClient.connect();
  redisConnected = true;
  console.log("[BOOKING-SERVICE] Connected to Redis successfully");
} catch (err) {
  console.error("[BOOKING-SERVICE] Failed to connect to Redis. Invalidation will skip cache clearing.", err.message);
}

// Helper to invalidate Redis doctor list
const invalidateDoctorCache = async () => {
  if (redisConnected) {
    try {
      await redisClient.del("doctors:list");
      console.log("[BOOKING-SERVICE] Invalidated doctors:list cache in Redis");
    } catch (err) {
      console.warn("[BOOKING-SERVICE] Redis delete cache error:", err.message);
    }
  }
};

// ── POST /api/booking/book-appointment ──────────────────────────────
app.post("/api/booking/book-appointment", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (userRole !== "patient" || !userId) {
      return res.json({ success: false, message: "Unauthorized. Patient token required." });
    }

    const { docId, slotDate, slotTime } = req.body;
    if (!docId || !slotDate || !slotTime) {
      return res.json({ success: false, message: "Missing required booking details" });
    }

    const docData = await prisma.user.findUnique({
      where: { id: docId, role: "doctor" },
    });

    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }
    if (!docData.available) {
      return res.json({ success: false, message: "Doctor not available" });
    }

    let slots_booked = docData.slots_booked || {};

    // Check for slot availability
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    // Clean sensitive user and doc fields for snapshots
    const cleanDocData = { ...docData };
    delete cleanDocData.password;
    delete cleanDocData.twoFactorSecret;
    delete cleanDocData.slots_booked;

    const cleanUserData = { ...userData };
    delete cleanUserData.password;
    delete cleanUserData.twoFactorSecret;

    await prisma.appointment.create({
      data: {
        userId,
        docId,
        userData: cleanUserData,
        docData: cleanDocData,
        amount: docData.fees || 0,
        slotTime,
        slotDate,
        data: Date.now(),
      },
    });

    // Save new slot data in doctor profile
    await prisma.user.update({
      where: { id: docId },
      data: { slots_booked },
    });

    // Invalidate Redis Cache
    await invalidateDoctorCache();

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Book appointment error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── GET /api/booking/appointments ──────────────────────────────────
app.get("/api/booking/appointments", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (!userId || !userRole) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }

    let appointments = [];
    if (userRole === "doctor") {
      appointments = await prisma.appointment.findMany({
        where: { docId: userId },
        orderBy: { data: "desc" },
      });
    } else if (userRole === "patient") {
      appointments = await prisma.appointment.findMany({
        where: { userId: userId },
        orderBy: { data: "desc" },
      });
    } else {
      return res.json({ success: false, message: "Unauthorized role for listing appointments" });
    }

    res.json({ success: true, appointments });
  } catch (error) {
    console.error("[BOOKING-SERVICE] List appointments error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── POST /api/booking/cancel-appointment ────────────────────────────
app.post("/api/booking/cancel-appointment", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    const { appointmentId } = req.body;

    if (!userId || !userRole) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }
    if (!appointmentId) {
      return res.json({ success: false, message: "Appointment ID is required" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Verify ownership
    if (userRole === "patient" && appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    } else if (userRole === "doctor" && appointmentData.docId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    } else if (userRole !== "patient" && userRole !== "doctor") {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { cancelled: true },
    });

    // Release doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await prisma.user.findUnique({
      where: { id: docId },
    });

    if (doctorData) {
      let slots_booked = doctorData.slots_booked || {};
      if (slots_booked[slotDate]) {
        slots_booked[slotDate] = slots_booked[slotDate].filter(
          (time) => time !== slotTime
        );
        await prisma.user.update({
          where: { id: docId },
          data: { slots_booked },
        });
      }
    }

    // Invalidate Redis Cache
    await invalidateDoctorCache();

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Cancel appointment error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── POST /api/booking/appointment-complete ──────────────────────────
app.post("/api/booking/appointment-complete", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    const { appointmentId } = req.body;

    if (userRole !== "doctor" || !userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }
    if (!appointmentId) {
      return res.json({ success: false, message: "Appointment ID is required" });
    }

    const appointmentData = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (appointmentData && appointmentData.docId === userId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { isCompleted: true },
      });
      return res.json({ success: true, message: "appointment Completed" });
    } else {
      return res.json({ success: false, message: "Mark failed" });
    }
  } catch (error) {
    console.error("[BOOKING-SERVICE] Complete appointment error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── GET /api/booking/doctor-dashboard ──────────────────────────────
app.get("/api/booking/doctor-dashboard", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    if (userRole !== "doctor" || !userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { docId: userId },
      orderBy: { data: "desc" },
    });

    const patientIds = [];
    appointments.forEach((item) => {
      if (!patientIds.includes(item.userId)) {
        patientIds.push(item.userId);
      }
    });

    const dashData = {
      appointments: appointments.length,
      patients: patientIds.length,
      latestAppointments: appointments.slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Doctor dashboard error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── GET /api/booking/appointments-admin ────────────────────────────
app.get("/api/booking/appointments-admin", async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"];
    if (userRole !== "admin") {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    const appointments = await prisma.appointment.findMany({
      orderBy: { data: "desc" },
    });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Admin appointments error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── POST /api/booking/cancel-appointment-admin ──────────────────────
app.post("/api/booking/cancel-appointment-admin", async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"];
    if (userRole !== "admin") {
      return res.json({ success: false, message: "Unauthorized action" });
    }

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
      data: { cancelled: true },
    });

    // Release doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await prisma.user.findUnique({
      where: { id: docId },
    });

    if (doctorData) {
      let slots_booked = doctorData.slots_booked || {};
      if (slots_booked[slotDate]) {
        slots_booked[slotDate] = slots_booked[slotDate].filter(
          (time) => time !== slotTime
        );
        await prisma.user.update({
          where: { id: docId },
          data: { slots_booked },
        });
      }
    }

    // Invalidate Redis Cache
    await invalidateDoctorCache();

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Admin cancel appointment error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── GET /api/booking/admin-dashboard ────────────────────────────────
app.get("/api/booking/admin-dashboard", async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"];
    if (userRole !== "admin") {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    const doctorsCount = await prisma.user.count({ where: { role: "doctor" } });
    const patientsCount = await prisma.user.count({ where: { role: "patient" } });
    const appointmentsCount = await prisma.appointment.count();

    const latestAppointments = await prisma.appointment.findMany({
      take: 5,
      orderBy: { data: "desc" },
    });

    const dashData = {
      doctors: doctorsCount,
      appointments: appointmentsCount,
      patients: patientsCount,
      latestAppointments,
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.error("[BOOKING-SERVICE] Admin dashboard error:", error);
    res.json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "booking-service" });
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  console.log("\n[BOOKING-SERVICE] Shutting down gracefully...");
  await prisma.$disconnect();
  if (redisConnected) {
    await redisClient.disconnect();
  }
  process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

app.listen(PORT, () => {
  console.log(`[BOOKING-SERVICE] Booking Service listening on http://localhost:${PORT}`);
});
