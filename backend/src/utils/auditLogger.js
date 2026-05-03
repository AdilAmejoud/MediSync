import prisma from "../config/prisma.js";

export const logAudit = async (userId, action, resource, details, ipAddress, status = 'SUCCESS') => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resource, details, ipAddress, status }
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

// Legacy compatibility — kept for existing controllers
export const logEvent = async ({ userId, action, details, req }) => {
  const ipAddress = req
    ? req.headers["x-forwarded-for"] || req.socket.remoteAddress
    : null;
  await logAudit(userId, action, 'N/A', details, ipAddress);
};
