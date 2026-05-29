import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Appointments — Integration Tests', () => {
  describe('Appointment Routes', () => {
    it('appointment route file exports a router', async () => {
      const { default: router } = await import(
        '../../backend/routes/appointmentRoute.js'
      );
      expect(router).toBeDefined();
    });

    it('appointment controller has required exports', async () => {
      const ctrl = await import(
        '../../backend/controllers/appointmentController.js'
      );
      expect(ctrl.getAllAppointments).toBeDefined();
      expect(ctrl.createAppointment).toBeDefined();
      expect(ctrl.updateAppointmentStatus).toBeDefined();
      expect(ctrl.cancelAppointment).toBeDefined();
    });

    it('appointment routes use authUser middleware', () => {
      const content = fs.readFileSync('backend/routes/appointmentRoute.js', 'utf-8');
      expect(content).toContain('authUser');
    });
  });
});
