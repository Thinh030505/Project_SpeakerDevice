// ============================================
// PRODUCT ATTRIBUTE MODEL
// Model cho thuộc tính sản phẩm động
// ============================================

import mongoose from 'mongoose';

/**
 * PRODUCT ATTRIBUTE SCHEMA
 * Schema cho product attribute
 */
const productAttributeSchema = new mongoose.Schema({
    /**
     * NAME
     * Tên attribute (Size, Color, Material...)
     */
    name: {
        type: String,
        required: [true, 'Tên attribute là bắt buộc'],
        trim: true,
        index: true
    },

    /**
     * SLUG
     * URL-friendly name
     * Ví dụ: "size" từ "Size"
     */
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },

    /**
     * TYPE
     * Loại attribute
     */
    type: {
        type: String,
        enum: ['text', 'select', 'multiselect', 'color', 'number', 'boolean', 'date'],
        required: [true, 'Type là bắt buộc'],
        default: 'text'
    },

    /**
     * DESCRIPTION
     * Mô tả attribute
     */
    description: {
        type: String,
        trim: true
    },

    /**
     * OPTIONS
     * Các giá trị có sẵn (cho select, multiselect)
     * Ví dụ: ["S", "M", "L", "XL"] cho Size
     */
    options: [{
        label: {
            type: String,
            required: true,
            trim: true
        },
        value: {
            type: String,
            required: true,
            trim: true
        },
        color: {
            type: String,
            trim: true
        },
        image: {
            type: String,
            trim: true
        }
    }],

    /**
     * DEFAULT VALUE
     * Giá trị mặc định
     */
    defaultValue: {
        type: mongoose.Schema.Types.Mixed
    },

    /**
     * CATEGORIES
     * Các categories sử dụng attribute này
     * Một attribute có thể dùng cho nhiều categories
     */
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        index: true
    }],

    /**
     * REQUIRED
     * Attribute có bắt buộc không
     */
    required: {
        type: Boolean,
        default: false
    },

    /**
     * FILTERABLE
     * Có thể dùng để filter sản phẩm không
     */
    filterable: {
        type: Boolean,
        default: true,
        index: true
    },

    /**
     * SEARCHABLE
     * Có thể search được không
     */
    searchable: {
        type: Boolean,
        default: false,
        index: true
    },

    /**
     * UNIT
     * Đơn vị (cho number type)
     * Ví dụ: "kg", "GB", "cm"
     */
    unit: {
        type: String,
        trim: true
    },

    /**
     * MIN VALUE
     * Giá trị tối thiểu (cho number type)
     */
    minValue: {
        type: Number
    },

    /**
     * MAX VALUE
     * Giá trị tối đa (cho number type)
     */
    maxValue: {
        type: Number
    },

    /**
     * ORDER
     * Thứ tự hiển thị
     */
    order: {
        type: Number,
        default: 0,
        index: true
    },

    /**
     * STATUS
     * Trạng thái attribute
     */
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        index: true
    },

    /**
     * CREATED BY
     * User tạo attribute
     */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    /**
     * UPDATED BY
     * User cập nhật attribute lần cuối
     */
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * INDEXES
 * Tạo indexes để tối ưu queries
 */

// Index cho text search
productAttributeSchema.index({ name: 'text', description: 'text' });

// Index cho filter
productAttributeSchema.index({ status: 1, filterable: 1 });
productAttributeSchema.index({ type: 1, status: 1 });
productAttributeSchema.index({ 'categories': 1, status: 1 });

// Compound index cho common queries
productAttributeSchema.index({ status: 1, filterable: 1, order: 1 });


/**
 * VIRTUAL FIELDS
 * Các field được tính toán từ data có sẵn
 */

/**
 * VIRTUAL: CATEGORIES POPULATED
 * Lấy thông tin đầy đủ của categories
 */
productAttributeSchema.virtual('categoriesInfo', {
    ref: 'Category',
    localField: 'categories',
    foreignField: '_id',
    justOne: false
});

/**
 * VIRTUAL: OPTIONS COUNT
 * Số lượng options (cho select type)
 */
productAttributeSchema.virtual('optionsCount').get(function () {
    return this.options ? this.options.length : 0;
});

/**
 * VIRTUAL: HAS OPTIONS
 * Attribute có options không
 */
