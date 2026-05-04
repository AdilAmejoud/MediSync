import express from 'express';
const router = express.Router();
import { getConfig, putConfig } from '../controllers/configController.js';
import authAdmin from '../middlewares/authAdmin.js';

router.get('/', authAdmin, getConfig);
router.put('/', authAdmin, putConfig);

export default router;
