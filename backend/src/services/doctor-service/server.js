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
const PORT = process.env.DOCTOR_SERVICE_PORT || 3002;

// Standard Middlewares
app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true
}));

// Verify Database Connection
prisma.$connect()
  .then(() => console.log("[DOCTOR-SERVICE] PostgreSQL Connected successfully"))
  .catch((err) => {
    console.error("[DOCTOR-SERVICE] Database connection error:", err.message);
    process.exit(1);
  });

// Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (err) => console.error("[DOCTOR-SERVICE] Redis Client Error:", err));

// Connect to Redis
let redisConnected = false;
try {
  await redisClient.connect();
  redisConnected = true;
  console.log("[DOCTOR-SERVICE] Connected to Redis successfully");
} catch (err) {
  console.error("[DOCTOR-SERVICE] Failed to connect to Redis. Caching will be disabled.", err.message);
}

// ── GET/POST /api/doctor/doctor-list ────────────────────────────────
app.all("/api/doctor/doctor-list", async (req, res) => {
  try {
    let cachedDoctors = null;
    if (redisConnected) {
      try {
        cachedDoctors = await redisClient.get("doctors:list");
      } catch (err) {
        console.warn("[DOCTOR-SERVICE] Redis get error:", err.message);
      }
    }

    if (cachedDoctors) {
      console.log("[DOCTOR-SERVICE] Serving doctor list from Redis cache");
      return res.json({ success: true, doctors: JSON.parse(cachedDoctors) });
    }

    console.log("[DOCTOR-SERVICE] Redis cache miss. Querying database...");
    const dbDoctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    const mappedDoctors = dbDoctors.map((d) => ({
      id: d.user.id,
      _id: d.id,
      name: d.user.name,
      email: d.user.email,
      image: d.user.avatar,
      speciality: d.specialty,
      degree: d.room || "",
      experience: "",
      about: "",
      available: d.isActive,
      fees: d.consultationFee,
      address: d.user.address,
      slots_booked: {},
      phone: d.user.phone,
    }));

    if (redisConnected) {
      try {
        await redisClient.set("doctors:list", JSON.stringify(mappedDoctors), {
          EX: 3600, // Cache for 1 hour
        });
      } catch (err) {
        console.warn("[DOCTOR-SERVICE] Redis set error:", err.message);
      }
    }

    res.json({ success: true, doctors: mappedDoctors });
  } catch (error) {
    console.error("[DOCTOR-SERVICE] Doctor list error:", error);
    res.json({ success: false, message: error.message });
  }
});

// ── POST /api/doctor/change-availability ────────────────────────────
app.post("/api/doctor/change-availability", async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"];
    if (userRole !== "admin") {
      return res.json({ success: false, message: "Unauthorized. Admin role required." });
    }

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

    // Invalidate Redis Cache
    if (redisConnected) {
      try {
        await redisClient.del("doctors:list");
        console.log("[DOCTOR-SERVICE] Cleared doctors:list from Redis cache");
      } catch (err) {
        console.warn("[DOCTOR-SERVICE] Redis delete error:", err.message);
      }
    }

    res.json({ success: true, message: "Availability changed successfully" });
  } catch (error) {
    console.error("[DOCTOR-SERVICE] Change availability error:", error);
    res.json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "doctor-service" });
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  console.log("\n[DOCTOR-SERVICE] Shutting down gracefully...");
  await prisma.$disconnect();
  if (redisConnected) {
    await redisClient.disconnect();
  }
  process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

app.listen(PORT, () => {
  console.log(`[DOCTOR-SERVICE] Doctor Service listening on http://localhost:${PORT}`);
});
