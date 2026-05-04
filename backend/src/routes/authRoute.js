import express from "express";
import {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  forgotPassword,
  resetPassword,
  verifyOTP,
} from "../controllers/authController.js";
import authUser from "../middlewares/authUser.js";

const authRouter = express.Router();

// ── New endpoints ──
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/profile", authUser, getProfile);
authRouter.put("/profile", authUser, updateProfile);
authRouter.post("/change-password", authUser, changePassword);
authRouter.post("/2fa/setup", authUser, setup2FA);
authRouter.post("/2fa/verify", verify2FA);
authRouter.post("/2fa/verify-setup", authUser, verify2FA);
authRouter.post("/2fa/disable", authUser, disable2FA);

// ── Legacy endpoints (kept) ──
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/verify-otp", verifyOTP);

// Compatibility: frontend sends { userId, code } to /verify-2fa
authRouter.post("/verify-2fa", (req, res, next) => {
  req.user = { id: req.body.userId };
  req.body.token = req.body.code;
  delete req.body.tempToken;
  next();
}, verify2FA);

export default authRouter;
