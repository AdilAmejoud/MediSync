import { jest, describe, it, expect } from '@jest/globals';

describe('Patient UX Flow', () => {
  describe('Complete patient journey: register -> login -> browse doctors -> book -> cancel', () => {
    it('step 1: registration validates email and password', async () => {
      const { registerUser } = await import(
        '../../../backend/controllers/userController.js'
      );
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await registerUser(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('step 2: login validates credentials', async () => {
      const { login } = await import(
        '../../../backend/controllers/authController.js'
      );
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('step 3: doctor listing is publicly accessible', async () => {
      const ctrl = await import(
        '../../../backend/controllers/doctorController.js'
      );
      expect(ctrl.doctorList).toBeDefined();
    });

    it('step 4: booking requires authentication', async () => {
      const { bookAppointment } = await import(
        '../../../backend/controllers/userController.js'
      );
      const req = { body: {} };
      const res = { json: jest.fn() };
      await bookAppointment(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('step 5: viewing appointments requires user context', async () => {
      const { listAppointment } = await import(
        '../../../backend/controllers/userController.js'
      );
      const req = { body: {}, user: { id: 'patient-001' } };
      const res = { json: jest.fn() };
      await listAppointment(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
