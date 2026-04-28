import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import productRoutes from "./product.route.js";
import categoryRoutes from "./category.route.js";
import brandRoutes from "./brand.route.js";
import attributeRoutes from "./attribute.route.js";
import cartRoutes from './cart.route.js';
import orderRoutes from './order.route.js';
import engagementRoutes from './engagement.route.js';
import reviewRoutes from './review.route.js';
import adminRoutes from './admin.route.js';

const router = express.Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API router is available'
    });
});

// Auth routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

// Product routes
router.use("/products", productRoutes);

// Category routes
router.use("/categories", categoryRoutes);

// Brand routes
router.use("/brands", brandRoutes);

// Attribute routes
router.use("/attributes", attributeRoutes);

// Cart routes
router.use('/cart', cartRoutes);

// Order routes
router.use('/orders', orderRoutes);

// Contact/newsletter routes
router.use('/engagement', engagementRoutes);

// Reviews
router.use('/reviews', reviewRoutes);

// Admin utilities
router.use('/admin', adminRoutes);

export default router;
