import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Auth Security Tests', () => {
  describe('Brute Force Protection', () => {
    it('rate limiting is configured on auth endpoints', () => {
      const serverContent = fs.readFileSync('backend/server.js', 'utf-8');
      expect(serverContent).toContain('authLimiter');
      expect(serverContent).toContain('max: 5');
    });
  });

  describe('Password Policy', () => {
    it('isStrongPassword utility validates password strength', async () => {
      const { isStrongPassword } = await import(
        '../../backend/utils/passwordValidator.js'
      );
      expect(isStrongPassword('Weak1')).toBe(false);
      expect(isStrongPassword('StrongPass123!')).toBe(true);
    });
  });

  describe('2FA Verification', () => {
    it('2FA endpoints exist in auth route', () => {
      const content = fs.readFileSync('backend/routes/authRoute.js', 'utf-8');
      expect(content).toContain('2fa');
    });
  });
});
