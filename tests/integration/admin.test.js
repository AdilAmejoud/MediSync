import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Admin — Integration Tests', () => {
  describe('Admin Routes', () => {
    it('admin route file exports a router', async () => {
      const { default: adminRouter } = await import(
        '../../backend/routes/adminRoute.js'
      );
      expect(adminRouter).toBeDefined();
    });

    it('admin controller has required exports', async () => {
      const controller = await import(
        '../../backend/controllers/adminController.js'
      );
      expect(controller.addDoctor).toBeDefined();
      expect(controller.allDoctors).toBeDefined();
      expect(controller.appointmentAdmin).toBeDefined();
      expect(controller.appointmentCancel).toBeDefined();
      expect(controller.adminDashboard).toBeDefined();
    });

    it('admin routes use authAdmin middleware', () => {
      const content = fs.readFileSync('backend/routes/adminRoute.js', 'utf-8');
      expect(content).toContain('authAdmin');
    });
  });
});
