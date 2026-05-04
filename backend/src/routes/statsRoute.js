import express from 'express';
const router = express.Router();
import {
  getAdminStats,
  getDoctorStats,
  getPatientStats,
  getSecretaryStats
} from '../controllers/statsController.js';
import authAdmin from '../middlewares/authAdmin.js';
import authDoctor from '../middlewares/authDoctor.js';
import authUser from '../middlewares/authUser.js';

router.get('/admin', authAdmin, getAdminStats);
router.get('/doctor', authDoctor, getDoctorStats);
router.get('/patient', authUser, getPatientStats);
router.get('/secretary', authUser, getSecretaryStats);

export default router;
