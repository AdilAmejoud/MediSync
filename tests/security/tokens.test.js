import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('JWT Token Security Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('Missing Token', () => {
    it('authUser rejects requests without authorization header', async () => {
      const { default: authUser } = await import(
        '../../backend/middlewares/authUser.js'
      );
      await authUser(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('authAdmin rejects requests without authorization header', async () => {
      const { default: authAdmin } = await import(
        '../../backend/middlewares/authAdmin.js'
      );
      await authAdmin(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('authDoctor rejects requests without authorization header', async () => {
      const { default: authDoctor } = await import(
        '../../backend/middlewares/authDoctor.js'
      );
      await authDoctor(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('authUser rejects requests with malformed token', async () => {
      const { default: authUser } = await import(
        '../../backend/middlewares/authUser.js'
      );
      req.headers.authorization = 'Bearer not-a-valid-token';
      await authUser(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Bearer Scheme', () => {
    it('authUser rejects token without Bearer prefix', async () => {
      const { default: authUser } = await import(
        '../../backend/middlewares/authUser.js'
      );
      req.headers.authorization = 'Token some-token';
      await authUser(req, res, next);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
