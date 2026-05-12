import express from "express";
import {
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
} from "../controllers/authController.js";
import upload from "../../../middlewares/multer.js";

const authRouter = express.Router();

// General Auth
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/doctor-login", loginDoctor);
authRouter.post("/admin-login", loginAdmin);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/verify-otp", verifyOTP);

// Profile Management (Gateway injects x-user-id header)
authRouter.get("/get-profile", getProfile);
authRouter.get("/profile", getProfile);
authRouter.post("/update-profile", upload.single("image"), updateProfile);
authRouter.put("/profile", upload.single("image"), updateProfile);
authRouter.get("/doctor-profile", getDoctorProfile);
authRouter.post("/update-doctor-profile", updateDoctorProfile);
authRouter.post("/add-doctor", upload.single("image"), addDoctor);

// 2FA Management
authRouter.post("/setup-2fa", setup2FA);
authRouter.post("/2fa/setup", setup2FA);
authRouter.post("/enable-2fa", enable2FA);
authRouter.post("/2fa/verify-setup", enable2FA);
authRouter.post("/verify-2fa", verify2FA);
authRouter.post("/2fa/disable", disable2FA);

export default authRouter;
