// ============================================
// CATEGORY MODEL
// Model cho danh mục sản phẩm với hierarchy
// ============================================

import mongoose from 'mongoose';

/**
 * CATEGORY SCHEMA
 * Schema cho category với parent-child relationship
 */
const categorySchema = new mongoose.Schema({
    /**
     * NAME
     * Tên danh mục
     */
    name: {
        type: String,
        required: [true, 'Tên danh mục là bắt buộc'],
        trim: true,
        index: true
    },

    /**
     * SLUG
     * URL-friendly name
     * Ví dụ: "thoi-trang-nam" từ "Thời trang nam"
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
     * Mô tả danh mục
     */
    description: {
        type: String,
        trim: true
    },

    /**
     * PARENT
     * Category cha (self-referencing)
     * null nếu là root category
     */
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true
    },

    /**
     * IMAGE
     * Ảnh đại diện cho category
     */
    image: {
        type: String,
        trim: true
    },

    /**
     * ICON
     * Icon cho category (cho menu)
     */
    icon: {
        type: String,
        trim: true
    },

    /**
     * ORDER
     * Thứ tự hiển thị (số càng nhỏ hiển thị trước)
     */
    order: {
        type: Number,
        default: 0,
        index: true
    },

    /**
     * STATUS
     * Trạng thái category
     */
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        index: true
    },

    /**
     * FEATURED
     * Category nổi bật
     */
    featured: {
        type: Boolean,
        default: false,
        index: true
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
     * PRODUCT COUNT
     * Số lượng sản phẩm trong category (tính cả children)
     * Được cập nhật tự động
     */
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },

    /**
     * CREATED BY
     * User tạo category
     */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    /**
     * UPDATED BY
     * User cập nhật category lần cuối
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
categorySchema.index({ name: 'text', description: 'text' });

// Index cho hierarchy queries
categorySchema.index({ parent: 1, status: 1 });
categorySchema.index({ parent: 1, order: 1 });

// Compound index cho common queries
categorySchema.index({ status: 1, featured: 1, order: 1 });
categorySchema.index({ parent: 1, status: 1, order: 1 });



/**
 * VIRTUAL FIELDS
 * Các field được tính toán từ data có sẵn
 */

/**
 * VIRTUAL: CHILDREN
 * Lấy tất cả categories con
 */
categorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent',
    justOne: false
});

/**
 * VIRTUAL: LEVEL
 * Cấp độ của category trong tree
 * Root = 0, con = 1, cháu = 2...
 */
categorySchema.virtual('level').get(async function () {
    if (!this.parent) {
        return 0; // Root category
    }

    // Đếm số cấp từ root đến category này
    let level = 0;
    let current = this;

    while (current.parent) {
        level++;
        // Populate parent nếu chưa có
        if (!current.parent._id) {
            await current.populate('parent');
        }
        current = current.parent;
    }

    return level;
});

/**
 * VIRTUAL: PATH
 * Đường dẫn đầy đủ từ root đến category này
 * Ví dụ: "Electronics > Computers > Laptops"
 */
categorySchema.virtual('path').get(async function () {
    const path = [this.name];
    let current = this;

    // Đi ngược lên root
    while (current.parent) {
        // Populate parent nếu chưa có
        if (!current.parent.name) {
            await current.populate('parent');
        }
        path.unshift(current.parent.name);
        current = current.parent;
    }

    return path.join(' > ');
});

/**
 * VIRTUAL: PATH SLUGS
 * Đường dẫn slugs từ root đến category này
 * Ví dụ: ["electronics", "computers", "laptops"]
 */
categorySchema.virtual('pathSlugs').get(async function () {
    const pathSlugs = [this.slug];
    let current = this;

    while (current.parent) {
        if (!current.parent.slug) {
            await current.populate('parent');
        }
        pathSlugs.unshift(current.parent.slug);
        current = current.parent;
    }

    return pathSlugs;
});

/**
 * VIRTUAL: ANCESTORS
 * Tất cả ancestors (tổ tiên) của category này
 * Từ root đến parent
 */
categorySchema.virtual('ancestors', {
    ref: 'Category',
    localField: 'parent',
    foreignField: '_id',
    justOne: false
});

/**
 * VIRTUAL: DESCENDANTS COUNT
 * Số lượng descendants (con cháu) của category này
 */
categorySchema.virtual('descendantsCount').get(async function () {
    // Đếm tất cả categories có parent là category này hoặc con cháu của nó
    const count = await mongoose.model('Category').countDocuments({
        $or: [
            { parent: this._id },
            { 'parent.parent': this._id },
            { 'parent.parent.parent': this._id }
            // Có thể dùng recursive query nếu cần
        ]
    });
    return count;
});

/**
 * PRE-SAVE MIDDLEWARE
 * Chạy trước khi lưu document
 */

/**
 * PRE-SAVE: GENERATE SLUG
 * Tự động tạo slug từ name nếu chưa có
 */
