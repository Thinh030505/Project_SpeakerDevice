import mongoose from 'mongoose';
import slugify from 'slugify';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

// ── SKU helpers ───────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const randomSuffix = (len = 4) =>
    Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const generateProductSKU = () => `PRD-${Date.now()}-${randomSuffix(4)}`;

const generateVariantSKU = (productName, index) => {
    const short = slugify(productName, { lower: true, strict: true, trim: true }).slice(0, 12);
    return `VR-${short}-${index + 1}-${randomSuffix(4)}`.toUpperCase();
};

const normalizeVariantAttributes = (attributes, index) => {
    if (attributes instanceof Map) {
        const mapped = Object.fromEntries(attributes.entries());
        if (Object.keys(mapped).length) {
            return mapped;
        }
    }

    if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
        const filtered = Object.fromEntries(
            Object.entries(attributes)
                .map(([key, value]) => [String(key || '').trim(), String(value || '').trim()])
                .filter(([key, value]) => key && value)
        );

        if (Object.keys(filtered).length) {
            return filtered;
        }
    }

    return {
        PhienBan: index === 0 ? 'Mac dinh' : `Tuy chon ${index + 1}`
    };
};

const normalizeVariantPayload = (variant = {}, productName, index, productImages = []) => {
    const price = Number(variant.price || 0);
    const compareAtPrice = Number(variant.compareAtPrice);
    const images = Array.isArray(variant.images)
        ? variant.images.filter(Boolean)
        : [];

    const normalized = {
        sku: (String(variant.sku || '').trim() || generateVariantSKU(productName, index)).toUpperCase(),
        attributes: normalizeVariantAttributes(variant.attributes, index),
        price,
        stock: Number.isInteger(Number(variant.stock)) ? Number(variant.stock) : 0,
        images: images.length ? images : productImages,
        isActive: variant.isActive !== undefined ? variant.isActive : true
    };

    if (Number.isFinite(compareAtPrice) && compareAtPrice > price) {
        normalized.compareAtPrice = compareAtPrice;
    }
    if (variant.weight !== undefined && variant.weight !== null && String(variant.weight).trim() !== '') {
        normalized.weight = Number(variant.weight);
    }
    if (String(variant.barcode || '').trim()) {
        normalized.barcode = String(variant.barcode).trim();
    }

    return normalized;
};

// ── Slug helper ───────────────────────────────────────────────────────────────

const generateUniqueSlug = async (name, excludeId = null) => {
    const base = slugify(name, { lower: true, strict: true, trim: true });
    let slug = base;
    let counter = 1;

    while (true) {
        const query = { slug };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await Product.exists(query);
        if (!exists) break;
        slug = `${base}-${counter++}`;
    }

    return slug;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveCategoryDocument = async (categoryInput) => {
    const normalized = String(categoryInput || '').trim();
    if (!normalized) {
        return null;
    }

    if (mongoose.Types.ObjectId.isValid(normalized)) {
        const categoryById = await Category.findById(normalized);
        if (categoryById) {
            return categoryById;
        }
    }

    const slug = slugify(normalized, { lower: true, strict: true, trim: true });
    const categoryBySlug = await Category.findOne({ slug });
    if (categoryBySlug) {
        return categoryBySlug;
    }

    return Category.findOne({
        name: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' }
    });
};

const resolveCategoryForWrite = async (categoryInput) => {
    const resolvedCategory = await resolveCategoryDocument(categoryInput);
    if (resolvedCategory) {
        return resolvedCategory;
    }

    return Category.findOne({ status: 'active' }).sort({ order: 1, name: 1 });
};

// ── GET ALL PRODUCTS ──────────────────────────────────────────────────────────
// GET /api/products?page=1&limit=20&sort=-createdAt&...

export const getAllProducts = async (req, res, next) => {
    try {
        const {
            page = 1, limit = 20, sort = '-createdAt',
            category, brand, minPrice, maxPrice,
            search, featured, status = 'active',
            tags, inStock
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const query = { status, deleted: { $ne: true } };

        if (category) query.category = new mongoose.Types.ObjectId(category);
        if (brand) query.brand = brand;
        if (featured !== undefined) query.featured = featured === 'true';
        if (tags) query.tags = { $in: tags.split(',').map(t => t.trim().toLowerCase()) };
        if (search) query.$text = { $search: search };

        if (minPrice || maxPrice) {
            const pf = {};
            if (minPrice) pf.$gte = Number(minPrice);
            if (maxPrice) pf.$lte = Number(maxPrice);
            query['variants.price'] = pf;
        }

        if (inStock === 'true') {
            query['variants.stock'] = { $gt: 0 };
            query['variants.isActive'] = true;
        }

        const sortMap = {
            price_asc: { 'variants.price': 1 },
            price_desc: { 'variants.price': -1 },
            rating: { 'rating.average': -1 },
            '-rating': { 'rating.average': 1 },
            name: { name: 1 },
            '-name': { name: -1 },
        };

        const sortOption = search
            ? { score: { $meta: 'textScore' } }
            : (sortMap[sort] || sort);

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category', 'name slug')
                .sort(sortOption)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean(),
            Product.countDocuments(query)
        ]);

        const pages = Math.ceil(total / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách sản phẩm thành công',
            data: {
                products,
                pagination: {
                    page: pageNum, limit: limitNum,
                    total, pages,
                    hasNext: pageNum < pages,
                    hasPrev: pageNum > 1
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── GET PRODUCT DETAIL BY ID ──────────────────────────────────────────────────
// GET /api/products/:id

export const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, deleted: { $ne: true } })
            .populate('category', 'name slug')
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .lean();

        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        // Tăng viewCount (không await để không block response)
        Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

        // Related products: cùng category, cùng brand (nếu có), loại trừ chính nó
        const relatedFilter = {
            _id: { $ne: id },
            deleted: { $ne: true },
            status: 'active',
            category: product.category._id
        };
        if (product.brand) relatedFilter.brand = product.brand;

        const relatedProducts = await Product.find(relatedFilter)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết sản phẩm thành công',
            data: { product, relatedProducts }
        });
    } catch (error) {
        next(error);
    }
};