productAttributeSchema.virtual('hasOptions').get(function () {
    return this.type === 'select' || this.type === 'multiselect';
});


/**
 * PRE-SAVE MIDDLEWARE
 * Chạy trước khi lưu document
 */

/**
 * PRE-SAVE: GENERATE SLUG
 * Tự động tạo slug từ name nếu chưa có
 */
productAttributeSchema.pre('save', function (next) {
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
 * PRE-SAVE: VALIDATE OPTIONS
 * Validate options theo type
 */
productAttributeSchema.pre('save', function (next) {
    // Nếu là select hoặc multiselect, phải có options
    if ((this.type === 'select' || this.type === 'multiselect') && (!this.options || this.options.length === 0)) {
        return next(new Error('Select và multiselect type phải có ít nhất 1 option'));
    }

    // Nếu không phải select/multiselect, không nên có options
    if (this.type !== 'select' && this.type !== 'multiselect' && this.options && this.options.length > 0) {
        // Có thể clear options hoặc throw error
        // this.options = [];
    }

    // Validate options không trùng value
    if (this.options && this.options.length > 0) {
        const values = this.options.map(opt => opt.value);
        const uniqueValues = new Set(values);
        if (values.length !== uniqueValues.size) {
            return next(new Error('Options không được có value trùng lặp'));
        }
    }

    next();
});

/**
 * PRE-SAVE: VALIDATE NUMBER TYPE
 * Validate min/max value cho number type
 */
productAttributeSchema.pre('save', function (next) {
    if (this.type === 'number') {
        if (this.minValue !== undefined && this.maxValue !== undefined) {
            if (this.minValue > this.maxValue) {
                return next(new Error('Min value phải nhỏ hơn hoặc bằng max value'));
            }
        }
    } else {
        // Clear min/max nếu không phải number type
        if (this.minValue !== undefined || this.maxValue !== undefined) {
            this.minValue = undefined;
            this.maxValue = undefined;
        }
    }

    next();
});


/**
 * STATIC METHODS
 * Methods gọi trên Model (ProductAttribute.method())
 */

/**
 * STATIC: FIND BY SLUG
 * Tìm attribute theo slug
 */
productAttributeSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'active' })
        .populate('categories', 'name slug')
        .populate('createdBy', 'username email');
};

/**
 * STATIC: FIND BY CATEGORY
 * Tìm tất cả attributes của một category
 */
productAttributeSchema.statics.findByCategory = function (categoryId, options = {}) {
    const query = {
        categories: categoryId,
        status: 'active'
    };

    if (options.filterable !== undefined) {
        query.filterable = options.filterable;
    }

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .sort({ order: 1, name: 1 })
        .populate('categories', 'name slug')
        .limit(options.limit || 50);
};

/**
 * STATIC: FIND FILTERABLE
 * Tìm tất cả attributes có thể filter
 */
productAttributeSchema.statics.findFilterable = function (options = {}) {
    const query = {
        filterable: true,
        status: 'active'
    };

    if (options.category) {
        query.categories = options.category;
    }

    return this.find(query)
        .sort({ order: 1, name: 1 })
        .populate('categories', 'name slug')
        .limit(options.limit || 50);
};

/**
 * STATIC: FIND BY TYPE
 * Tìm attributes theo type
 */
productAttributeSchema.statics.findByType = function (type, options = {}) {
    const query = {
        type: type,
        status: 'active'
    };

    if (options.category) {
        query.categories = options.category;
    }

    return this.find(query)
        .sort({ order: 1, name: 1 })
        .populate('categories', 'name slug')
        .limit(options.limit || 50);
};

/**
 * STATIC: SEARCH ATTRIBUTES
 * Tìm kiếm attributes
 */
