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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import connectCloudinary from "../../config/cloudinary.js";
import prisma from "../../config/prisma.js";
import authRouter from "./routes/authRoute.js";
import { initRabbitMQ } from "./utils/publisher.js";
import cron from "node-cron";

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

// Schedule cleanup job for expired/used auth tokens (runs hourly)
cron.schedule("0 * * * *", async () => {
  try {
    const result = await prisma.authToken.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { is_used: true },
        ],
      },
    });
    if (result.count > 0) {
      console.log(`[AUTH-SERVICE CRON] Cleaned up ${result.count} stale or expired verification tokens.`);
    }
  } catch (error) {
    console.error("[AUTH-SERVICE CRON ERROR] Stale token cleanup failed:", error.message);
  }
});

// Verify Database Connection
prisma.$connect()
  .then(() => console.log("[AUTH-SERVICE] PostgreSQL Connected successfully"))
  .catch((err) => {
    console.error("[AUTH-SERVICE] Database connection error:", err.message);
    process.exit(1);
  });

// Verify RabbitMQ Connection
initRabbitMQ();

connectCloudinary();

// Security Middlewares
app.use(helmet());

// Standard Middlewares (must be before rate limiter so req.body is available)
app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true
}));

// Rate Limiter — keyed by email so one user's attempts don't block others
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { success: false, message: "Too many requests. Please try again after 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// API Routes
app.use("/api/auth", authRouter);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "auth-service" });
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  console.log("\n[AUTH-SERVICE] Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

app.listen(PORT, () => {
  console.log(`[AUTH-SERVICE] Auth Service listening on http://localhost:${PORT}`);
});
