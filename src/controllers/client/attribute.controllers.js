import slugify from 'slugify';
import ProductAttribute from '../../models/ProductAttribute.js';
import Category from '../../models/Category.js';

const stripArtifacts = (value) => {
    if (Array.isArray(value)) {
        return value.map(stripArtifacts);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const plain = { ...value };
    delete plain.level;
    delete plain.path;
    delete plain.pathSlugs;
    delete plain.descendantsCount;

    for (const key of Object.keys(plain)) {
        plain[key] = stripArtifacts(plain[key]);
    }

    return plain;
};

const normalizeJson = (value) => JSON.parse(JSON.stringify(value));
const docToCleanJson = (doc) => normalizeJson(doc.toJSON({ virtuals: false, flattenObjectIds: true }));

const buildUniqueSlug = async (name, excludeId = null) => {
    const base = slugify(name, { lower: true, strict: true, trim: true });
    let slug = base;
    let counter = 1;

    while (true) {
        const query = { slug };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await ProductAttribute.exists(query);
        if (!exists) return slug;
        slug = `${base}-${counter++}`;
    }
};

const validateCategories = async (categoryIds = []) => {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) return true;
    const count = await Category.countDocuments({ _id: { $in: categoryIds } });
    return count === categoryIds.length;
};

export const getAllAttributes = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status = 'active',
            type,
            category,
            filterable,
            searchable,
            sort = 'order'
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (category) query.categories = category;
        if (filterable !== undefined) query.filterable = filterable === 'true';
        if (searchable !== undefined) query.searchable = searchable === 'true';
        if (search) query.$text = { $search: search };

        const sortMap = {
            order: { order: 1, name: 1 },
            '-order': { order: -1, name: 1 },
            name: { name: 1 },
            '-name': { name: -1 },
            createdAt: { createdAt: 1 },
            '-createdAt': { createdAt: -1 }
        };

        const [attributes, total] = await Promise.all([
            ProductAttribute.find(query)
                .populate('categories', 'name slug')
                .sort(sortMap[sort] || sortMap.order)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean(),
            ProductAttribute.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách thuộc tính thành công',
            data: {
                attributes,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getFilterableAttributes = async (req, res, next) => {
    try {
        const query = { status: 'active', filterable: true };
        if (req.query.category) query.categories = req.query.category;

        const attributes = await ProductAttribute.find(query)
            .populate('categories', 'name slug')
            .sort({ order: 1, name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy thuộc tính filter thành công',
            data: {
                attributes,
                total: attributes.length
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAttributeById = async (req, res, next) => {
    try {
        const attribute = await ProductAttribute.findById(req.params.id)
            .populate('categories', 'name slug')
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email');

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết thuộc tính thành công',
            data: normalizeJson({ attribute })
        });
    } catch (error) {
        next(error);
    }
};

export const getAttributeBySlug = async (req, res, next) => {
    try {
        const attribute = await ProductAttribute.findOne({ slug: req.params.slug })
            .populate('categories', 'name slug')
            .populate('createdBy', 'username email');

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết thuộc tính thành công',
            data: normalizeJson({ attribute })
        });
    } catch (error) {
        next(error);
    }
};

export const createAttribute = async (req, res, next) => {
    try {
        const isValidCategories = await validateCategories(req.body.categories);
        if (!isValidCategories) {
            return res.status(400).json({
                success: false,
                message: 'Có category không tồn tại'
            });
        }

        const slug = await buildUniqueSlug(req.body.name);
        const attribute = await ProductAttribute.create({
            ...req.body,
            name: req.body.name.trim(),
            slug,
            createdBy: req.user._id
        });

        await attribute.populate('categories', 'name slug');

        return res.status(201).json({
            success: true,
            message: 'Tạo thuộc tính thành công',
            data: { attribute: stripArtifacts(docToCleanJson(attribute)) }
        });
    } catch (error) {
        next(error);
    }
};

export const updateAttribute = async (req, res, next) => {
    try {
        const attribute = await ProductAttribute.findById(req.params.id);

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        if (req.body.categories !== undefined) {
            const isValidCategories = await validateCategories(req.body.categories);
            if (!isValidCategories) {
                return res.status(400).json({
                    success: false,
                    message: 'Có category không tồn tại'
                });
            }
        }

        if (req.body.name !== undefined) {
            attribute.name = req.body.name.trim();
            attribute.slug = await buildUniqueSlug(req.body.name, req.params.id);
        }

        const fields = [
            'type',
            'description',
            'options',
            'defaultValue',
            'categories',
            'required',
            'filterable',
            'searchable',
            'unit',
            'minValue',
            'maxValue',
            'order',
            'status'
        ];

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                attribute[field] = req.body[field];
            }
        }

        attribute.updatedBy = req.user._id;
        await attribute.save();
        await attribute.populate('categories', 'name slug');

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thuộc tính thành công',
            data: { attribute: stripArtifacts(docToCleanJson(attribute)) }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAttribute = async (req, res, next) => {
    try {
        const attribute = await ProductAttribute.findById(req.params.id);

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        await attribute.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Xóa thuộc tính thành công'
        });
    } catch (error) {
        next(error);
    }
};
