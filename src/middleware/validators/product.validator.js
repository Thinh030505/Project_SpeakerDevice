import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Du lieu khong hop le.',
            errors: errors.array().map((error) => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

export const mongoIdParam = (paramName = 'id') => [
    param(paramName)
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error(`${paramName} khong hop le`);
            }
            return true;
        }),
    validate
];

export const getAllProductsValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page phai la so nguyen >= 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phai la so nguyen tu 1-100').toInt(),
    query('sort')
        .optional()
        .isIn(['-createdAt', 'createdAt', 'price_asc', 'price_desc', 'rating', '-rating', 'name', '-name'])
        .withMessage('sort khong hop le'),
    query('status')
        .optional()
        .isIn(['active', 'draft', 'inactive', 'archived'])
        .withMessage('status khong hop le'),
    query('category')
        .optional()
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('category ID khong hop le');
            }
            return true;
        }),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice phai la so >= 0').toFloat(),
    query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('maxPrice phai la so >= 0')
        .toFloat()
        .custom((value, { req }) => {
            if (req.query.minPrice && value < Number(req.query.minPrice)) {
                throw new Error('maxPrice phai lon hon hoac bang minPrice');
            }
            return true;
        }),
    query('featured').optional().isIn(['true', 'false']).withMessage('featured phai la true hoac false'),
    query('inStock').optional().isIn(['true', 'false']).withMessage('inStock phai la true hoac false'),
    query('tags').optional().isString().withMessage('tags phai la chuoi'),
    validate
];

export const searchProductsValidation = [
    query('q')
        .trim()
        .notEmpty()
        .withMessage('Tu khoa tim kiem khong duoc de trong')
        .isLength({ min: 1, max: 100 })
        .withMessage('Tu khoa tim kiem phai tu 1-100 ky tu'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phai la so nguyen tu 1-100').toInt(),
    query('page').optional().isInt({ min: 1 }).withMessage('page phai la so nguyen >= 1').toInt(),
    query('category')
        .optional()
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('category ID khong hop le');
            }
            return true;
        }),
    validate
];

const variantRules = (optional = false) => {
    const base = optional
        ? body('variants').optional().isArray({ min: 1 }).withMessage('variants phai la array co it nhat 1 phan tu')
        : body('variants').isArray({ min: 1 }).withMessage('San pham phai co it nhat 1 variant');

    return [
        base,
        body('variants.*.sku')
            .if(body('variants').exists())
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('SKU phai tu 2-100 ky tu')
            .matches(/^[A-Z0-9\-_]+$/i)
            .withMessage('SKU chi duoc chua chu cai, so, dau gach ngang va gach duoi'),
        body('variants.*.price')
            .if(body('variants').exists())
            .notEmpty()
            .withMessage('Gia variant khong duoc de trong')
            .isFloat({ min: 0 })
            .withMessage('Gia phai la so >= 0')
            .toFloat(),
        body('variants.*.compareAtPrice')
            .if(body('variants').exists())
            .optional({ nullable: true })
            .isFloat({ min: 0 })
            .withMessage('compareAtPrice phai la so >= 0')
            .toFloat()
            .custom((value, { req, path }) => {
                const match = path.match(/variants\[(\d+)\]/);
                if (match) {
                    const idx = parseInt(match[1], 10);
                    const price = req.body.variants?.[idx]?.price;
                    if (price !== undefined && value <= Number(price)) {
                        throw new Error('compareAtPrice phai lon hon price');
                    }
                }
                return true;
            }),
        body('variants.*.stock')
            .if(body('variants').exists())
            .notEmpty()
            .withMessage('Stock khong duoc de trong')
            .isInt({ min: 0 })
            .withMessage('Stock phai la so nguyen >= 0')
            .toInt(),
        body('variants.*.attributes')
            .if(body('variants').exists())
            .optional({ nullable: true })
            .isObject()
            .withMessage('Attributes phai la object'),
        body('variants.*.weight')
            .if(body('variants').exists())
            .optional({ nullable: true })
            .isFloat({ min: 0 })
            .withMessage('Weight phai la so >= 0')
            .toFloat(),
        body('variants.*.barcode')
            .if(body('variants').exists())
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Barcode khong duoc qua 50 ky tu')
    ];
};

export const createProductValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Ten san pham khong duoc de trong')
        .isLength({ min: 3, max: 200 })
        .withMessage('Ten san pham phai tu 3-200 ky tu'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Mo ta san pham khong duoc de trong')
        .isLength({ min: 10 })
        .withMessage('Mo ta phai co it nhat 10 ky tu'),
    body('shortDescription')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Mo ta ngan khong duoc qua 200 ky tu'),
    body('brand')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Brand khong duoc qua 100 ky tu'),
    body('category')
        .notEmpty()
        .withMessage('Category la bat buoc')
        .custom((value) => {
            const normalized = String(value || '').trim();
            if (!normalized) {
                throw new Error('Category la bat buoc');
            }
            return true;
        }),
    ...variantRules(false),
    body('images').optional().isArray().withMessage('Images phai la array'),
    body('images.*').optional().trim().isURL().withMessage('Moi image phai la URL hop le'),
    body('tags').optional().isArray().withMessage('Tags phai la array'),
    body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Moi tag khong duoc qua 50 ky tu'),
    body('featured').optional().isBoolean().withMessage('Featured phai la boolean').toBoolean(),
    body('status').optional().isIn(['draft', 'active', 'inactive']).withMessage('Status khong hop le'),
    body('seo.title').optional().trim().isLength({ max: 70 }).withMessage('SEO title khong duoc qua 70 ky tu'),
    body('seo.description').optional().trim().isLength({ max: 160 }).withMessage('SEO description khong duoc qua 160 ky tu'),
    validate
];

export const updateProductValidation = [
    body('name').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Ten san pham phai tu 3-200 ky tu'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Mo ta phai co it nhat 10 ky tu'),
    body('shortDescription').optional().trim().isLength({ max: 200 }).withMessage('Mo ta ngan khong duoc qua 200 ky tu'),
    body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand khong duoc qua 100 ky tu'),
    body('category')
        .optional()
        .custom((value) => {
            const normalized = String(value || '').trim();
            if (!normalized) {
                throw new Error('Category khong hop le');
            }
            return true;
        }),
    ...variantRules(true),
    body('images').optional().isArray().withMessage('Images phai la array'),
    body('images.*').optional().trim().isURL().withMessage('Moi image phai la URL hop le'),
    body('tags').optional().isArray().withMessage('Tags phai la array'),
    body('featured').optional().isBoolean().withMessage('Featured phai la boolean').toBoolean(),
    body('status').optional().isIn(['draft', 'active', 'inactive', 'archived']).withMessage('Status khong hop le'),
    body('seo.title').optional().trim().isLength({ max: 70 }).withMessage('SEO title khong duoc qua 70 ky tu'),
    body('seo.description').optional().trim().isLength({ max: 160 }).withMessage('SEO description khong duoc qua 160 ky tu'),
    validate
];
