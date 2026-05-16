/**
 * MediSync Notification Service — Email Worker
 *
 * Consumes messages from the RabbitMQ "notifications" queue and
 * sends real transactional emails via Resend API.
 */
import amqp from "amqplib";
import { Resend } from "resend";
import "dotenv/config";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "notifications";
const FROM = "MediSync <noreply@resend.dev>";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

if (!resend) {
  console.warn("[NOTIFICATION-SERVICE] ⚠ RESEND_API_KEY not set — emails will be logged only.");
}

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.log(`[NOTIFICATION-SERVICE] [EMAIL-SKIPPED] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[NOTIFICATION-SERVICE] Resend error for ${to}:`, error.message);
    } else {
      console.log(`[NOTIFICATION-SERVICE] ✅ Email sent to ${to} (id: ${data.id})`);
    }
  } catch (err) {
    console.error(`[NOTIFICATION-SERVICE] Failed to send email to ${to}:`, err.message);
  }
};

const initWorker = async () => {
  try {
    console.log("[NOTIFICATION-SERVICE] Connecting to RabbitMQ at:", RABBITMQ_URL);
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`[NOTIFICATION-SERVICE] Successfully connected to RabbitMQ. Waiting for messages in queue "${QUEUE_NAME}"...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        const { type, email, data } = payload;

        console.log(`[NOTIFICATION-SERVICE] Received event: ${type} for ${email}`);

        if (type === "REGISTRATION_OTP") {
          await sendEmail({
            to: email,
            subject: "Your MediSync Verification Code",
            html: `
              <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
                <div style="background:#4F46E5;color:white;padding:20px;border-radius:12px 12px 0 0">
                  <h1 style="margin:0;font-size:22px">✉️ Email Verification</h1>
                </div>
                <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px">
                  <p>Welcome to MediSync! Use the code below to verify your account:</p>
                  <div style="background:#F3F4F6;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4F46E5">${data.otp}</span>
                  </div>
                  <p style="color:#6B7280;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
                </div>
              </div>
            `
          });
        } else if (type === "LOGIN_OTP") {
          await sendEmail({
            to: email,
            subject: "Your MediSync Login Code",
            html: `
              <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
                <div style="background:#059669;color:white;padding:20px;border-radius:12px 12px 0 0">
                  <h1 style="margin:0;font-size:22px">🔐 Login Verification</h1>
                </div>
                <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px">
                  <p>Your MediSync login verification code is:</p>
                  <div style="background:#F3F4F6;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#059669">${data.otp}</span>
                  </div>
                  <p style="color:#6B7280;font-size:13px">This code expires in 10 minutes. If you didn't attempt to login, please secure your account immediately.</p>
                </div>
              </div>
            `
          });
        } else if (type === "PASSWORD_RESET") {
          const resetLink = `http://localhost:4200/auth/reset-password?token=${data.token}`;
          await sendEmail({
            to: email,
            subject: "Reset Your Password — MediSync",
            html: `
              <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
                <h2>Reset Your Password</h2>
                <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                <a href="${resetLink}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
                <p style="color:#9EA5B4;font-size:12px">If you didn't request this, ignore this email.</p>
              </div>
            `
          });
        } else {
          console.log(`[NOTIFICATION-SERVICE] Unknown event type: ${type} for ${email}`);
        }

        // Acknowledge message delivery
        channel.ack(msg);
      } catch (err) {
        console.error("[NOTIFICATION-SERVICE] Error processing message payload:", err.message);
        // Negatively acknowledge and requeue message
        channel.nack(msg, false, true);
      }
    }, { noAck: false });

    // Graceful Shutdown
    const gracefulShutdown = async () => {
      console.log("\n[NOTIFICATION-SERVICE] Shutting down gracefully...");
      await channel.close();
      await connection.close();
      process.exit(0);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

  } catch (error) {
    console.error("[NOTIFICATION-SERVICE] RabbitMQ connection failed:", error.message);
    // Retry connection after 5 seconds
    setTimeout(initWorker, 5000);
  }
};

initWorker();
