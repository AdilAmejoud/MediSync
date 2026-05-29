import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

const makeAuthHeader = (token) => `Bearer ${token}`;

const userTokens = {
  admin: generateToken({ id: 'admin-001', role: 'admin', email: 'admin@medisync.com' }),
  doctor: generateToken({ id: 'doctor-001', role: 'medecin', email: 'doctor@medisync.com' }),
  patient: generateToken({ id: 'patient-001', role: 'patient', email: 'patient@test.com' }),
  secretaire: generateToken({ id: 'secretary-001', role: 'secretaire', email: 'secretaire@test.com' }),
};

export { generateToken, makeAuthHeader, userTokens };
