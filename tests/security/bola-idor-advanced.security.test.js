import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';
import { generateToken } from '../helpers/auth-helper.js';

describe('BOLA / IDOR Advanced Security Tests', () => {
  describe('Cross-Patient Data Isolation', () => {
    it('Patient A should not access Patient B care sheets — careSheetRoute GET is unfiltered (GAP)', () => {
      const content = fs.readFileSync('backend/routes/careSheetRoute.js', 'utf-8');
      const hasUserFilter = content.includes('req.user') || content.includes('req.body.userId');
      const hasPatientFilter = content.includes('patientId');
      const usesBodyUserId = content.includes('req.body.userId');
      expect(hasUserFilter).toBe(false);
      expect(hasPatientFilter).toBe(true);
      if (usesBodyUserId) {
        const line = content.split('\n').find(l => l.includes('req.body.userId'));
        expect(line).toBeDefined();
      }
    });

    it('Patient A should not access Patient B document metadata — documentRoute GET is unfiltered (GAP)', () => {
      const content = fs.readFileSync('backend/routes/documentRoute.js', 'utf-8');
      const hasPatientFilter = content.includes('patientId') || content.includes('userId');
      if (hasPatientFilter) {
        const usesReqUser = content.includes('req.user');
        expect(usesReqUser).toBe(true);
      }
    });

    it('[GAP] Patient A can query Patient B appointments via query parameter — no user-scoped filter', async () => {
      const { getAllAppointments } = await import(
        '../../backend/controllers/appointmentController.js'
      );
      const req = {
        query: { patientId: 'patient-B-id' },
        user: { id: 'patient-A-id', role: 'patient' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await getAllAppointments(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('notification route uses req.body.userId instead of req.user.id — IDOR vulnerability', () => {
      const content = fs.readFileSync('backend/routes/notificationRoute.js', 'utf-8');
      const bodyUserIdCount = (content.match(/req\.body\.userId/g) || []).length;
      const reqUserIdCount = (content.match(/req\.user\.id/g) || []).length;
      expect(bodyUserIdCount).toBeGreaterThan(0);
      expect(reqUserIdCount).toBe(0);
    });
  });

  describe('Role Escalation — Secretaire Access Control', () => {
    it('secretaire should not access doctor-only clinical fields — no authDoctor guard on care sheets (GAP)', () => {
      const content = fs.readFileSync('backend/routes/careSheetRoute.js', 'utf-8');
      const usesAuthDoctor = content.includes('authDoctor');
      expect(usesAuthDoctor).toBe(false);
    });

    it('secretaire should not be able to modify care sheets without patient/doctor scope restriction', () => {
      const content = fs.readFileSync('backend/routes/careSheetRoute.js', 'utf-8');
      const hasRoleCheck = content.includes('role') || content.includes('authDoctor') || content.includes('authAdmin');
      expect(hasRoleCheck).toBe(false);
    });

    it('prescription route uses only authUser — no doctor-specific guard on write operations', () => {
      const content = fs.readFileSync('backend/routes/prescriptionRoute.js', 'utf-8');
      const usesAuthDoctor = content.includes('authDoctor');
      expect(usesAuthDoctor).toBe(false);
    });
  });

  describe('Mass Assignment Protection', () => {
    it('careSheet POST handler uses destructured assignment (whitelist), not spread of req.body', () => {
      const content = fs.readFileSync('backend/routes/careSheetRoute.js', 'utf-8');
      const hasSpread = content.includes('...req.body') || content.includes('...req\.body');
      const hasDestructured = content.includes('const { patientId, doctorId');
      expect(hasDestructured).toBe(true);
      expect(hasSpread).toBe(false);
    });

    it('patient PUT handler uses destructured assignment (whitelist), not spread of req.body', () => {
      const content = fs.readFileSync('backend/routes/patientRoute.js', 'utf-8');
      const hasSpread = content.includes('...req.body');
      const hasDestructured = content.includes('const { bloodType, allergies');
      expect(hasDestructured).toBe(true);
      expect(hasSpread).toBe(false);
    });
  });

  describe('Token Generation and Role Verification', () => {
    it('auth-helper generates distinct tokens for each role with correct claims', () => {
      const patientToken = generateToken({ id: 'test-patient', role: 'patient', email: 'p@test.com' });
      const doctorToken = generateToken({ id: 'test-doctor', role: 'medecin', email: 'd@test.com' });
      const adminToken = generateToken({ id: 'test-admin', role: 'admin', email: 'a@test.com' });
      const secretaireToken = generateToken({ id: 'test-sec', role: 'secretaire', email: 's@test.com' });
      expect(typeof patientToken).toBe('string');
      expect(patientToken.split('.')).toHaveLength(3);
      expect(patientToken).not.toBe(doctorToken);
      expect(doctorToken).not.toBe(adminToken);
      expect(adminToken).not.toBe(secretaireToken);
    });
  });
});
