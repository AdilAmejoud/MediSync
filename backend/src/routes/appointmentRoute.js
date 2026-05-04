import express from 'express';
const router = express.Router();
import {
  getAllAppointments,
  createAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  patientCheckIn,
  generateClinicQR
} from '../controllers/appointmentController.js';
import authUser from '../middlewares/authUser.js';

router.get('/', authUser, getAllAppointments);
router.post('/', authUser, createAppointment);
router.post('/check-in', authUser, patientCheckIn);
router.get('/clinic-qr', generateClinicQR);
router.patch('/:id/status', authUser, updateAppointmentStatus);
router.patch('/:id/cancel', authUser, cancelAppointment);

export default router;
