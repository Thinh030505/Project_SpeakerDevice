import express from 'express';
import { createProductReview, getProductReviews } from '../../controllers/client/index.js';
import { optionalAuth } from '../../middleware/index.js';

const router = express.Router();

router.use(optionalAuth);

router.get('/product/:slug', getProductReviews);
router.post('/product/:slug', createProductReview);

export default router;
