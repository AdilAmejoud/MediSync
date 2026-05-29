import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Doctor — Integration Tests', () => {
  describe('Doctor Routes', () => {
    it('doctor route file exports a router', async () => {
      const { default: router } = await import(
        '../../backend/routes/doctorRoute.js'
      );
      expect(router).toBeDefined();
    });

    it('doctor controller has required exports', async () => {
      const ctrl = await import(
        '../../backend/controllers/doctorController.js'
      );
      expect(ctrl.doctorList).toBeDefined();
      expect(ctrl.appointmentsDoctor).toBeDefined();
      expect(ctrl.appointmentComplete).toBeDefined();
    });

    it('public GET /doctor/list is in the routes', () => {
      const content = fs.readFileSync('backend/routes/doctorRoute.js', 'utf-8');
      expect(content).toContain('doctorList');
    });
  });
});
