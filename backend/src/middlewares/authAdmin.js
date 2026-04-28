import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const authAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const atoken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.headers.atoken;

    if (!atoken) {
      return res.json({ success: false, message: "Not authorized Login Again" });
    }

    const token_decode = jwt.verify(atoken, process.env.JWT_SECRET);

    // 1. Check if legacy admin credentials payload match
    if (token_decode === process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
      return next();
    }

    // 2. Check if DB-based admin exists
    if (token_decode && token_decode.id) {
      const admin = await prisma.user.findFirst({
        where: { id: token_decode.id, role: "admin" },
      });
      if (admin) {
        req.user = { id: admin.id };
        req.body.adminId = admin.id;
        return next();
      }
    }

    return res.json({ success: false, message: "Not Authorized login again" });
  } catch (error) {
    console.error("Token validation error:", error);
    res.json({ success: false, message: "Session expired, please login again" });
  }
};

export default authAdmin;
