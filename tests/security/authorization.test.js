import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Authorization Security Tests', () => {
  describe('Role Escalation', () => {
    it('patient token should not pass admin middleware', async () => {
      const { default: authAdmin } = await import(
        '../../backend/middlewares/authAdmin.js'
      );
      const req = { headers: { authorization: 'Bearer patient-token' } };
      const res = { json: jest.fn() };
      const next = jest.fn();
      await authAdmin(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('patient token should not pass doctor middleware', async () => {
      const { default: authDoctor } = await import(
        '../../backend/middlewares/authDoctor.js'
      );
      const req = { headers: { authorization: 'Bearer patient-token' } };
      const res = { json: jest.fn() };
      const next = jest.fn();
      await authDoctor(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Missing Secretary Guard', () => {
    it('should detect that no authSecretary middleware exists', () => {
      const middlewareDir = 'backend/middlewares';
      const files = fs.readdirSync(middlewareDir);
      const hasSecretaryGuard = files.some(
        (f) => f.includes('secretary') || f.includes('Secretary')
      );
      expect(hasSecretaryGuard).toBe(false);
    });
  });

  describe('Insecure Direct Object Reference (IDOR)', () => {
    it('notifications should use req.user.id not req.body.userId', () => {
      const content = fs.readFileSync(
        'backend/routes/notificationRoute.js',
        'utf-8'
      );
      const usesBodyUserId = (content.match(/req\.body\.userId/g) || []).length;
      const usesReqUserId = (content.match(/req\.user\.id/g) || []).length;
      expect(usesBodyUserId).toBeLessThanOrEqual(usesReqUserId);
    });
  });
});