categorySchema.pre('save', function (next) {
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
 * PRE-SAVE: VALIDATE HIERARCHY
 * Kiểm tra không có circular reference
 */
categorySchema.pre('save', async function (next) {
    // Nếu không có parent, không cần validate
    if (!this.parent) {
        return next();
    }

    // Nếu parent chính là category này → circular reference
    if (this.parent.toString() === this._id.toString()) {
        return next(new Error('Category không thể là parent của chính nó'));
    }

    // Kiểm tra parent có tồn tại không
    const parent = await mongoose.model('Category').findById(this.parent);
    if (!parent) {
        return next(new Error('Parent category không tồn tại'));
    }

    // Kiểm tra circular reference: parent không thể là con cháu của category này
    let current = parent;
    const visited = new Set([this._id.toString()]);

    while (current && current.parent) {
        const parentId = current.parent.toString();

        // Nếu gặp category này trong chain → circular reference
        if (visited.has(parentId)) {
            return next(new Error('Circular reference detected: Category không thể là parent của tổ tiên của nó'));
        }

        visited.add(parentId);

        // Lấy parent tiếp theo
        current = await mongoose.model('Category').findById(current.parent);
        if (!current) break;
    }

    next();
});

/**
 * PRE-SAVE: VALIDATE MAX DEPTH
 * Giới hạn độ sâu của tree (optional)
 */
categorySchema.pre('save', async function (next) {
    const MAX_DEPTH = 5; // Giới hạn 5 cấp

    if (!this.parent) {
        return next();
    }

    // Tính độ sâu của parent
    let depth = 0;
    let current = await mongoose.model('Category').findById(this.parent);

    while (current && current.parent) {
        depth++;
        if (depth >= MAX_DEPTH - 1) {
            return next(new Error(`Độ sâu tối đa của category tree là ${MAX_DEPTH} cấp`));
        }
        current = await mongoose.model('Category').findById(current.parent);
    }

    next();
});

/**
 * STATIC METHODS
 * Methods gọi trên Model (Category.method())
 */

/**
 * STATIC: FIND ROOT CATEGORIES
 * Tìm tất cả root categories (không có parent)
 */
categorySchema.statics.findRootCategories = function (options = {}) {
    const query = {
        parent: null,
        status: 'active'
    };

    if (options.featured !== undefined) {
        query.featured = options.featured;
    }

    return this.find(query)
        .sort({ order: 1, createdAt: 1 })
        .populate('children', 'name slug image order')
        .limit(options.limit || 50);
};

/**
 * STATIC: FIND BY SLUG
 * Tìm category theo slug
 */
categorySchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'active' })
        .populate('parent', 'name slug')
        .populate('children', 'name slug image order');
};

/**
 * STATIC: FIND BY PARENT
 * Tìm tất cả categories con của một parent
 */
categorySchema.statics.findByParent = function (parentId, options = {}) {
    const query = {
        parent: parentId,
        status: 'active'
    };

    if (options.featured !== undefined) {
        query.featured = options.featured;
    }

    return this.find(query)
        .sort({ order: 1, createdAt: 1 })
        .populate('children', 'name slug image order')
        .limit(options.limit || 50);
};

/**
 * STATIC: BUILD TREE
 * Build category tree (nested structure)
 */
categorySchema.statics.buildTree = async function (rootId = null, options = {}) {
    /**
     * Tìm tất cả categories
     * Nếu có rootId, chỉ lấy từ root đó trở xuống
     */
    let query = { status: 'active' };

    if (rootId) {
        // Lấy root và tất cả descendants
        const root = await this.findById(rootId);
        if (!root) {
            return null;
        }

        // Tìm tất cả descendants
        const descendants = await this.findAllDescendants(rootId);
        const categoryIds = [rootId, ...descendants.map(d => d._id)];
        query._id = { $in: categoryIds };
    } else {
        // Lấy tất cả categories
    }

    const categories = await this.find(query).sort({ order: 1, createdAt: 1 });

    /**
     * Build tree structure
     */
    const categoryMap = new Map();
    const rootCategories = [];

    // Tạo map để dễ lookup
    categories.forEach(cat => {
        categoryMap.set(cat._id.toString(), {
            ...cat.toObject(),
            children: []
        });
    });

    // Build tree
    categories.forEach(cat => {
        const categoryObj = categoryMap.get(cat._id.toString());

        if (!cat.parent) {
            // Root category
            rootCategories.push(categoryObj);
        } else {
            // Child category
            const parent = categoryMap.get(cat.parent.toString());
            if (parent) {
                parent.children.push(categoryObj);
            }
        }
    });

    return rootCategories;
};

/**
 * STATIC: FIND ALL DESCENDANTS
 * Tìm tất cả descendants (con cháu) của một category
 */
categorySchema.statics.findAllDescendants = async function (categoryId) {
    const descendants = [];
    const queue = [categoryId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = await this.find({ parent: currentId });

        for (const child of children) {
            descendants.push(child);
            queue.push(child._id);
        }
    }

    return descendants;
};