// ── GET PRODUCT BY SLUG ───────────────────────────────────────────────────────
// GET /api/products/slug/:slug

export const getProductBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const product = await Product.findOne({ slug, status: 'active', deleted: { $ne: true } })
            .populate('category', 'name slug')
            .populate('createdBy', 'username email')
            .lean();

        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        // Tăng viewCount
        Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).exec();

        // Related products
        const relatedFilter = {
            _id: { $ne: product._id },
            deleted: { $ne: true },
            status: 'active',
            category: product.category._id
        };
        if (product.brand) relatedFilter.brand = product.brand;

        const relatedProducts = await Product.find(relatedFilter)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết sản phẩm thành công',
            data: { product, relatedProducts }
        });
    } catch (error) {
        next(error);
    }
};

// ── CREATE PRODUCT ────────────────────────────────────────────────────────────
// POST /api/products

export const createProduct = async (req, res, next) => {
    try {
        const {
            name, description = '', shortDescription,
            brand, category, variants = [],
            images = [], tags = [],
            featured = false, status = 'active', seo
        } = req.body;

        // Validate category tồn tại
        const categoryExists = await resolveCategoryForWrite(category);
        if (!categoryExists) {
            return res.status(400).json({ success: false, message: 'Category không tồn tại' });
        }

        // Tạo slug unique
        const slug = await generateUniqueSlug(name);

        // SKU tự động cho product
        const sku = generateProductSKU();

        // Chuẩn hóa variants — SKU tự động nếu không truyền
        const normalizedImages = Array.isArray(images) ? images.filter(Boolean) : [];
        const normalizedVariants = variants.map((variant, idx) =>
            normalizeVariantPayload(variant, name, idx, normalizedImages)
        );

        // Kiểm tra duplicate SKU trong request
        const skus = normalizedVariants.map(v => v.sku);
        const dupes = skus.filter((s, i) => skus.indexOf(s) !== i);
        if (dupes.length > 0) {
            return res.status(400).json({
                success: false,
                message: `SKU bị trùng trong request: ${[...new Set(dupes)].join(', ')}`
            });
        }

        // Kiểm tra SKU đã tồn tại trong DB
        const existingBySku = await Product.findOne({ 'variants.sku': { $in: skus } });
        if (existingBySku) {
            const taken = existingBySku.variants.filter(v => skus.includes(v.sku)).map(v => v.sku);
            return res.status(400).json({
                success: false,
                message: `SKU đã tồn tại trong hệ thống: ${taken.join(', ')}`
            });
        }

        const product = await Product.create({
            name: name.trim(),
            description,
            shortDescription,
            slug,
            sku,
            brand: brand || undefined,
            category: categoryExists._id,
            variants: normalizedVariants,
            images: normalizedImages,
            tags,
            featured,
            status,
            seo,
            viewCount: 0,
            deleted: false,
            createdBy: req.user._id
        });

        await product.populate('category', 'name slug');

        return res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công',
            data: { product }
        });
    } catch (error) {
        next(error);
    }
};

