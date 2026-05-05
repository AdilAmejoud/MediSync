import { Resend } from 'resend';

let resend;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (e) {
  console.warn('[EMAIL] Resend not configured, email sending disabled');
}

const FROM = 'MediSync <noreply@resend.dev>';

const safeSend = async (fn) => {
  if (!resend) return;
  try { await fn(); } catch (e) { console.warn('[EMAIL] Send failed:', e.message); }
};

export const sendAppointmentConfirmation = async ({ patientEmail, patientName, doctorName, date, type, mode }) => {
  const dateStr = new Date(date).toLocaleString('en', {
    weekday:'long', year:'numeric', month:'long',
    day:'numeric', hour:'2-digit', minute:'2-digit'
  });
  await safeSend(() => resend.emails.send({
    from: FROM, to: patientEmail,
    subject: 'Appointment Confirmed — MediSync',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <div style="background:#4F46E5;color:white;padding:20px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:22px">✅ Appointment Confirmed</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>Your appointment has been confirmed:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#6B7280">Doctor</td><td style="padding:8px;font-weight:600">${doctorName}</td></tr>
            <tr style="background:#F9FAFB"><td style="padding:8px;color:#6B7280">Date & Time</td><td style="padding:8px;font-weight:600">${dateStr}</td></tr>
            <tr><td style="padding:8px;color:#6B7280">Type</td><td style="padding:8px">${type}</td></tr>
            <tr style="background:#F9FAFB"><td style="padding:8px;color:#6B7280">Mode</td><td style="padding:8px">${mode}</td></tr>
          </table>
          <p style="color:#6B7280;font-size:13px">You will receive a reminder 24 hours before your appointment.</p>
          <p style="color:#6B7280;font-size:12px;margin-top:24px">MediSync · Healthcare Management Platform</p>
        </div>
      </div>
    `
  }));
};

export const sendAppointmentReminder = async ({ patientEmail, patientName, doctorName, date, hoursBeforeLabel }) => {
  const dateStr = new Date(date).toLocaleString('en', {
    weekday:'short', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
  await safeSend(() => resend.emails.send({
    from: FROM, to: patientEmail,
    subject: `Reminder: Appointment ${hoursBeforeLabel} — MediSync`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <div style="background:#F59E0B;color:white;padding:20px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:22px">⏰ Appointment Reminder</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;padding:24px;border-radius:0 0 12px 12px">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>Your appointment with <strong>${doctorName}</strong> is <strong>${hoursBeforeLabel}</strong>.</p>
          <p style="font-size:18px;font-weight:600;color:#4F46E5">${dateStr}</p>
          <p style="color:#6B7280;font-size:13px">Please arrive 10 minutes early for in-person consultations.</p>
        </div>
      </div>
    `
  }));
};

export const sendPasswordReset = async ({ email, name, resetLink }) => {
  await safeSend(() => resend.emails.send({
    from: FROM, to: email,
    subject: 'Reset Your Password — MediSync',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2>Reset Your Password</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
        <p style="color:#9EA5B4;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `
  }));
};
