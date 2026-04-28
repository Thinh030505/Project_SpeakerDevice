import express from 'express';
import {
    createAttribute,
    deleteAttribute,
    getAllAttributes,
    getAttributeById,
    getAttributeBySlug,
    getFilterableAttributes,
    updateAttribute
} from '../../controllers/client/index.js';
import { adminOnly, protect } from '../../middleware/index.js';
import {
    attributeIdParam,
    createAttributeValidation,
    getAttributesValidation,
    updateAttributeValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/', getAttributesValidation, getAllAttributes);
router.get('/filterable', getFilterableAttributes);
router.get('/slug/:slug', getAttributeBySlug);
router.get('/:id', attributeIdParam, getAttributeById);

router.post('/', protect, adminOnly, createAttributeValidation, createAttribute);
router.put('/:id', protect, adminOnly, attributeIdParam, updateAttributeValidation, updateAttribute);
router.delete('/:id', protect, adminOnly, attributeIdParam, deleteAttribute);

export default router;
