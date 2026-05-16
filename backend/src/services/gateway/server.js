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
import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;

// Shared JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

// Service URLs (with defaults)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:3002";
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || "http://localhost:3003";
const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || "http://localhost:3004";

app.use(cors({
  origin: "*",
  credentials: true
}));

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.url}`);
  next();
});

// Middleware to authenticate and enrich headers
const enrichHeaders = (req, res, next) => {
  const token = req.headers["token"];   // Patient token
  const dtoken = req.headers["dtoken"]; // Doctor token
  const atoken = req.headers["atoken"]; // Admin token

  // Support standard Authorization: Bearer <token> header
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  req.enrichedHeaders = {};

  try {
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.enrichedHeaders["x-user-id"] = decoded.id;
      req.enrichedHeaders["x-user-role"] = "patient";
    } else if (dtoken) {
      const decoded = jwt.verify(dtoken, JWT_SECRET);
      req.enrichedHeaders["x-user-id"] = decoded.id;
      req.enrichedHeaders["x-user-role"] = "doctor";
    } else if (atoken) {
      const decoded = jwt.verify(atoken, JWT_SECRET);
      // Legacy admin token is a direct string concatenation of email + password
      if (decoded === process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
        req.enrichedHeaders["x-user-role"] = "admin";
      } else if (decoded && decoded.id) {
        req.enrichedHeaders["x-user-id"] = decoded.id;
        req.enrichedHeaders["x-user-role"] = "admin";
      }
    } else if (bearerToken) {
      const decoded = jwt.verify(bearerToken, JWT_SECRET);
      req.enrichedHeaders["x-user-id"] = decoded.id;
    }
  } catch (error) {
    console.warn("[GATEWAY] Token validation warning:", error.message);
    // Continue anyway; downstream route protectors/middlewares will handle unauthorized requests
  }
  next();
};

app.use(enrichHeaders);

// Helper function to build proxy options that include enriched headers
const proxyOptions = (targetUrl) => ({
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Add enriched headers
    if (srcReq.enrichedHeaders) {
      Object.keys(srcReq.enrichedHeaders).forEach((key) => {
        proxyReqOpts.headers[key] = srcReq.enrichedHeaders[key];
      });
    }
    return proxyReqOpts;
  },
  userResHeaderDecorator: (headers) => {
    // Make sure CORS headers are maintained properly
    headers["access-control-allow-origin"] = "*";
    return headers;
  }
});

// ── 1. Auth Service Routes ───────────────────────────────────────────
app.use("/api/auth", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: (req) => req.originalUrl,
}));
app.use("/api/user/register", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/register"
}));
app.use("/api/user/login", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/login"
}));
app.use("/api/user/get-profile", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/get-profile"
}));
app.use("/api/user/update-profile", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/update-profile"
}));
app.use("/api/doctor/login", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/doctor-login"
}));
app.use("/api/doctor/doctor-profile", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/doctor-profile"
}));
app.use("/api/doctor/update-doctor-profile", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/update-doctor-profile"
}));
app.use("/api/doctor/profile", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/profile"
}));
app.use("/api/doctor/update-profile", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/update-profile"
}));
app.use("/api/admin/login", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/admin-login"
}));
app.use("/api/admin/add-doctor", proxy(AUTH_SERVICE_URL, {
  ...proxyOptions(AUTH_SERVICE_URL),
  proxyReqPathResolver: () => "/api/auth/add-doctor"
}));

// ── 2. Doctor Service Routes ─────────────────────────────────────────
app.use("/api/doctor/doctor-list", proxy(DOCTOR_SERVICE_URL, {
  ...proxyOptions(DOCTOR_SERVICE_URL),
  proxyReqPathResolver: () => "/api/doctor/doctor-list"
}));
app.use("/api/doctor/change-availability", proxy(DOCTOR_SERVICE_URL, {
  ...proxyOptions(DOCTOR_SERVICE_URL),
  proxyReqPathResolver: () => "/api/doctor/change-availability"
}));
app.use("/api/admin/change-availability", proxy(DOCTOR_SERVICE_URL, {
  ...proxyOptions(DOCTOR_SERVICE_URL),
  proxyReqPathResolver: () => "/api/doctor/change-availability"
}));
app.use("/api/admin/all-doctors", proxy(DOCTOR_SERVICE_URL, {
  ...proxyOptions(DOCTOR_SERVICE_URL),
  proxyReqPathResolver: () => "/api/doctor/doctor-list"
}));

// ── 3. Booking Service Routes ────────────────────────────────────────
// User bookings
app.use("/api/user/book-appointment", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/user/book-appointment"
}));
app.use("/api/user/appointments", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/user/appointments"
}));
app.use("/api/user/cancel-appointment", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/user/cancel-appointment"
}));

// Doctor bookings
app.use("/api/doctor/appointments", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/appointments"
}));
app.use("/api/doctor/appointment-cancel", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/cancel-appointment"
}));
app.use("/api/doctor/cancel-appointment", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/cancel-appointment"
}));
app.use("/api/doctor/appointment-complete", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/complete-appointment"
}));
app.use("/api/doctor/complete-appointment", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/complete-appointment"
}));
app.use("/api/doctor/doctor-dashboard", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/dashboard"
}));
app.use("/api/doctor/dashboard", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/doctor/dashboard"
}));

// Admin bookings
app.use("/api/admin/appointments", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/admin/appointments"
}));
app.use("/api/admin/appointment-cancel", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/admin/cancel-appointment"
}));
app.use("/api/admin/cancel-appointment", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/admin/cancel-appointment"
}));
app.use("/api/admin/admin-dashboard", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/admin/dashboard"
}));
app.use("/api/admin/dashboard", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/admin/dashboard"
}));
app.use("/api/admin/patients", proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: () => "/api/patients"
}));

// ── 4. Main Backend Routes (patients, stats, appointments, etc.) ──
const mainBackendProxy = proxy(MAIN_BACKEND_URL, {
  ...proxyOptions(MAIN_BACKEND_URL),
  proxyReqPathResolver: (req) => req.originalUrl,
});
app.use("/api/doctor/list", mainBackendProxy);
app.use("/api/patients", mainBackendProxy);
app.use("/api/stats", mainBackendProxy);
app.use("/api/appointments", mainBackendProxy);
app.use("/api/care-sheets", mainBackendProxy);
app.use("/api/invoices", mainBackendProxy);
app.use("/api/prescriptions", mainBackendProxy);
app.use("/api/notifications", mainBackendProxy);
app.use("/api/documents", mainBackendProxy);
app.use("/api/staff", mainBackendProxy);
app.use("/api/services", mainBackendProxy);
app.use("/api/reports", mainBackendProxy);
app.use("/api/audit-logs", mainBackendProxy);
app.use("/api/clinic-config", mainBackendProxy);
app.use("/api/secretaire", mainBackendProxy);
app.use("/api/doctor/blocked-slots", mainBackendProxy);
app.use("/api/doctor/block-time", mainBackendProxy);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "gateway" });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error("[GATEWAY ERROR]:", err.message);
  res.status(502).json({ success: false, message: "Bad Gateway. Service may be offline." });
});

app.listen(PORT, () => {
  console.log(`[GATEWAY] API Gateway listening on http://localhost:${PORT}`);
});
