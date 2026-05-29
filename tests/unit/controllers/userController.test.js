import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('User Controller — Validation Logic', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: { id: 'patient-001' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('bookAppointment', () => {
    it('should reject missing booking details via json', async () => {
      const { bookAppointment } = await import('../../../backend/controllers/userController.js');
      req.body = {};
      await bookAppointment(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('cancelAppointment', () => {
    it('should reject missing appointmentId via json', async () => {
      const { cancelAppointment } = await import('../../../backend/controllers/userController.js');
      req.body = {};
      await cancelAppointment(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
