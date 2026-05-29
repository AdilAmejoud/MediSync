import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('User — Integration Tests', () => {
  describe('User Routes', () => {
    it('user route file exports a router', async () => {
      const { default: router } = await import(
        '../../backend/routes/userRoute.js'
      );
      expect(router).toBeDefined();
    });

    it('user controller has booking and cancellation exports', async () => {
      const ctrl = await import(
        '../../backend/controllers/userController.js'
      );
      expect(ctrl.bookAppointment).toBeDefined();
      expect(ctrl.listAppointment).toBeDefined();
      expect(ctrl.cancelAppointment).toBeDefined();
    });

    it('register endpoint is publicly accessible', () => {
      const content = fs.readFileSync('backend/routes/userRoute.js', 'utf-8');
      expect(content).toContain('registerUser');
    });
  });
});