/**
 * STATIC: FIND ALL ANCESTORS
 * Tìm tất cả ancestors (tổ tiên) của một category
 */
categorySchema.statics.findAllAncestors = async function (categoryId) {
    const ancestors = [];
    let current = await this.findById(categoryId);

    while (current && current.parent) {
        const parent = await this.findById(current.parent);
        if (parent) {
            ancestors.unshift(parent); // Thêm vào đầu để giữ thứ tự
            current = parent;
        } else {
            break;
        }
    }

    return ancestors;
};

/**
 * STATIC: GET BREADCRUMB
 * Lấy breadcrumb path cho một category
 */
categorySchema.statics.getBreadcrumb = async function (categoryId) {
    const category = await this.findById(categoryId);
    if (!category) {
        return [];
    }

    const breadcrumb = [category];
    const ancestors = await this.findAllAncestors(categoryId);

    return [...ancestors, category];
};


/**
 * INSTANCE METHODS
 * Methods gọi trên document (category.method())
 */

/**
 * METHOD: GET CHILDREN
 * Lấy tất cả categories con
 */
categorySchema.methods.getChildren = async function () {
    await this.populate('children');
    return this.children;
};

/**
 * METHOD: GET ALL DESCENDANTS
 * Lấy tất cả descendants (con cháu)
 */
categorySchema.methods.getAllDescendants = async function () {
    return mongoose.model('Category').findAllDescendants(this._id);
};

/**
 * METHOD: GET ALL ANCESTORS
 * Lấy tất cả ancestors (tổ tiên)
 */
categorySchema.methods.getAllAncestors = async function () {
    return mongoose.model('Category').findAllAncestors(this._id);
};

/**
 * METHOD: IS ROOT
 * Kiểm tra category có phải root không
 */
categorySchema.methods.isRoot = function () {
    return !this.parent;
};

/**
 * METHOD: IS LEAF
 * Kiểm tra category có phải leaf (không có con) không
 */
categorySchema.methods.isLeaf = async function () {
    const childrenCount = await mongoose.model('Category').countDocuments({
        parent: this._id
    });
    return childrenCount === 0;
};

/**
 * METHOD: GET DEPTH
 * Lấy độ sâu của category trong tree
 */
categorySchema.methods.getDepth = async function () {
    if (!this.parent) {
        return 0;
    }

    let depth = 0;
    let current = this;

    while (current.parent) {
        depth++;
        await current.populate('parent');
        current = current.parent;
    }

    return depth;
};

/**
 * METHOD: MOVE TO PARENT
 * Di chuyển category sang parent khác
 */
categorySchema.methods.moveToParent = async function (newParentId) {
    // Validate không có circular reference
    if (newParentId) {
        const newParent = await mongoose.model('Category').findById(newParentId);
        if (!newParent) {
            throw new Error('Parent category không tồn tại');
        }

        // Kiểm tra newParent không phải là con cháu của category này
        const descendants = await mongoose.model('Category').findAllDescendants(this._id);
        const isDescendant = descendants.some(d => d._id.toString() === newParentId.toString());

        if (isDescendant) {
            throw new Error('Không thể di chuyển category vào con cháu của nó');
        }
    }

    this.parent = newParentId || null;
    return this.save();
};


/**
 * POST-SAVE MIDDLEWARE
 * Chạy sau khi lưu document
 */

/**
 * POST-SAVE: UPDATE PRODUCT COUNT
 * Cập nhật productCount cho category và tất cả ancestors
 */
categorySchema.post('save', async function () {
    // Cập nhật productCount cho category này
    const Product = mongoose.model('Product');
    const Category = mongoose.model('Category');
    const directProductCount = await Product.countDocuments({
        category: this._id,
        status: 'active'
    });

    // Đếm products trong tất cả descendants
    const descendants = await Category.findAllDescendants(this._id);
    const descendantIds = descendants.map(d => d._id);
    const descendantProductCount = await Product.countDocuments({
        category: { $in: descendantIds },
        status: 'active'
    });

    await Category.updateOne(
        { _id: this._id },
        { $set: { productCount: directProductCount + descendantProductCount } }
    );

    // Cập nhật productCount cho tất cả ancestors
    const ancestors = await Category.findAllAncestors(this._id);
    for (const ancestor of ancestors) {
        const ancestorDirectCount = await Product.countDocuments({
            category: ancestor._id,
            status: 'active'
        });

        const ancestorDescendants = await Category.findAllDescendants(ancestor._id);
        const ancestorDescendantIds = ancestorDescendants.map(d => d._id);
        const ancestorDescendantCount = await Product.countDocuments({
            category: { $in: ancestorDescendantIds },
            status: 'active'
        });

        await Category.updateOne(
            { _id: ancestor._id },
            { $set: { productCount: ancestorDirectCount + ancestorDescendantCount } }
        );
    }
});




/**
 * CREATE MODEL
 * Tạo Category model từ schema
 */
const Category = mongoose.model('Category', categorySchema);

export default Category;
