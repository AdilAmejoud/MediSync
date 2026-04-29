import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import prisma from "../config/prisma.js";
import { logAudit, logEvent } from "../utils/auditLogger.js";
import { isStrongPassword } from "../utils/passwordValidator.js";
import { sendPasswordReset } from "../services/emailService.js";

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

// ─── New Auth Endpoints ────────────────────────────────────────────

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ message: "Email, password and role required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== role)
      return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account deactivated" });

    // Admin requires 2FA if enabled
    if (role === "admin" && user.twoFactorEnabled) {
      return res.json({
        requiresTwoFactor: true,
        tempToken: jwt.sign({ userId: user.id, step: "2fa" },
          process.env.JWT_SECRET, { expiresIn: "10m" })
      });
    }

    const token = generateToken({ id: user.id });

    await logAudit(user.id, "LOGIN", "auth", `Login from ${req.ip}`, req.ip, "SUCCESS");

    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, avatar: user.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req, res) => {
  try {
    const {
      name, email, password, phone, address, dateOfBirth,
      city, postalCode,
      gender, nationalId, bloodType, allergies, chronicConditions,
      emergencyContactName, emergencyContactPhone,
      insuranceProvider, policyNumber,
      medications, previousSurgeries, familyHistory, coverageType
    } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password required" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, email, password: hashed, role: "patient", phone,
        address, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        city, postalCode
      }
    });
    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        gender, nationalId, bloodType,
        allergies: allergies ? allergies.split(/,\s*/).filter(Boolean) : [],
        conditions: chronicConditions ? chronicConditions.split(/,\s*/).filter(Boolean) : [],
        emergencyContactName, emergencyContactPhone,
        insuranceProvider, policyNumber,
        medications, previousSurgeries, familyHistory, coverageType
      }
    });

    const token = generateToken({ id: user.id });
    res.status(201).json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      patientId: patient.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { patient: true, doctor: true, secretary: true }
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password, twoFactorSecret, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, dateOfBirth } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined }
    });
    const { password, twoFactorSecret, ...safe } = updated;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(400).json({ message: "Current password incorrect" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id }, data: { password: hashed }
    });
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── 2FA with otplib ─────────────────────────────────────────────

export const setup2FA = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = generateSecret();
    const otpauth = generateURI({ issuer: "MediSync", label: user.email, secret });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret }
    });

    const qrDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ success: true, secret, qrCode: qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to setup 2FA" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { token, tempToken } = req.body;
    let userId;

    if (tempToken) {
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (decoded.step !== "2fa")
        return res.status(401).json({ message: "Invalid temp token" });
      userId = decoded.userId;
    } else {
      userId = req.user.id;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret)
      return res.status(400).json({ message: "2FA not set up" });

    const result = verifySync({ token, secret: user.twoFactorSecret });

    if (!result || !result.valid)
      return res.status(401).json({ message: "Invalid OTP code" });

    if (!user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
      });
      return res.json({ success: true, message: "2FA enabled successfully" });
    }

    // Complete login for admin
    const jwtToken = generateToken({ id: user.id });
    await logAudit(user.id, "2FA_LOGIN", "auth", null, req.ip, "SUCCESS");
    res.json({
      success: true, token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "2FA verification failed" });
  }
};

export const disable2FA = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
    res.json({ success: true, message: "2FA disabled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to disable 2FA" });
  }
};

// ─── Legacy Auth Endpoints (kept from original) ────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: false, message: "User not found with this email" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.authToken.create({
      data: {
        user_id: user.id,
        token_or_code: token,
        type: "PASSWORD_RESET",
        expires_at: expiresAt,
      },
    });

    await logEvent({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      details: `Password reset token requested for email ${email}`,
      req,
    });

    const resetLink = `http://localhost:4200/auth/reset-password?token=${token}`;

    await sendPasswordReset({ email, name: user.name, resetLink });

    res.json({
      success: true,
      message: "Password reset email sent successfully.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.json({ success: false, message: "Token and new password are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters long, and contain an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const tokenRecord = await prisma.authToken.findFirst({
      where: {
        token_or_code: token,
        type: "PASSWORD_RESET",
        is_used: false,
        expires_at: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      return res.json({ success: false, message: "Invalid or expired password reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.user_id },
        data: { password: hashedPassword },
      }),
      prisma.authToken.update({
        where: { id: tokenRecord.id },
        data: { is_used: true },
      }),
    ]);

    await logEvent({
      userId: tokenRecord.user_id,
      action: "PASSWORD_RESET_COMPLETED",
      details: "Password reset completed successfully via token",
      req,
    });

    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.json({ success: false, message: "Email and OTP are required" });
    }

    const tokenRecord = await prisma.authToken.findFirst({
      where: {
        user: { email },
        type: "EMAIL_OTP",
        is_used: false,
        expires_at: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    if (tokenRecord.token_or_code !== otp) {
      const updatedRecord = await prisma.authToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });

      await logEvent({
        userId: tokenRecord.user_id,
        action: "OTP_VERIFICATION_FAILED",
        details: `Invalid OTP attempt. Attempts: ${updatedRecord.attempts}/3`,
        req,
      });

      if (updatedRecord.attempts >= 3) {
        await prisma.authToken.update({
          where: { id: tokenRecord.id },
          data: { is_used: true },
        });
        return res.json({
          success: false,
          message: "Too many incorrect attempts. This verification code has been invalidated. Please request a new one.",
        });
      }

      return res.json({
        success: false,
        message: `Invalid verification code. ${3 - updatedRecord.attempts} attempts remaining before it is invalidated.`,
      });
    }

    await prisma.authToken.update({
      where: { id: tokenRecord.id },
      data: { is_used: true },
    });

    await logEvent({
      userId: tokenRecord.user_id,
      action: "OTP_VERIFICATION_SUCCESS",
      details: "OTP verification completed successfully",
      req,
    });

    const token = jwt.sign({ id: tokenRecord.user_id }, process.env.JWT_SECRET);

    res.json({
      success: true,
      message: "OTP verified successfully.",
      token,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.json({ success: false, message: error.message });
  }
};
