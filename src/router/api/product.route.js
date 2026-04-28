import express from 'express';
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getFeaturedProducts,
    getProductById,
    getProductBySlug,
    searchProducts,
    uploadProductImage,
    updateProduct
} from '../../controllers/client/index.js';
import { adminOnly, protect } from '../../middleware/index.js';
import { uploadMemory } from '../../config/index.js';
import {
    createProductValidation,
    getAllProductsValidation,
    mongoIdParam,
    searchProductsValidation,
    updateProductValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/', getAllProductsValidation, getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProductsValidation, searchProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', mongoIdParam('id'), getProductById);

router.post('/upload-image', protect, adminOnly, uploadMemory.single('image'), uploadProductImage);
router.post('/', protect, adminOnly, createProductValidation, createProduct);
router.put('/:id', protect, adminOnly, mongoIdParam('id'), updateProductValidation, updateProduct);
router.delete('/:id', protect, adminOnly, mongoIdParam('id'), deleteProduct);

export default router;
