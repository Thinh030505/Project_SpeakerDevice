import express from 'express';
import {
    cancelOrder,
    createOrder,
    getAllOrdersAdmin,
    getOrderById,
    getOrders,
    updateOrderStatus,
    updatePaymentStatus
} from '../../controllers/client/index.js';
import { adminOnly, optionalAuth, protect } from '../../middleware/index.js';

const router = express.Router();

router.use(optionalAuth);

router.get('/admin/all', protect, adminOnly, getAllOrdersAdmin);
router.post('/', createOrder);
router.get('/', getOrders);
router.post('/:id/cancel', cancelOrder);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);
router.patch('/:id/payment', protect, adminOnly, updatePaymentStatus);
router.get('/:id', getOrderById);

export default router;