// ── UPDATE PRODUCT ────────────────────────────────────────────────────────────
// PUT /api/products/:id

export const uploadProductImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui long chon file hinh anh'
            });
        }

        const uploadResult = await uploadToCloudinary(req.file, 'product-images');
        if (!uploadResult.success) {
            return res.status(500).json({
                success: false,
                message: `Loi upload hinh anh: ${uploadResult.error}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Upload hinh anh san pham thanh cong',
            data: {
                url: uploadResult.url,
                publicId: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height,
                copyLink: uploadResult.url
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name, description, shortDescription,
            brand, category, variants,
            images, tags, featured, status, seo
        } = req.body;

        const product = await Product.findOne({ _id: id, deleted: { $ne: true } });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        // Validate category
        if (category) {
            const exists = await resolveCategoryForWrite(category);
            req.resolvedCategoryId = exists?._id;
            if (!exists) {
                return res.status(400).json({ success: false, message: 'Category không tồn tại' });
            }
        }

        // Validate SKU nếu có cập nhật variants
        if (variants && variants.length > 0) {
            const skus = variants.map(v => (v.sku?.trim() || '').toUpperCase()).filter(Boolean);
            const dupes = skus.filter((s, i) => skus.indexOf(s) !== i);
            if (dupes.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `SKU bị trùng trong request: ${[...new Set(dupes)].join(', ')}`
                });
            }

            if (skus.length > 0) {
                const conflict = await Product.findOne({ _id: { $ne: id }, 'variants.sku': { $in: skus } });
                if (conflict) {
                    const taken = conflict.variants.filter(v => skus.includes(v.sku)).map(v => v.sku);
                    return res.status(400).json({
                        success: false,
                        message: `SKU đã tồn tại ở sản phẩm khác: ${taken.join(', ')}`
                    });
                }
            }
        }

        // Cập nhật slug nếu đổi tên
        if (name !== undefined) {
            product.name = name.trim();
            product.slug = await generateUniqueSlug(name, id);
        }

        if (description !== undefined) product.description = description;
        if (shortDescription !== undefined) product.shortDescription = shortDescription;
        if (brand !== undefined) product.brand = brand;
        if (category !== undefined) product.category = req.resolvedCategoryId || product.category;
        if (images !== undefined) product.images = images;
        if (tags !== undefined) product.tags = tags;
        if (featured !== undefined) product.featured = featured;
        if (status !== undefined) product.status = status;
        if (seo !== undefined) product.seo = { ...product.seo?.toObject?.() || product.seo, ...seo };

        if (variants !== undefined) {
            const productImagePool = images !== undefined
                ? (Array.isArray(images) ? images.filter(Boolean) : [])
                : (Array.isArray(product.images) ? product.images : []);
            product.variants = variants.map((variant, idx) =>
                normalizeVariantPayload(variant, product.name, idx, productImagePool)
            );
        }

        product.updatedBy = req.user._id;
        await product.save();
        await product.populate('category', 'name slug');

        return res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: { product }
        });
    } catch (error) {
        next(error);
    }
};

// ── DELETE PRODUCT (soft delete) ──────────────────────────────────────────────
// DELETE /api/products/:id

export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, deleted: { $ne: true } });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        product.deleted = true;
        product.deletedAt = new Date();
        product.status = 'archived';
        product.updatedBy = req.user._id;
        await product.save();

        return res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        next(error);
    }
};

// ── GET FEATURED PRODUCTS ─────────────────────────────────────────────────────
// GET /api/products/featured?limit=10

export const getFeaturedProducts = async (req, res, next) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const products = await Product.find({ status: 'active', featured: true, deleted: { $ne: true } })
            .populate('category', 'name slug')
            .sort({ 'rating.average': -1, createdAt: -1 })
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy sản phẩm nổi bật thành công',
            data: { products, total: products.length }
        });
    } catch (error) {
        next(error);
    }
};

// ── SEARCH PRODUCTS ───────────────────────────────────────────────────────────
// GET /api/products/search?q=keyword&page=1&limit=20

export const searchProducts = async (req, res, next) => {
    try {
        const { q, page = 1, limit = 20, category } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const query = {
            $text: { $search: q },
            status: 'active',
            deleted: { $ne: true }
        };

        if (category) query.category = new mongoose.Types.ObjectId(category);

        const [products, total] = await Promise.all([
            Product.find(query, { score: { $meta: 'textScore' } })
                .populate('category', 'name slug')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean(),
            Product.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Tìm kiếm thành công',
            data: {
                products,
                keyword: q,
                pagination: {
                    page: pageNum, limit: limitNum,
                    total, pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
