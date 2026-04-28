import express from 'express';
import {
    createCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    getCategoryTree,
    getFeaturedCategories,
    updateCategory
} from '../../controllers/client/index.js';
import { adminOnly, protect } from '../../middleware/index.js';
import {
    categoryIdParam,
    createCategoryValidation,
    getCategoriesValidation,
    updateCategoryValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/', getCategoriesValidation, getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/featured', getFeaturedCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', categoryIdParam, getCategoryById);

router.post('/', protect, adminOnly, createCategoryValidation, createCategory);
router.put('/:id', protect, adminOnly, categoryIdParam, updateCategoryValidation, updateCategory);
router.delete('/:id', protect, adminOnly, categoryIdParam, deleteCategory);

export default router;