productAttributeSchema.statics.search = function (keyword, options = {}) {
    const query = {
        $text: { $search: keyword },
        status: 'active'
    };

    if (options.category) {
        query.categories = options.category;
    }

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('categories', 'name slug')
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

/**
 * INSTANCE METHODS
 * Methods gọi trên document (attribute.method())
 */

/**
 * METHOD: VALIDATE VALUE
 * Validate giá trị theo type và rules
 */
productAttributeSchema.methods.validateValue = function (value) {
    // Kiểm tra required
    if (this.required && (value === null || value === undefined || value === '')) {
        throw new Error(`${this.name} là bắt buộc`);
    }

    // Validate theo type
    switch (this.type) {
        case 'text':
            if (typeof value !== 'string') {
                throw new Error(`${this.name} phải là text`);
            }
            break;

        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`${this.name} phải là số`);
            }
            if (this.minValue !== undefined && value < this.minValue) {
                throw new Error(`${this.name} phải lớn hơn hoặc bằng ${this.minValue}`);
            }
            if (this.maxValue !== undefined && value > this.maxValue) {
                throw new Error(`${this.name} phải nhỏ hơn hoặc bằng ${this.maxValue}`);
            }
            break;

        case 'select':
            if (!this.options || this.options.length === 0) {
                throw new Error(`${this.name} không có options`);
            }
            const optionValues = this.options.map(opt => opt.value);
            if (!optionValues.includes(value)) {
                throw new Error(`${this.name} giá trị không hợp lệ`);
            }
            break;

        case 'multiselect':
            if (!Array.isArray(value)) {
                throw new Error(`${this.name} phải là array`);
            }
            if (!this.options || this.options.length === 0) {
                throw new Error(`${this.name} không có options`);
            }
            const validValues = this.options.map(opt => opt.value);
            const invalidValues = value.filter(v => !validValues.includes(v));
            if (invalidValues.length > 0) {
                throw new Error(`${this.name} có giá trị không hợp lệ: ${invalidValues.join(', ')}`);
            }
            break;

        case 'color':
            if (typeof value !== 'string') {
                throw new Error(`${this.name} phải là color code`);
            }
            // Basic color validation (hex, rgb, named colors)
            if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) &&
                !/^rgb\(/.test(value) &&
                !['red', 'blue', 'green', 'black', 'white'].includes(value.toLowerCase())) {
                throw new Error(`${this.name} không phải là color code hợp lệ`);
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                throw new Error(`${this.name} phải là boolean`);
            }
            break;

        case 'date':
            if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                throw new Error(`${this.name} phải là date hợp lệ`);
            }
            break;
    }

    return true;
};

/**
 * METHOD: ADD OPTION
 * Thêm option mới (cho select type)
 */
productAttributeSchema.methods.addOption = function (optionData) {
    if (this.type !== 'select' && this.type !== 'multiselect') {
        throw new Error('Chỉ select và multiselect type mới có options');
    }

    if (!optionData.label || !optionData.value) {
        throw new Error('Option phải có label và value');
    }

    // Kiểm tra value không trùng
    const existingValue = this.options.find(opt => opt.value === optionData.value);
    if (existingValue) {
        throw new Error('Option value đã tồn tại');
    }

    this.options.push(optionData);
    return this.save();
};

/**
 * METHOD: REMOVE OPTION
 * Xóa option
 */
productAttributeSchema.methods.removeOption = function (optionValue) {
    if (this.type !== 'select' && this.type !== 'multiselect') {
        throw new Error('Chỉ select và multiselect type mới có options');
    }

    const optionIndex = this.options.findIndex(opt => opt.value === optionValue);
    if (optionIndex === -1) {
        throw new Error('Option không tồn tại');
    }

    this.options.splice(optionIndex, 1);
    return this.save();
};

/**
 * METHOD: ADD CATEGORY
 * Thêm category vào attribute
 */
productAttributeSchema.methods.addCategory = function (categoryId) {
    if (this.categories.includes(categoryId)) {
        throw new Error('Category đã được thêm vào attribute');
    }

    this.categories.push(categoryId);
    return this.save();
};

/**
 * METHOD: REMOVE CATEGORY
 * Xóa category khỏi attribute
 */
productAttributeSchema.methods.removeCategory = function (categoryId) {
    const categoryIndex = this.categories.indexOf(categoryId);
    if (categoryIndex === -1) {
        throw new Error('Category không có trong attribute');
    }

    this.categories.splice(categoryIndex, 1);
    return this.save();
};

/**
 * METHOD: GET OPTION BY VALUE
 * Lấy option theo value
 */
productAttributeSchema.methods.getOptionByValue = function (value) {
    if (this.type !== 'select' && this.type !== 'multiselect') {
        return null;
    }

    return this.options.find(opt => opt.value === value);
};

/**
 * CREATE MODEL
 * Tạo ProductAttribute model từ schema
 */
const ProductAttribute = mongoose.model('ProductAttribute', productAttributeSchema);

export default ProductAttribute;