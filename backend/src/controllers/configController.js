import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'clinic-config.json');

const defaults = {
  clinicName: 'Trustcare Clinic',
  clinicAddress: 'Lasvegas Branch, NV',
  clinicPhone: '0522448899',
  clinicEmail: 'contact@trustcare.com',
  specialties: ['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics'],
  currency: 'MAD',
  invoicePrefix: 'FAC-',
  taxRate: 15,
  slotFees: [
    { name: 'Standard Consultation', duration: 15, fee: 300 },
    { name: 'Specialist Checkup', duration: 30, fee: 500 },
    { name: 'Diagnostic Test', duration: 60, fee: 800 }
  ],
  notifications: {
    newBooking: true,
    reminder24h: true,
    reminder1h: true,
    cancelled: true,
    newPatient: true,
    dailySummary: false
  },
  language: 'en',
  theme: 'system',
  calendarView: 'week'
};

function read() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...defaults };
}

function write(data) {
  const merged = { ...read(), ...data };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export const getConfig = (req, res) => {
  res.json({ success: true, data: read() });
};

export const putConfig = (req, res) => {
  const updated = write(req.body);
  res.json({ success: true, data: updated });
};
