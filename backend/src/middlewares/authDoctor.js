import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const authDoctor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const dtoken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.headers.dtoken;

    if (!dtoken) {
      return res.json({ success: false, message: "Not authorized Login Again" });
    }

    const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);

    const doctorUser = await prisma.user.findFirst({
      where: { id: token_decode.id, role: "medecin" },
    });

    if (!doctorUser) {
      return res.json({ success: false, message: "Not authorized, doctor profile not found" });
    }

    const doctorRecord = await prisma.doctor.findUnique({
      where: { userId: token_decode.id },
    });

    req.doctor = { id: doctorRecord?.id || token_decode.id };
    req.body.docId = token_decode.id;

    next();
  } catch (error) {
    console.error("Token validation error:", error);
    res.json({ success: false, message: "Session expired, please login again" });
  }
};

export default authDoctor;
