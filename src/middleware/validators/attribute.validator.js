import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu thuộc tính không hợp lệ',
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

export const attributeIdParam = [
    param('id').custom((value) => mongoId(value, 'id')),
    validate
];

export const getAttributesValidation = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'inactive']),
    query('type').optional().isIn(['text', 'select', 'multiselect', 'color', 'number', 'boolean', 'date']),
    query('category').optional().custom((value) => mongoId(value, 'category')),
    query('filterable').optional().isIn(['true', 'false']),
    query('searchable').optional().isIn(['true', 'false']),
    query('sort').optional().isIn(['order', '-order', 'name', '-name', 'createdAt', '-createdAt']),
    validate
];

const optionValidation = [
    body('options').optional().isArray(),
    body('options.*.label').optional().trim().notEmpty(),
    body('options.*.value').optional().trim().notEmpty(),
    body('options.*.color').optional().trim().isLength({ max: 50 }),
    body('options.*.image').optional().trim().isURL()
];

const categoriesValidation = body('categories')
    .optional()
    .isArray()
    .custom((value) => {
        for (const item of value) {
            mongoId(item, 'categories');
        }
        return true;
    });

export const createAttributeValidation = [
    body('name').trim().notEmpty().isLength({ min: 2, max: 120 }),
    body('type').optional().isIn(['text', 'select', 'multiselect', 'color', 'number', 'boolean', 'date']),
    body('description').optional().trim().isLength({ max: 1000 }),
    ...optionValidation,
    categoriesValidation,
    body('required').optional().isBoolean().toBoolean(),
    body('filterable').optional().isBoolean().toBoolean(),
    body('searchable').optional().isBoolean().toBoolean(),
    body('unit').optional().trim().isLength({ max: 30 }),
    body('minValue').optional().isFloat().toFloat(),
    body('maxValue').optional().isFloat().toFloat(),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('status').optional().isIn(['active', 'inactive']),
    validate
];

export const updateAttributeValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('type').optional().isIn(['text', 'select', 'multiselect', 'color', 'number', 'boolean', 'date']),
    body('description').optional().trim().isLength({ max: 1000 }),
    ...optionValidation,
    categoriesValidation,
    body('required').optional().isBoolean().toBoolean(),
    body('filterable').optional().isBoolean().toBoolean(),
    body('searchable').optional().isBoolean().toBoolean(),
    body('unit').optional().trim().isLength({ max: 30 }),
    body('minValue').optional().isFloat().toFloat(),
    body('maxValue').optional().isFloat().toFloat(),
    body('order').optional().isInt({ min: 0 }).toInt(),
    body('status').optional().isIn(['active', 'inactive']),
    validate
];
