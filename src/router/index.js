import express from 'express';
import apiRoutes from './api/index.js';
import webRoutes from './web/index.js';

const router = express.Router();

router.use('/api', apiRoutes);
router.use('/', webRoutes);

export default router;
