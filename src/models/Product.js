import mongoose from 'mongoose';

// ============================================
// PRODUCT VARIANT SUB-SCHEMA
// ============================================

const productVariantSchema = new mongoose.Schema({
    /**
     * SKU (Stock Keeping Unit)
     * Mã sản phẩm duy nhất cho từng variant
     * Ví dụ: "TSHIRT-S-RED-001"
     */
    sku: {
        type: String,
        required: [true, 'SKU là bắt buộc'],
        trim: true
    },

    /**
     * ATTRIBUTES
     * Các thuộc tính phân biệt variant
     * Ví dụ: { size: "S", color: "Red" }
     */
    attributes: {
        type: Map,
        of: String,
        required: [true, 'Attributes là bắt buộc']
    },

    /**
     * PRICE
     * Giá của variant này
     * Có thể khác nhau giữa các variant
     */
    price: {
        type: Number,
        required: [true, 'Giá là bắt buộc'],
        min: [0, 'Giá phải lớn hơn hoặc bằng 0']
    },

    /**
     * COMPARE AT PRICE
     * Giá so sánh (giá gốc trước khi giảm)
     * Dùng để hiển thị "Giảm X%"
     */
    compareAtPrice: {
        type: Number,
        min: [0, 'Compare at price phải lớn hơn hoặc bằng 0'],
        validate: {
            validator: function (value) {
                // Compare at price phải lớn hơn price
                return !value || value > this.price;
            },
            message: 'Compare at price phải lớn hơn price'
        }
    },

    /**
     * STOCK
     * Số lượng tồn kho của variant này
     */
    stock: {
        type: Number,
        required: [true, 'Stock là bắt buộc'],
        default: 0,
        min: [0, 'Stock phải lớn hơn hoặc bằng 0']
    },

    /**
     * IMAGES
     * Ảnh riêng cho variant này
     * Nếu không có, dùng ảnh chung của product
     */
    images: [{
        type: String,
        trim: true
    }],

    /**
     * WEIGHT
     * Trọng lượng của variant (gram)
     * Dùng để tính phí ship
     */
    weight: {
        type: Number,
        min: [0, 'Weight phải lớn hơn hoặc bằng 0']
    },

    /**
     * BARCODE
     * Mã vạch của variant
     */
    barcode: {
        type: String,
        trim: true
    },

    /**
     * IS ACTIVE
     * Variant có đang được bán không
     */
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    _id: true
});

/**
 * VIRTUAL: DISCOUNT PERCENTAGE
 * Tính phần trăm giảm giá
 */
productVariantSchema.virtual('discountPercentage').get(function () {
    if (this.compareAtPrice && this.compareAtPrice > this.price) {
        return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
    }
    return 0;
});

/**
 * VIRTUAL: IS IN STOCK
 * Kiểm tra variant còn hàng không
 */
productVariantSchema.virtual('isInStock').get(function () {
    return this.stock > 0 && this.isActive;
});

/**
 * METHOD: DECREASE STOCK
 * Giảm số lượng tồn kho
 */
productVariantSchema.methods.decreaseStock = function (quantity) {
    if (this.stock < quantity) {
        throw new Error('Không đủ hàng trong kho');
    }
    this.stock -= quantity;
    return this.save();
};

/**
 * METHOD: INCREASE STOCK
 * Tăng số lượng tồn kho
 */
productVariantSchema.methods.increaseStock = function (quantity) {
    this.stock += quantity;
    return this.save();
};

// ============================================
// PRODUCT SCHEMA
// ============================================

