import express from "express";
import http from "http";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import * as emailService from "./src/services/emailService.js";
import connectCloudinary from "./src/config/cloudinary.js";
import prisma from "./src/config/prisma.js";
import { createSocketServer } from "./socket.js";
import adminRouter from "./src/routes/adminRoute.js";
import doctorRouter from "./src/routes/doctorRoute.js";
import userRouter from "./src/routes/userRoute.js";
import authRouter from "./src/routes/authRoute.js";
import statsRouter from "./src/routes/statsRoute.js";
import appointmentRouter from "./src/routes/appointmentRoute.js";
import auditRouter from "./src/routes/auditRoute.js";
import patientRouter from "./src/routes/patientRoute.js";
import invoiceRouter from "./src/routes/invoiceRoute.js";
import prescriptionRouter from "./src/routes/prescriptionRoute.js";
import notificationRouter from "./src/routes/notificationRoute.js";
import documentRouter from "./src/routes/documentRoute.js";
import careSheetRouter from "./src/routes/careSheetRoute.js";
import staffRouter from "./src/routes/staffRoute.js";
import serviceRouter from "./src/routes/serviceRoute.js";
import reportRouter from "./src/routes/reportRoute.js";
import configRouter from "./src/routes/configRoute.js";
import secretaireRouter from "./src/routes/secretaireRoute.js";

const app = express();
const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);
app.set('io', io);
const PORT = process.env.PORT || 3000;

// Verify Database Connection
prisma.$connect()
  .then(() => console.log("PostgreSQL Database connected successfully via Prisma"))
  .catch((err) => {
    console.error("Database connection failure:", err);
    process.exit(1);
  });

connectCloudinary();

// Standard Middlewares
app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Security Middlewares
app.use(helmet());

// Global rate limiter for general routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { success: false, message: "Too many requests from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Strict rate limiter for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: { success: false, message: "Too many authentication attempts. Please try again after 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
app.use("/api/admin/login", authLimiter);
app.use("/api/doctor/login", authLimiter);
app.use("/api/user/login", authLimiter);

// API Endpoints
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/stats", statsRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/patients", patientRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/prescriptions", prescriptionRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/documents", documentRouter);
app.use("/api/care-sheets", careSheetRouter);
app.use("/api/staff", staffRouter);
app.use("/api/services", serviceRouter);
app.use("/api/reports", reportRouter);
app.use("/api/clinic-config", configRouter);
app.use("/api/secretaire", secretaireRouter);

app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// Hourly Cron Job to clean up expired/used AuthTokens
cron.schedule("0 * * * *", async () => {
  try {
    console.log("Running scheduled cleanup: removing expired and used tokens...");
    const result = await prisma.authToken.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { is_used: true },
        ],
      },
    });
    console.log(`Cleanup complete. Deleted ${result.count} tokens.`);
  } catch (error) {
    console.error("Failed to run token cleanup cron:", error);
  }
});

// Appointment reminder cron — runs every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  const now = new Date();

  // 24h reminders
  const in24h = new Date(now.getTime() + 24*60*60*1000);
  const window24start = new Date(in24h.getTime() - 15*60*1000);
  const window24end = new Date(in24h.getTime() + 15*60*1000);

  const appts24 = await prisma.appointment.findMany({
    where: {
      date: { gte: window24start, lte: window24end },
      status: { in: ['PENDING','CONFIRMED'] },
      reminderSent24h: false
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } }
    }
  });

  for (const a of appts24) {
    await emailService.sendAppointmentReminder({
      patientEmail: a.patient.user.email,
      patientName: a.patient.user.name,
      doctorName: a.doctor.user.name,
      date: a.date, hoursBeforeLabel: 'in 24 hours'
    });
    await prisma.appointment.update({
      where: { id: a.id }, data: { reminderSent24h: true }
    });
  }

  // 1h reminders
  const in1h = new Date(now.getTime() + 60*60*1000);
  const window1start = new Date(in1h.getTime() - 15*60*1000);
  const window1end = new Date(in1h.getTime() + 15*60*1000);

  const appts1h = await prisma.appointment.findMany({
    where: {
      date: { gte: window1start, lte: window1end },
      status: { in: ['PENDING','CONFIRMED'] },
      reminderSent1h: false
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } }
    }
  });

  for (const a of appts1h) {
    await emailService.sendAppointmentReminder({
      patientEmail: a.patient.user.email,
      patientName: a.patient.user.name,
      doctorName: a.doctor.user.name,
      date: a.date, hoursBeforeLabel: 'in 1 hour'
    });
    await prisma.appointment.update({
      where: { id: a.id }, data: { reminderSent1h: true }
    });
  }
});

// Graceful Database Disconnection
const gracefulShutdown = async () => {
  console.log("\nShutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
