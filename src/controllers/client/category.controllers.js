import slugify from 'slugify';
import mongoose from 'mongoose';
import Category from '../../models/Category.js';
import Product from '../../models/Product.js';

const stripCategoryVirtualArtifacts = (value) => {
    if (Array.isArray(value)) {
        return value.map(stripCategoryVirtualArtifacts);
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
        plain[key] = stripCategoryVirtualArtifacts(plain[key]);
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
        const exists = await Category.exists(query);
        if (!exists) return slug;
        slug = `${base}-${counter++}`;
    }
};

const formatCategory = (category) => ({
    ...normalizeJson(stripCategoryVirtualArtifacts(category)),
    hasChildren: Array.isArray(category.children) && category.children.length > 0
});

export const getAllCategories = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status = 'active',
            featured,
            parent,
            sort = 'order'
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const query = {};

        if (status) query.status = status;
        if (featured !== undefined) query.featured = featured === 'true';
        if (parent === 'root') query.parent = null;
        else if (parent) query.parent = new mongoose.Types.ObjectId(parent);
        if (search) query.$text = { $search: search };

        const sortMap = {
            order: { order: 1, name: 1 },
            '-order': { order: -1, name: 1 },
            name: { name: 1 },
            '-name': { name: -1 },
            createdAt: { createdAt: 1 },
            '-createdAt': { createdAt: -1 }
        };

        const [categories, total] = await Promise.all([
            Category.find(query)
                .populate('parent', 'name slug')
                .populate('children', 'name slug status order')
                .sort(sortMap[sort] || sortMap.order)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean(),
            Category.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách danh mục thành công',
            data: {
                categories: categories.map(formatCategory),
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

export const getCategoryTree = async (req, res, next) => {
    try {
        const rootId = req.query.rootId || null;
        const categories = await Category.buildTree(rootId);

        if (rootId && !categories) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục gốc'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy cây danh mục thành công',
            data: { categories }
        });
    } catch (error) {
        next(error);
    }
};

export const getFeaturedCategories = async (req, res, next) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const categories = await Category.find({ status: 'active', featured: true })
            .populate('children', 'name slug image order')
            .sort({ order: 1, name: 1 })
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy danh mục nổi bật thành công',
            data: {
                categories,
                total: categories.length
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parent', 'name slug')
            .populate('children', 'name slug image order status')
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        const [ancestors, directProductCount] = await Promise.all([
            Category.findAllAncestors(req.params.id),
            Product.countDocuments({ category: req.params.id, deleted: { $ne: true } })
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết danh mục thành công',
            data: {
                category: {
                    ...formatCategory(category),
                    ancestors,
                    directProductCount
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryBySlug = async (req, res, next) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug })
            .populate('parent', 'name slug')
            .populate('children', 'name slug image order status')
            .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        const ancestors = await Category.findAllAncestors(category._id);

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết danh mục thành công',
            data: {
                category: {
                    ...formatCategory(category),
                    ancestors
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const slug = await buildUniqueSlug(req.body.name);
        const category = await Category.create({
            ...req.body,
            name: req.body.name.trim(),
            slug,
            parent: req.body.parent || null,
            createdBy: req.user._id
        });

        await category.populate('parent', 'name slug');

        return res.status(201).json({
            success: true,
            message: 'Tạo danh mục thành công',
            data: { category: stripCategoryVirtualArtifacts(docToCleanJson(category)) }
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        if (req.body.name !== undefined) {
            category.name = req.body.name.trim();
            category.slug = await buildUniqueSlug(req.body.name, req.params.id);
        }

        const fields = ['description', 'image', 'icon', 'order', 'status', 'featured'];
        for (const field of fields) {
            if (req.body[field] !== undefined) {
                category[field] = req.body[field];
            }
        }

        if (req.body.parent !== undefined) category.parent = req.body.parent || null;
        if (req.body.seo !== undefined) {
            category.seo = {
                ...(category.seo?.toObject?.() || category.seo || {}),
                ...req.body.seo
            };
        }
        category.updatedBy = req.user._id;

        await category.save();
        await category.populate('parent', 'name slug');

        return res.status(200).json({
            success: true,
            message: 'Cập nhật danh mục thành công',
            data: { category: stripCategoryVirtualArtifacts(docToCleanJson(category)) }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        const [childrenCount, productCount] = await Promise.all([
            Category.countDocuments({ parent: req.params.id }),
            Product.countDocuments({ category: req.params.id, deleted: { $ne: true } })
        ]);

        if (childrenCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục đang có danh mục con'
            });
        }

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục đang có sản phẩm'
            });
        }

        await category.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Xóa danh mục thành công'
        });
    } catch (error) {
        next(error);
    }
};
