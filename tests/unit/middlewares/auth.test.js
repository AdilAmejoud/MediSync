import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Auth Middleware — Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, user: undefined };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('authAdmin', () => {
    it('should reject with json response if no auth header', async () => {
      const { default: authAdmin } = await import(
        '../../../backend/middlewares/authAdmin.js'
      );
      await authAdmin(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authUser', () => {
    it('should reject with json response if no auth header', async () => {
      const { default: authUser } = await import(
        '../../../backend/middlewares/authUser.js'
      );
      await authUser(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authDoctor', () => {
    it('should reject with json response if no auth header', async () => {
      const { default: authDoctor } = await import(
        '../../../backend/middlewares/authDoctor.js'
      );
      await authDoctor(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
