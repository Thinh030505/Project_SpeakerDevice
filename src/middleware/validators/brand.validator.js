import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu thương hiệu không hợp lệ',
            errors: errors.array().map((error) => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

export const brandIdParam = [
    param('id').custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('id không hợp lệ');
        }
        return true;
    }),
    validate
];

export const getBrandsValidation = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'inactive']),
    query('featured').optional().isIn(['true', 'false']),
    query('sort').optional().isIn(['order', '-order', 'name', '-name', 'createdAt', '-createdAt', 'productCount']),
    validate
];

export const createBrandValidation = [
    body('name').trim().notEmpty().isLength({ min: 2, max: 120 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('shortDescription').optional().trim().isLength({ max: 200 }),
    body('logo').optional().trim().isURL(),
    body('banner').optional().trim().isURL(),
    body('website').optional().trim().isURL(),
    body('country').optional().trim().isLength({ max: 100 }),
    body('foundedYear').optional().isInt({ min: 1800, max: new Date().getFullYear() }).toInt(),
    body('contactEmail').optional().trim().isEmail().normalizeEmail(),
    body('status').optional().isIn(['active', 'inactive']),
    body('featured').optional().isBoolean().toBoolean(),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('socialMedia').optional().isObject(),
    body('socialMedia.facebook').optional().trim().isURL(),
    body('socialMedia.instagram').optional().trim().isURL(),
    body('socialMedia.twitter').optional().trim().isURL(),
    body('socialMedia.youtube').optional().trim().isURL(),
    body('seo.title').optional().trim().isLength({ max: 70 }),
    body('seo.description').optional().trim().isLength({ max: 160 }),
    body('seo.keywords').optional().isArray(),
    validate
];

export const updateBrandValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('shortDescription').optional().trim().isLength({ max: 200 }),
    body('logo').optional().trim().isURL(),
    body('banner').optional().trim().isURL(),
    body('website').optional().trim().isURL(),
    body('country').optional().trim().isLength({ max: 100 }),
    body('foundedYear').optional().isInt({ min: 1800, max: new Date().getFullYear() }).toInt(),
    body('contactEmail').optional().trim().isEmail().normalizeEmail(),
    body('status').optional().isIn(['active', 'inactive']),
    body('featured').optional().isBoolean().toBoolean(),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('socialMedia').optional().isObject(),
    body('socialMedia.facebook').optional().trim().isURL(),
    body('socialMedia.instagram').optional().trim().isURL(),
    body('socialMedia.twitter').optional().trim().isURL(),
    body('socialMedia.youtube').optional().trim().isURL(),
    body('seo.title').optional().trim().isLength({ max: 70 }),
    body('seo.description').optional().trim().isLength({ max: 160 }),
    body('seo.keywords').optional().isArray(),
    validate
];
