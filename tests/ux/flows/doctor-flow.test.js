import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Doctor UX Flow', () => {
  describe('Complete doctor journey', () => {
    it('step 1: public doctor list is accessible', async () => {
      const ctrl = await import(
        '../../../backend/controllers/doctorController.js'
      );
      expect(ctrl.doctorList).toBeDefined();
    });

    it('step 2: doctor appointments require doctor role', () => {
      const content = fs.readFileSync('backend/routes/doctorRoute.js', 'utf-8');
      expect(content).toContain('authDoctor');
    });

    it('step 3: doctor dashboard exists', async () => {
      const ctrl = await import(
        '../../../backend/controllers/doctorController.js'
      );
      expect(ctrl.doctorDashboard).toBeDefined();
    });

    it('step 4: doctor profile endpoint exists', async () => {
      const ctrl = await import(
        '../../../backend/controllers/doctorController.js'
      );
      expect(ctrl.doctorProfile).toBeDefined();
    });
  });
});
