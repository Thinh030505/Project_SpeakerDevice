import express from 'express';
import {
    addToCart,
    applyPromoCode,
    clearCart,
    getCart,
    removeFromCart,
    updateCartItem
} from '../../controllers/client/index.js';
import { optionalAuth } from '../../middleware/index.js';

const router = express.Router();

router.use(optionalAuth);

router.get('/', getCart);
router.post('/', addToCart);
router.patch('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);
router.post('/promo', applyPromoCode);
router.delete('/', clearCart);

export default router;
