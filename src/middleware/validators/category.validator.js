import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu danh mục không hợp lệ',
            errors: errors.array().map((error) => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

const mongoId = (value, fieldName) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`${fieldName} không hợp lệ`);
    }
    return true;
};

export const categoryIdParam = [
    param('id').custom((value) => mongoId(value, 'id')),
    validate
];

export const getCategoriesValidation = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'inactive']),
    query('featured').optional().isIn(['true', 'false']),
    query('parent').optional().custom((value) => value === 'root' || mongoose.Types.ObjectId.isValid(value)),
    query('sort').optional().isIn(['order', '-order', 'name', '-name', 'createdAt', '-createdAt']),
    validate
];

export const createCategoryValidation = [
    body('name').trim().notEmpty().isLength({ min: 2, max: 120 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('parent').optional({ nullable: true, checkFalsy: true }).custom((value) => mongoId(value, 'parent')),
    body('image').optional().trim().isURL(),
    body('icon').optional().trim().isLength({ max: 100 }),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('status').optional().isIn(['active', 'inactive']),
    body('featured').optional().isBoolean().toBoolean(),
    body('seo.title').optional().trim().isLength({ max: 70 }),
    body('seo.description').optional().trim().isLength({ max: 160 }),
    body('seo.keywords').optional().isArray(),
    validate
];

export const updateCategoryValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('parent').optional({ nullable: true, checkFalsy: true }).custom((value) => mongoId(value, 'parent')),
    body('image').optional().trim().isURL(),
    body('icon').optional().trim().isLength({ max: 100 }),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('status').optional().isIn(['active', 'inactive']),
    body('featured').optional().isBoolean().toBoolean(),
    body('seo.title').optional().trim().isLength({ max: 70 }),
    body('seo.description').optional().trim().isLength({ max: 160 }),
    body('seo.keywords').optional().isArray(),
    validate
];
