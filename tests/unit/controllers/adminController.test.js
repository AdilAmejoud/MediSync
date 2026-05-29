import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Admin Controller — Validation Logic', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: { id: 'admin-001', role: 'admin' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('addDoctor', () => {
    it('should reject missing name via json response', async () => {
      const { addDoctor } = await import('../../../backend/controllers/adminController.js');
      req.body = { email: 'doc@test.com', password: 'Pass123!', speciality: 'Cardiology' };
      await addDoctor(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should reject missing email via json response', async () => {
      const { addDoctor } = await import('../../../backend/controllers/adminController.js');
      req.body = { name: 'Dr. Test', password: 'Pass123!', speciality: 'Cardiology' };
      await addDoctor(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });
});