const productSchema = new mongoose.Schema({
    /**
     * NAME
     * Tên sản phẩm
     */
    name: {
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc'],
        trim: true,
        index: true
    },

    /**
     * SLUG
     * URL-friendly name
     * Ví dụ: "ao-thun-nam-cao-cap" từ "Áo thun nam cao cấp"
     */
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },

    /**
     * DESCRIPTION
     * Mô tả sản phẩm
     */
    description: {
        type: String,
        required: [true, 'Mô tả là bắt buộc'],
        trim: true
    },

    /**
     * SHORT DESCRIPTION
     * Mô tả ngắn (cho preview)
     */
    shortDescription: {
        type: String,
        trim: true,
        maxLength: [200, 'Short description không được quá 200 ký tự']
    },

    /**
     * BRAND
     * Thương hiệu
     */
    brand: {
        type: String,
        trim: true,
        index: true
    },

    /**
     * CATEGORY
     * Danh mục sản phẩm
     * Reference đến Category model
     */
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category là bắt buộc'],
        index: true
    },

    /**
     * VARIANTS
     * Mảng các biến thể của sản phẩm
     */
    variants: [productVariantSchema],

    /**
     * IMAGES
     * Ảnh chung của sản phẩm
     * Variants có thể dùng ảnh này nếu không có ảnh riêng
     */
    images: [{
        type: String,
        trim: true
    }],

    /**
     * TAGS
     * Tags để search và filter
     */
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    /**
     * STATUS
     * Trạng thái sản phẩm
     */
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft',
        index: true
    },

    /**
     * FEATURED
     * Sản phẩm nổi bật
     */
    featured: {
        type: Boolean,
        default: false,
        index: true
    },

    /**
     * RATING
     * Điểm đánh giá trung bình
     */
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    /**
     * SEO
     * Thông tin SEO
     */
    seo: {
        title: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        keywords: [{
            type: String,
            trim: true
        }]
    },

    /**
     * CREATED BY
     * User tạo sản phẩm
     */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    /**
     * UPDATED BY
     * User cập nhật sản phẩm lần cuối
     */
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    /**
     * VIEW COUNT
     * Số lượt xem sản phẩm
     */
    viewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    /**
     * DELETED
     * Soft delete flag
     */
    deleted: {
        type: Boolean,
        default: false,
        index: true
    },

    /**
     * DELETED AT
     */
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================

// Index cho text search
productSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
    brand: 'text'
});

// Index cho filter
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ 'rating.average': -1 }); // Sort by rating

// Compound index cho common queries
productSchema.index({ status: 1, featured: 1, 'rating.average': -1 });

// Index cho variants
productSchema.index({ 'variants.isActive': 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * VIRTUAL: MIN PRICE
 * Giá thấp nhất trong tất cả variants
 */
productSchema.virtual('minPrice').get(function () {
    if (!this.variants || this.variants.length === 0) {
        return 0;
    }
    const prices = this.variants
        .filter(v => v.isActive)
        .map(v => v.price);
    return prices.length > 0 ? Math.min(...prices) : 0;
});

/**
 * VIRTUAL: MAX PRICE
 * Giá cao nhất trong tất cả variants
 */
productSchema.virtual('maxPrice').get(function () {
    if (!this.variants || this.variants.length === 0) {
        return 0;
    }
    const prices = this.variants
        .filter(v => v.isActive)
        .map(v => v.price);
    return prices.length > 0 ? Math.max(...prices) : 0;
});

/**
 * VIRTUAL: TOTAL STOCK
 * Tổng số lượng tồn kho của tất cả variants
 */
productSchema.virtual('totalStock').get(function () {
    if (!this.variants || this.variants.length === 0) {
        return 0;
    }
    return this.variants
        .filter(v => v.isActive)
        .reduce((sum, v) => sum + v.stock, 0);
});

/**
 * VIRTUAL: IS IN STOCK
 * Sản phẩm còn hàng không (ít nhất 1 variant còn hàng)
 */
productSchema.virtual('isInStock').get(function () {
    if (!this.variants || this.variants.length === 0) {
        return false;
    }
    return this.variants.some(v => v.isActive && v.stock > 0);
});

/**
 * VIRTUAL: ACTIVE VARIANTS COUNT
 * Số lượng variants đang active
 */
productSchema.virtual('activeVariantsCount').get(function () {
    if (!this.variants) {
        return 0;
    }
    return this.variants.filter(v => v.isActive).length;
});

/**
 * VIRTUAL: AVAILABLE ATTRIBUTES
 * Tất cả các attributes có sẵn (size, color...)
 */
productSchema.virtual('availableAttributes').get(function () {
    if (!this.variants || this.variants.length === 0) {
        return {};
    }

    const attributes = {};

    this.variants
        .filter(v => v.isActive)
        .forEach(variant => {
            if (variant.attributes) {
                variant.attributes.forEach((value, key) => {
                    if (!attributes[key]) {
                        attributes[key] = new Set();
                    }
                    attributes[key].add(value);
                });
            }
        });

    // Convert Set to Array
    const result = {};
    Object.keys(attributes).forEach(key => {
        result[key] = Array.from(attributes[key]);
    });

    return result;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * PRE-SAVE: GENERATE SLUG
 * Tự động tạo slug từ name nếu chưa có
 */
productSchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        // Convert name to slug
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
    }
    next();
});

/**
 * PRE-SAVE: VALIDATE VARIANTS
 * Kiểm tra variants trước khi lưu
 */
productSchema.pre('save', function (next) {
    // Phải có ít nhất 1 variant
    if (!this.variants || this.variants.length === 0) {
        return next(new Error('Sản phẩm phải có ít nhất 1 variant'));
    }

    // Kiểm tra SKU không trùng
    const skus = this.variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
        return next(new Error('SKU không được trùng lặp'));
    }

    // Kiểm tra attributes không trùng
    const attributeCombinations = this.variants.map(v => {
        if (!v.attributes) return null;
        return Array.from(v.attributes.entries()).sort().join(',');
    });
    const uniqueCombinations = new Set(attributeCombinations);
    if (attributeCombinations.length !== uniqueCombinations.size) {
        return next(new Error('Attributes không được trùng lặp'));
    }

    next();
});

