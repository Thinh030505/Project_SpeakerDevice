import slugify from 'slugify';
import Brand from '../../models/Brand.js';
import Product from '../../models/Product.js';

const stripBrandVirtualArtifacts = (value) => {
    if (Array.isArray(value)) {
        return value.map(stripBrandVirtualArtifacts);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const plain = { ...value };
    delete plain.activeProductsCount;

    for (const key of Object.keys(plain)) {
        plain[key] = stripBrandVirtualArtifacts(plain[key]);
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
        const exists = await Brand.exists(query);
        if (!exists) return slug;
        slug = `${base}-${counter++}`;
    }
};

const countProductsByBrandName = (brandName) =>
    Product.countDocuments({
        brand: brandName,
        status: 'active',
        deleted: { $ne: true }
    });

export const getAllBrands = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status = 'active',
            featured,
            country,
            sort = 'order'
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const query = {};

        if (status) query.status = status;
        if (featured !== undefined) query.featured = featured === 'true';
        if (country) query.country = country;
        if (search) query.$text = { $search: search };

        const sortMap = {
            order: { order: 1, name: 1 },
            '-order': { order: -1, name: 1 },
            name: { name: 1 },
            '-name': { name: -1 },
            createdAt: { createdAt: 1 },
            '-createdAt': { createdAt: -1 },
            productCount: { productCount: -1, name: 1 }
        };

        const [brands, total] = await Promise.all([
            Brand.find(query)
                .sort(sortMap[sort] || sortMap.order)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean(),
            Brand.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách thương hiệu thành công',
            data: {
                brands,
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

export const getFeaturedBrands = async (req, res, next) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const brands = await Brand.find({ status: 'active', featured: true })
            .sort({ order: 1, name: 1 })
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy thương hiệu nổi bật thành công',
            data: {
                brands,
                total: brands.length
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getBrandById = async (req, res, next) => {
    try {
        const brand = await Brand.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        const [products, productCount] = await Promise.all([
            Product.find({
                brand: brand.name,
                status: 'active',
                deleted: { $ne: true }
            })
                .select('name slug images category featured status')
                .limit(8)
                .lean(),
            countProductsByBrandName(brand.name)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết thương hiệu thành công',
            data: normalizeJson({
                brand: {
                    ...brand,
                    productCount
                },
                products
            })
        });
    } catch (error) {
        next(error);
    }
};

export const getBrandBySlug = async (req, res, next) => {
    try {
        const brand = await Brand.findOne({ slug: req.params.slug })
            .populate('createdBy', 'username email')
            .lean();

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        const products = await Product.find({
            brand: brand.name,
            status: 'active',
            deleted: { $ne: true }
        })
            .select('name slug images category featured status')
            .limit(8)
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết thương hiệu thành công',
            data: normalizeJson({
                brand,
                products
            })
        });
    } catch (error) {
        next(error);
    }
};

export const createBrand = async (req, res, next) => {
    try {
        const slug = await buildUniqueSlug(req.body.name);
        const brand = await Brand.create({
            ...req.body,
            name: req.body.name.trim(),
            slug,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: 'Tạo thương hiệu thành công',
            data: { brand: stripBrandVirtualArtifacts(docToCleanJson(brand)) }
        });
    } catch (error) {
        next(error);
    }
};

export const updateBrand = async (req, res, next) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        const oldName = brand.name;

        if (req.body.name !== undefined) {
            brand.name = req.body.name.trim();
            brand.slug = await buildUniqueSlug(req.body.name, req.params.id);
        }

        const fields = [
            'description',
            'shortDescription',
            'logo',
            'banner',
            'website',
            'country',
            'foundedYear',
            'contactEmail',
            'status',
            'featured',
            'order'
        ];

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                brand[field] = req.body[field];
            }
        }

        if (req.body.socialMedia !== undefined) {
            brand.socialMedia = {
                ...(brand.socialMedia?.toObject?.() || brand.socialMedia || {}),
                ...req.body.socialMedia
            };
        }

        if (req.body.seo !== undefined) {
            brand.seo = {
                ...(brand.seo?.toObject?.() || brand.seo || {}),
                ...req.body.seo
            };
        }

        brand.updatedBy = req.user._id;
        await brand.save();

        if (oldName !== brand.name) {
            await Product.updateMany(
                { brand: oldName },
                { $set: { brand: brand.name } }
            );

            const productCount = await countProductsByBrandName(brand.name);
            await Brand.updateOne(
                { _id: brand._id },
                { $set: { productCount } }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thương hiệu thành công',
            data: { brand: stripBrandVirtualArtifacts(docToCleanJson(brand)) }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBrand = async (req, res, next) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        const productCount = await Product.countDocuments({
            brand: brand.name,
            deleted: { $ne: true }
        });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa thương hiệu đang được sản phẩm sử dụng'
            });
        }

        await brand.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Xóa thương hiệu thành công'
        });
    } catch (error) {
        next(error);
    }
};
