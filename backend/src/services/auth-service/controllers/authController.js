import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import QRCode from "qrcode";
import { generateSecret, verifySync, generateURI } from "otplib";
import prisma from "../../../config/prisma.js";
import { logEvent } from "../../../utils/auditLogger.js";
import { isStrongPassword } from "../../../utils/passwordValidator.js";
import { publishNotification } from "../utils/publisher.js";

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// POST /api/auth/register (User registration)
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
      data: {
        name,
        email,
        password: hashedPassword,
        role: "patient",
      },
    });

    await prisma.patient.create({
      data: { userId: user.id },
    });

    // Return JWT immediately — no mandatory OTP on registration
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");

    res.json({
      success: true,
      token,
      message: "Registration successful.",
    });
  } catch (error) {
    console.error("Register user error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/login (Patient login)
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

    // Only require 2FA if the user has explicitly enabled it
    if (user.twoFactorEnabled) {
      return res.json({ success: true, requires2FA: true, userId: user.id });
    }

    // Direct login — return JWT immediately
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login user error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/doctor-login
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

    // Only require 2FA if the doctor has explicitly enabled it
    if (doctor.twoFactorEnabled) {
      return res.json({ success: true, requires2FA: true, userId: doctor.id });
    }

    // Direct login — return JWT immediately
    const token = jwt.sign({ id: doctor.id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");
    res.json({
      success: true,
      token,
      user: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
      },
    });
  } catch (error) {
    console.error("Login doctor error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/admin-login
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
        data: {
          email,
          password: hashedPassword,
          role: "admin",
          name: "System Admin",
        },
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

    // Only require 2FA if the admin has explicitly enabled it
    if (adminUser.twoFactorEnabled) {
      return res.json({ success: true, requires2FA: true, userId: adminUser.id });
    }

    // Direct login — return JWT immediately
    const token = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");
    res.json({
      success: true,
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error("Login admin error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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

    publishNotification("PASSWORD_RESET", user.email, { token });

    res.json({
      success: true,
      message: "Password reset token generated and published successfully.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
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

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
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

    const token = jwt.sign({ id: tokenRecord.user_id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");

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

// GET /api/auth/get-profile
const getProfile = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true, doctor: true, secretary: true },
    });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    delete user.password;
    delete user.twoFactorSecret;

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/update-profile  |  PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    // Accept both 'dob' and 'dateOfBirth' from callers
    const { name, phone, address, dob, dateOfBirth, image } = req.body;
    const resolvedDob = dob || dateOfBirth;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }
    if (!name || !phone) {
      return res.json({ success: false, message: "Data Missing" });
    }

    const updateData = {
      name,
      phone,
    };

    if (resolvedDob) {
      updateData.dateOfBirth = new Date(resolvedDob);
    }

    if (address !== undefined) {
      updateData.address = typeof address === "string" && address.startsWith("{")
        ? JSON.parse(address)
        : address;
    }

    // Support base64 avatar stored directly (no Cloudinary required)
    if (image && typeof image === "string") {
      updateData.image = image;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.json({ success: false, message: error.message });
  }
};

// GET /api/auth/doctor-profile
const getDoctorProfile = async (req, res) => {
  try {
    const docId = req.headers["x-user-id"] || req.body.docId;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    const doctorData = await prisma.doctor.findUnique({
      where: { userId: docId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            address: true,
            phone: true,
          }
        }
      }
    });

    if (!doctorData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const profileData = {
      id: doctorData.user.id,
      _id: doctorData.id,
      name: doctorData.user.name,
      email: doctorData.user.email,
      image: doctorData.user.avatar,
      speciality: doctorData.specialty,
      degree: doctorData.room || '',
      experience: '',
      about: '',
      available: doctorData.isActive,
      fees: doctorData.consultationFee,
      address: doctorData.user.address || '',
      slots_booked: {},
    };

    res.json({ success: true, profileData });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/update-doctor-profile
const updateDoctorProfile = async (req, res) => {
  try {
    const docId = req.headers["x-user-id"] || req.body.docId;
    const { fees, address, available } = req.body;
    if (!docId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    // Check if Doctor exists
    const doctorData = await prisma.doctor.findUnique({
      where: { userId: docId },
    });
    if (!doctorData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Update Doctor table
    await prisma.doctor.update({
      where: { userId: docId },
      data: {
        consultationFee: fees !== undefined ? Number(fees) : undefined,
        isActive: available !== undefined ? Boolean(available) : undefined,
      },
    });

    // Update User table address if passed
    if (address !== undefined) {
      await prisma.user.update({
        where: { id: docId },
        data: {
          address: typeof address === "string" ? address : JSON.stringify(address),
        },
      });
    }

    res.json({ success: true, message: "profile updated" });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/add-doctor
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    if (!name || !email) {
      return res.json({ success: false, message: "Name and email are required" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }

    const defaultPassword = password || 'Doctor@123';
    if (!isStrongPassword(defaultPassword)) {
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
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    let imageUrl = null;
    if (imageFile) {
      try {
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
          resource_type: "image",
        });
        imageUrl = imageUpload.secure_url;
      } catch (err) {
        console.warn("Cloudinary upload failed:", err.message);
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar: imageUrl,
        role: "medecin",
        address: address || '',
      },
    });

    await prisma.doctor.create({
      data: {
        userId: user.id,
        specialty: speciality || 'General Medicine',
        consultationFee: fees ? Number(fees) : 300,
        room: degree || '',
        isActive: true,
      },
    });

    res.json({ success: true, message: "Doctor added successfully" });
  } catch (error) {
    console.error("Error adding doctor:", error);
    res.json({ success: false, message: error.message });
  }
};

// ── 2-Step / 2FA Settings ───────────────────────────────────────────
// POST /api/auth/setup-2fa
const setup2FA = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const secret = generateSecret();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    await logEvent({
      userId,
      action: "2FA_SETUP_INITIALIZED",
      details: "User initiated TOTP 2FA secret setup",
      req,
    });

    const keyuri = generateURI({
      label: user.email,
      issuer: "MediSync",
      secret: secret,
    });

    const qrCode = await QRCode.toDataURL(keyuri);

    res.json({ success: true, secret, qrCode, keyuri });
  } catch (error) {
    console.error("Setup 2FA error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/enable-2fa
const enable2FA = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { code, token } = req.body;
    const verificationCode = code || token;
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }
    if (!verificationCode) {
      return res.json({ success: false, message: "Verification code is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.json({ success: false, message: "2FA setup has not been initialized" });
    }

    const result = verifySync({ token: verificationCode, secret: user.twoFactorSecret });
    if (!result || !result.valid) {
      await logEvent({
        userId,
        action: "2FA_ENABLE_FAILED",
        details: "Invalid verification code submitted during 2FA enablement",
        req,
      });
      return res.json({ success: false, message: "Invalid verification code" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await logEvent({
      userId,
      action: "2FA_ENABLED",
      details: "TOTP 2FA has been successfully verified and enabled",
      req,
    });

    res.json({ success: true, message: "2-Step verification enabled successfully." });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/verify-2fa (Checks TOTP code during login)
const verify2FA = async (req, res) => {
  try {
    const { userId, code, token } = req.body;
    const verificationCode = code || token;
    if (!userId || !verificationCode) {
      return res.json({ success: false, message: "User ID and 6-digit code are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.json({ success: false, message: "2FA is not enabled for this user" });
    }

    const result = verifySync({ token: verificationCode, secret: user.twoFactorSecret });
    if (!result || !result.valid) {
      await logEvent({
        userId: user.id,
        action: "2FA_VERIFICATION_FAILED",
        details: "Invalid 6-digit TOTP code submitted during login challenge",
        req,
      });
      return res.json({ success: false, message: "Invalid 2FA code" });
    }

    await logEvent({
      userId: user.id,
      action: "2FA_VERIFICATION_SUCCESS",
      details: "2FA login verification succeeded",
      req,
    });

    const tokenGenerated = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "your_jwt_secret_key_here");

    res.json({ success: true, message: "2FA verified successfully.", token: tokenGenerated });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/auth/2fa/disable (Removes TOTP secret and disables 2FA)
const disable2FA = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized. Missing user headers." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    if (!user.twoFactorEnabled) {
      return res.json({ success: false, message: "2FA is not enabled" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });

    await logEvent({
      userId,
      action: "2FA_DISABLED",
      details: "TOTP 2FA has been disabled",
      req,
    });

    res.json({ success: true, message: "2FA disabled successfully." });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  loginDoctor,
  loginAdmin,
  forgotPassword,
  resetPassword,
  verifyOTP,
  getProfile,
  updateProfile,
  getDoctorProfile,
  updateDoctorProfile,
  addDoctor,
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
};
