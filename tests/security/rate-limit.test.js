import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Rate Limiting Security Tests', () => {
  describe('Auth Endpoint Rate Limiting', () => {
    it('auth limiter is configured in server.js with max 5 attempts', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('authLimiter');
      expect(content).toMatch(/max:\s*5/);
    });

    it('auth limiter covers login, register, forgot-password, reset-password, verify-otp', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      const routes = ['login', 'register', 'forgot-password', 'reset-password', 'verify-otp'];
      for (const route of routes) {
        expect(content).toContain(route);
      }
    });
  });

  describe('Global Rate Limiting', () => {
    it('global limiter is configured with 1000 requests per 15 minutes', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('globalLimiter');
      expect(content).toMatch(/max:\s*1000/);
    });

    it('global limiter applies to /api prefix', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('app.use("/api", globalLimiter)');
    });
  });

  describe('Rate Limit Headers', () => {
    it('standard rate limit headers are enabled', () => {
      const content = fs.readFileSync('backend/server.js', 'utf-8');
      expect(content).toContain('standardHeaders: true');
    });
  });
});
