import { jest, describe, it, expect } from '@jest/globals';

describe('Auth — Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 when email is missing', async () => {
      const { login } = await import('../../backend/controllers/authController.js');
      const req = { body: { password: 'test123', role: 'patient' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when password is missing', async () => {
      const { login } = await import('../../backend/controllers/authController.js');
      const req = { body: { email: 'test@test.com', role: 'patient' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should exist as an exported route', async () => {
      const { default: authRouter } = await import(
        '../../backend/routes/authRoute.js'
      );
      expect(authRouter).toBeDefined();
    });
  });
});
