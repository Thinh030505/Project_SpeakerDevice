import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên thương hiệu là bắt buộc'],
        trim: true,
        unique: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    shortDescription: {
        type: String,
        trim: true,
        maxLength: [200, 'Short description không được quá 200 ký tự']
    },
    logo: {
        type: String,
        trim: true
    },
    banner: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator(value) {
                if (!value) return true;
                return /^https?:\/\/.+/.test(value);
            },
            message: 'Website phải là URL hợp lệ'
        }
    },
    country: {
        type: String,
        trim: true
    },
    foundedYear: {
        type: Number,
        min: [1800, 'Năm thành lập phải từ 1800 trở đi'],
        max: [new Date().getFullYear(), 'Năm thành lập không thể lớn hơn năm hiện tại']
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator(value) {
                if (!value) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: 'Email không hợp lệ'
        }
    },
    socialMedia: {
        facebook: { type: String, trim: true },
        instagram: { type: String, trim: true },
        twitter: { type: String, trim: true },
        youtube: { type: String, trim: true }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        index: true
    },
    featured: {
        type: Boolean,
        default: false,
        index: true
    },
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },
    seo: {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        keywords: [{ type: String, trim: true }]
    },
    order: {
        type: Number,
        default: 0,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

brandSchema.index({ name: 'text', description: 'text' });
brandSchema.index({ status: 1, featured: 1 });
brandSchema.index({ status: 1, order: 1 });
brandSchema.index({ country: 1, status: 1 });
brandSchema.index({ status: 1, featured: 1, order: 1 });

brandSchema.virtual('products', {
    ref: 'Product',
    localField: 'name',
    foreignField: 'brand',
    justOne: false
});

brandSchema.virtual('activeProductsCount').get(async function () {
    const Product = mongoose.model('Product');
    return Product.countDocuments({
        brand: this.name,
        status: 'active',
        deleted: { $ne: true }
    });
});

brandSchema.virtual('brandAge').get(function () {
    if (!this.foundedYear) {
        return null;
    }
    return new Date().getFullYear() - this.foundedYear;
});

brandSchema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    next();
});

brandSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('name')) {
        const existingBrand = await mongoose.model('Brand').findOne({
            name: this.name,
            _id: { $ne: this._id }
        });

        if (existingBrand) {
            return next(new Error('Tên thương hiệu đã tồn tại'));
        }
    }
    next();
});

brandSchema.post('save', async function () {
    const Product = mongoose.model('Product');
    const Brand = mongoose.model('Brand');
    const count = await Product.countDocuments({
        brand: this.name,
        status: 'active',
        deleted: { $ne: true }
    });

    if (this.productCount !== count) {
        await Brand.updateOne(
            { _id: this._id },
            { $set: { productCount: count } }
        );
    }
});

brandSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug, status: 'active' })
        .populate('createdBy', 'username email');
};

brandSchema.statics.findActiveBrands = function (options = {}) {
    const query = { status: 'active' };

    if (options.featured !== undefined) {
        query.featured = options.featured;
    }

    return this.find(query)
        .sort({ order: 1, name: 1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

brandSchema.statics.findFeaturedBrands = function (limit = 10) {
    return this.find({ status: 'active', featured: true })
        .sort({ order: 1, name: 1 })
        .limit(limit);
};

brandSchema.statics.search = function (keyword, options = {}) {
    const query = {
        $text: { $search: keyword },
        status: 'active'
    };

    if (options.country) {
        query.country = options.country;
    }

    return this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

brandSchema.statics.findByCountry = function (country, options = {}) {
    return this.find({
        country,
        status: 'active'
    })
        .sort({ order: 1, name: 1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

brandSchema.statics.getBrandsWithProductCount = function (options = {}) {
    const query = { status: 'active' };

    if (options.featured !== undefined) {
        query.featured = options.featured;
    }

    return this.find(query)
        .sort({ productCount: -1, name: 1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

brandSchema.methods.getProducts = function (options = {}) {
    const Product = mongoose.model('Product');
    const query = {
        brand: this.name,
        status: 'active',
        deleted: { $ne: true }
    };

    if (options.category) {
        query.category = options.category;
    }

    return Product.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0)
        .populate('category', 'name slug');
};

brandSchema.methods.getProductCount = function () {
    const Product = mongoose.model('Product');
    return Product.countDocuments({
        brand: this.name,
        status: 'active',
        deleted: { $ne: true }
    });
};

brandSchema.methods.updateProductCount = async function () {
    this.productCount = await this.getProductCount();
    return this.save();
};

brandSchema.methods.hasProducts = function () {
    return this.productCount > 0;
};

brandSchema.methods.isActive = function () {
    return this.status === 'active';
};

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
