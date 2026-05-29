import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Admin UX Flow', () => {
  describe('Complete admin journey', () => {
    it('step 1: admin dashboard exists', async () => {
      const ctrl = await import(
        '../../../backend/controllers/adminController.js'
      );
      expect(ctrl.adminDashboard).toBeDefined();
    });

    it('step 2: admin routes require authAdmin middleware', () => {
      const content = fs.readFileSync('backend/routes/adminRoute.js', 'utf-8');
      expect(content).toContain('authAdmin');
    });

    it('step 3: staff listing is configured', async () => {
      const { default: staffRouter } = await import(
        '../../../backend/routes/staffRoute.js'
      );
      expect(staffRouter).toBeDefined();
    });

    it('step 4: clinic config routes exist', async () => {
      const ctrl = await import(
        '../../../backend/controllers/configController.js'
      );
      expect(ctrl.getConfig).toBeDefined();
      expect(ctrl.putConfig).toBeDefined();
    });

    it('step 5: reports endpoint exists', async () => {
      const { default: reportRouter } = await import(
        '../../../backend/routes/reportRoute.js'
      );
      expect(reportRouter).toBeDefined();
    });
  });
});
