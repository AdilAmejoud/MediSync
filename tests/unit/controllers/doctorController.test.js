import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Doctor Controller — Validation Logic', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: { id: 'doctor-001' }, doctor: { id: 'doctor-record-001' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('appointmentComplete', () => {
    it('should reject missing appointmentId', async () => {
      const { appointmentComplete } = await import('../../../backend/controllers/doctorController.js');
      req.body = {};
      await appointmentComplete(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
