import express from 'express';
import {
    createAdminBanner,
    deleteAdminBanner,
    deleteAdminReview,
    getAdminBanners,
    getAdminContactMessages,
    getAdminNewsletterSubscribers,
    getDashboardSummary,
    getAdminReviews,
    updateAdminBanner,
    updateAdminContactMessage,
    updateAdminNewsletterSubscriber,
    updateAdminReview,
    uploadAdminImage
} from '../../controllers/admin/index.js';
import { adminOnly, protect } from '../../middleware/index.js';
import { mongoIdParam } from '../../middleware/validators/index.js';
import { uploadMemory } from '../../config/index.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/dashboard', getDashboardSummary);
router.post('/upload-image', uploadMemory.single('image'), uploadAdminImage);
router.get('/banners', getAdminBanners);
router.post('/banners', createAdminBanner);
router.put('/banners/:id', mongoIdParam('id'), updateAdminBanner);
router.delete('/banners/:id', mongoIdParam('id'), deleteAdminBanner);
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id', mongoIdParam('id'), updateAdminReview);
router.delete('/reviews/:id', mongoIdParam('id'), deleteAdminReview);
router.get('/engagement/contacts', getAdminContactMessages);
router.patch('/engagement/contacts/:id', mongoIdParam('id'), updateAdminContactMessage);
router.get('/engagement/newsletter', getAdminNewsletterSubscribers);
router.patch('/engagement/newsletter/:id', mongoIdParam('id'), updateAdminNewsletterSubscriber);

export default router;
