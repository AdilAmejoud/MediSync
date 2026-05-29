import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Auth Controller — Validation Logic', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: { id: 'patient-001' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('login', () => {
    it('should reject missing email', async () => {
      const { login } = await import('../../../backend/controllers/authController.js');
      req.body = { password: 'test123', role: 'patient' };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing password', async () => {
      const { login } = await import('../../../backend/controllers/authController.js');
      req.body = { email: 'test@test.com', role: 'patient' };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing role', async () => {
      const { login } = await import('../../../backend/controllers/authController.js');
      req.body = { email: 'test@test.com', password: 'test123' };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('register', () => {
    it('should reject missing name', async () => {
      const { register } = await import('../../../backend/controllers/authController.js');
      req.body = { email: 'test@test.com', password: 'Password123!' };
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing email', async () => {
      const { register } = await import('../../../backend/controllers/authController.js');
      req.body = { name: 'Test', password: 'Password123!' };
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing password', async () => {
      const { register } = await import('../../../backend/controllers/authController.js');
      req.body = { name: 'Test', email: 'test@test.com' };
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
