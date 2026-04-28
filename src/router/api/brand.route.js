import express from 'express';
import {
    createBrand,
    deleteBrand,
    getAllBrands,
    getBrandById,
    getBrandBySlug,
    getFeaturedBrands,
    updateBrand
} from '../../controllers/client/index.js';
import { adminOnly, protect } from '../../middleware/index.js';
import {
    brandIdParam,
    createBrandValidation,
    getBrandsValidation,
    updateBrandValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/', getBrandsValidation, getAllBrands);
router.get('/featured', getFeaturedBrands);
router.get('/slug/:slug', getBrandBySlug);
router.get('/:id', brandIdParam, getBrandById);

router.post('/', protect, adminOnly, createBrandValidation, createBrand);
router.put('/:id', protect, adminOnly, brandIdParam, updateBrandValidation, updateBrand);
router.delete('/:id', protect, adminOnly, brandIdParam, deleteBrand);

export default router;
