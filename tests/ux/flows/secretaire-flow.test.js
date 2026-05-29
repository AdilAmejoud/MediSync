import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Secretaire UX Flow', () => {
  describe('Complete secretaire journey', () => {
    it('step 1: secretary stats endpoint is configured', async () => {
      const ctrl = await import(
        '../../../backend/controllers/statsController.js'
      );
      expect(ctrl.getSecretaryStats).toBeDefined();
    });

    it('step 2: no authSecretary middleware exists (gap)', () => {
      const files = fs.readdirSync('backend/middlewares');
      const hasSecretaryGuard = files.some(
        (f) => f.toLowerCase().includes('secretary')
      );
      expect(hasSecretaryGuard).toBe(false);
    });

    it('step 3: secretary can access appointments through authUser', () => {
      const content = fs.readFileSync('backend/routes/appointmentRoute.js', 'utf-8');
      expect(content).toContain('authUser');
    });

    it('step 4: no secretary-specific route file exists', () => {
      const routeFiles = fs.readdirSync('backend/routes');
      const secretaryRoute = routeFiles.find((f) =>
        f.toLowerCase().includes('secretary')
      );
      expect(secretaryRoute).toBeUndefined();
    });
  });
});
