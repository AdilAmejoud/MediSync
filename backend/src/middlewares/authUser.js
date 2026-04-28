import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const authUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.headers.token;

    if (!token) {
      return res.json({ success: false, message: "Not authorized Login Again" });
    }

    const token_decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: token_decode.id },
    });

    if (!user) {
      return res.json({ success: false, message: "User not found. Please log in again." });
    }

    req.user = { id: token_decode.id };
    req.body.userId = token_decode.id;

    next();
  } catch (error) {
    console.error("Token validation error:", error);
    res.json({ success: false, message: "Session expired, please login again" });
  }
};

export default authUser;
