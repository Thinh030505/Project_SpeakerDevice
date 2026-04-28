import express from 'express';
import { createContactMessage, subscribeNewsletter } from '../../controllers/client/index.js';

const router = express.Router();

router.post('/contact', createContactMessage);
router.post('/newsletter', subscribeNewsletter);

export default router;