/**
 * PRE-SAVE: UPDATE RATING
 * Cập nhật rating trung bình (nếu có reviews)
 */
productSchema.pre('save', async function (next) {
    // Nếu có reviews, tính lại rating
    // (Giả sử có Review model)
    // const Review = mongoose.model('Review');
    // const reviews = await Review.find({ product: this._id });
    // if (reviews.length > 0) {
    //     const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    //     this.rating.average = totalRating / reviews.length;
    //     this.rating.count = reviews.length;
    // }
    next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * STATIC: FIND BY SLUG
 * Tìm sản phẩm theo slug
 */
productSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'active' })
        .populate('category', 'name slug')
        .populate('createdBy', 'username email');
};

/**
 * STATIC: FIND BY CATEGORY
 * Tìm sản phẩm theo category
 */
productSchema.statics.findByCategory = function (categoryId, options = {}) {
    const query = {
        category: categoryId,
        status: 'active'
    };

    if (options.featured !== undefined) {
        query.featured = options.featured;
    }

    return this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0)
        .populate('category', 'name slug');
};

/**
 * STATIC: SEARCH PRODUCTS
 * Tìm kiếm sản phẩm bằng text search
 */
productSchema.statics.search = function (keyword, options = {}) {
    const query = {
        $text: { $search: keyword },
        status: 'active'
    };

    if (options.category) {
        query.category = options.category;
    }

    if (options.brand) {
        query.brand = options.brand;
    }

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20)
        .skip(options.skip || 0)
        .populate('category', 'name slug');
};

/**
 * STATIC: FIND VARIANT BY SKU
 * Tìm variant theo SKU
 */
productSchema.statics.findVariantBySku = async function (sku) {
    const product = await this.findOne({ 'variants.sku': sku });
    if (!product) {
        return null;
    }

    const variant = product.variants.find(v => v.sku === sku);
    return {
        product,
        variant
    };
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * METHOD: ADD VARIANT
 * Thêm variant mới vào sản phẩm
 */
productSchema.methods.addVariant = function (variantData) {
    // Validate variant data
    if (!variantData.sku) {
        throw new Error('SKU là bắt buộc');
    }

    // Kiểm tra SKU đã tồn tại chưa
    const existingVariant = this.variants.find(v => v.sku === variantData.sku);
    if (existingVariant) {
        throw new Error('SKU đã tồn tại');
    }

    // Thêm variant
    this.variants.push(variantData);
    return this.save();
};

/**
 * METHOD: UPDATE VARIANT
 * Cập nhật variant
 */
productSchema.methods.updateVariant = function (variantId, updateData) {
    const variant = this.variants.id(variantId);
    if (!variant) {
        throw new Error('Variant không tồn tại');
    }

    Object.assign(variant, updateData);
    return this.save();
};

/**
 * METHOD: DELETE VARIANT
 * Xóa variant
 */
productSchema.methods.deleteVariant = function (variantId) {
    // Phải có ít nhất 1 variant
    if (this.variants.length <= 1) {
        throw new Error('Sản phẩm phải có ít nhất 1 variant');
    }

    this.variants.id(variantId).remove();
    return this.save();
};

/**
 * METHOD: GET VARIANT BY ATTRIBUTES
 * Tìm variant theo attributes
 */
productSchema.methods.getVariantByAttributes = function (attributes) {
    return this.variants.find(variant => {
        if (!variant.attributes) return false;

        // Kiểm tra tất cả attributes khớp
        for (const [key, value] of Object.entries(attributes)) {
            if (variant.attributes.get(key) !== value) {
                return false;
            }
        }

        return true;
    });
};

// ============================================
// CREATE MODEL
// ============================================

const Product = mongoose.model('Product', productSchema);









// ============================================
// CREATE MODEL
// ============================================

export default Product;