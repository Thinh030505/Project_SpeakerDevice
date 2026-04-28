import Category from '../../models/Category.js';
import Product from '../../models/Product.js';
import Banner from '../../models/Banner.js';
import { env, isDatabaseConnected } from '../../config/index.js';
import {
    createPlaceholderImage,
    fetchStorefrontProducts,
    formatCurrency,
    getFallbackStorefront,
    normalizeProduct
} from '../../utils/storefront.js';

const baseLocals = {
    formatCurrency
};

const checkoutConfig = {
    enabled: Boolean(env.paymentBankCode && env.paymentBankAccountNumber && env.paymentBankAccountName),
    bankCode: env.paymentBankCode,
    bankName: env.paymentBankName || env.paymentBankCode,
    accountNumber: env.paymentBankAccountNumber,
    accountName: env.paymentBankAccountName,
    qrTemplate: env.paymentQrTemplate || 'compact2',
    qrImageUrl: env.paymentQrImageUrl
};

const canUseDatabase = () => !env.skipExternalServices && isDatabaseConnected();

const renderStaticPage = (viewName, extraLocals = {}) => (req, res) => {
    res.render(`page/client/${viewName}`, {
        ...baseLocals,
        pageTitle: extraLocals.pageTitle,
        ...extraLocals
    });
};

const buildCategoryFilters = (req) => ({
    categorySlug: String(req.query.categorySlug || req.params.slug || '').trim(),
    search: String(req.query.search || '').trim(),
    brand: String(req.query.brand || '').trim(),
    sort: String(req.query.sort || 'featured'),
    minPrice: Number(req.query.minPrice || 0),
    maxPrice: Number(req.query.maxPrice || 0)
});

const buildMockCategoryProducts = (category) => {
    const categoryRef = {
        _id: category?._id || 'mock-category',
        name: category?.name || 'Loa Bluetooth Cao Cấp',
        slug: category?.slug || 'loa-bluetooth'
    };

    const mockProducts = [
        ['Marshall', 'Loa Bluetooth Marshall Emberton II', 'marshall-emberton-ii', 4590000, 5590000, '#d6d9de', true],
        ['Bose', 'Bose QuietComfort 45 Headphones', 'bose-qc45', 7290000, null, '#d8d3c9', false],
        ['JBL', 'JBL PartyBox 310 Power Sound', 'jbl-partybox-310', 13590000, 14990000, '#1c2434', true],
        ['Sony', 'Sony SRS-XG300 X-Series', 'sony-srs-xg300', 5390000, null, '#3a3c34', false],
        ['B&O', 'Bang & Olufsen Beosound A1', 'bang-olufsen-a1', 8500000, null, '#d7d0c9', false],
        ['Harman Kardon', 'Harman Kardon Onyx Studio 8', 'harman-kardon-onyx-studio-8', 6490000, 6990000, '#c8c4bc', true],
        ['Marshall', 'Loa Bluetooth Marshall Emberton I', 'marshall-emberton-i', 4390000, 4990000, '#7a756d', true],
        ['Bose', 'Bose QuietComfort 45 Headphones', 'bose-qc45-2', 7290000, null, '#b59a63', false],
        ['JBL', 'JBL PartyBox 710 Power Sound', 'jbl-partybox-710', 13590000, 14990000, '#25253a', true],
        ['Sony', 'Sony SRS-XE300 X-Series', 'sony-srs-xe300', 5990000, null, '#44453f', false],
        ['B&O', 'Bang & Olufsen Beosound A1', 'bang-olufsen-a1-2', 8500000, null, '#d2c4b7', false],
        ['Harman Kardon', 'Harman Kardon Onyx Studio 8', 'harman-kardon-onyx-studio-8-2', 6490000, 6990000, '#bdb7ad', true]
    ];

    return mockProducts.map(([brand, name, slug, price, compareAtPrice, accent, featured], index) => normalizeProduct({
        _id: `mock-${slug}`,
        slug,
        name,
        brand,
        description: `${name} dành cho không gian nghe nhạc hiện đại, cân bằng giữa thiết kế và hiệu năng.`,
        shortDescription: `${name} với âm thanh rõ nét và thiết kế cao cấp.`,
        category: categoryRef,
        featured,
        rating: {
            average: 4.4 + ((index % 4) * 0.1),
            count: 18 + (index * 7)
        },
        images: [createPlaceholderImage(name, accent)],
        variants: [
            {
                _id: `variant-${slug}`,
                sku: `${slug}`.toUpperCase(),
                attributes: { Mau: 'Tiêu chuẩn' },
                price,
                compareAtPrice,
                stock: 4 + (index % 6),
                images: [createPlaceholderImage(name, accent)]
            }
        ]
    }));
};

const applyCategoryFilters = (products, filters) => products.filter((product) => {
    if (filters.brand && product.brand !== filters.brand) {
        return false;
    }
    if (filters.search && !`${product.name} ${product.brand}`.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
    }
    if (filters.minPrice && product.price < filters.minPrice) {
        return false;
    }
    if (filters.maxPrice && product.price > filters.maxPrice) {
        return false;
    }
    return true;
});

const getSortComparator = (sort) => {
    const collator = new Intl.Collator('vi');

    switch (sort) {
        case 'price_asc':
            return (a, b) => a.price - b.price;
        case 'price_desc':
            return (a, b) => b.price - a.price;
        case 'rating':
            return (a, b) => b.ratingAverage - a.ratingAverage;
        case 'name':
            return (a, b) => collator.compare(a.name, b.name);
        case 'newest':
            return (a, b) => String(b.id).localeCompare(String(a.id));
        case 'featured':
        default:
            return (a, b) => Number(b.featured) - Number(a.featured);
    }
};

const loadCategoryPageData = async (slug, filters) => {
    const resolvedSlug = filters.categorySlug || slug || '';

    if (!canUseDatabase()) {
        const fallback = getFallbackStorefront();
        const scopedProducts = resolvedSlug
            ? fallback.products.filter((product) => product.category?.slug === resolvedSlug)
            : fallback.products;
        const products = applyCategoryFilters(scopedProducts, filters).sort(getSortComparator(filters.sort));

        return {
            category: resolvedSlug
                ? fallback.categories.find((item) => item.slug === resolvedSlug) || fallback.category
                : {
                    _id: 'all-categories',
                    name: 'Tat ca Loa',
                    slug: '',
                    description: 'Kham pha toan bo bo suu tap loa Bluetooth, soundbar, karaoke va loa thong minh tai SoundHouse.',
                    productCount: products.length
                },
            products,
            relatedCategories: fallback.categories,
            brands: fallback.brands
        };
    }

    const query = {
        status: 'active',
        deleted: { $ne: true }
    };

    let category = null;
    let categoryIds = [];

    if (resolvedSlug) {
        category = await Category.findOne({ slug: resolvedSlug, status: 'active' }).lean();

        if (!category) {
            return getFallbackStorefront();
        }

        const descendants = await Category.findAllDescendants(category._id);
        categoryIds = [category._id, ...descendants.map((item) => item._id)];
        query.category = { $in: categoryIds };
    }

    if (filters.brand) {
        query.brand = filters.brand;
    }

    if (filters.search) {
        query.$text = { $search: filters.search };
    }

    if (filters.minPrice || filters.maxPrice) {
        query['variants.price'] = {};
        if (filters.minPrice) query['variants.price'].$gte = filters.minPrice;
        if (filters.maxPrice) query['variants.price'].$lte = filters.maxPrice;
    }

    const sortMap = {
        featured: { featured: -1, createdAt: -1 },
        price_asc: { 'variants.price': 1, createdAt: -1 },
        price_desc: { 'variants.price': -1, createdAt: -1 },
        newest: { createdAt: -1 },
        rating: { 'rating.average': -1, createdAt: -1 },
        name: { name: 1 }
    };

    const [products, relatedCategories, brandDocs] = await Promise.all([
        Product.find(query)
            .populate('category', 'name slug')
            .sort(sortMap[filters.sort] || sortMap.featured)
            .limit(24)
            .lean(),
        Category.find(resolvedSlug ? {
            _id: { $ne: category._id },
            status: 'active',
            parent: category.parent || null
        } : {
            status: 'active',
            parent: null
        })
            .sort({ order: 1, name: 1 })
            .limit(8)
            .lean(),
        Product.distinct('brand', {
            status: 'active',
            deleted: { $ne: true },
            ...(categoryIds.length ? { category: { $in: categoryIds } } : {}),
            brand: { $nin: [null, ''] }
        })
    ]);

    if (!products.length) {
        const fallbackCategory = category || {
            _id: 'all-categories',
            name: 'Tat ca Loa',
            slug: '',
            description: 'Kham pha toan bo bo suu tap loa Bluetooth, soundbar, karaoke va loa thong minh tai SoundHouse.'
        };
        const mockProducts = buildMockCategoryProducts(fallbackCategory)
            .filter((product) => !resolvedSlug || product.category?.slug === resolvedSlug)
            .filter((product) => applyCategoryFilters([product], filters).length)
            .sort(getSortComparator(filters.sort));

        return {
            category: resolvedSlug ? {
                ...category,
                productCount: mockProducts.length || category.productCount || 12
            } : {
                ...fallbackCategory,
                productCount: mockProducts.length
            },
            products: mockProducts,
            relatedCategories,
            brands: [...new Set(mockProducts.map((product) => product.brand))].sort((a, b) => a.localeCompare(b, 'vi'))
        };
    }

    return {
        category: resolvedSlug ? category : {
            _id: 'all-categories',
            name: 'Tat ca Loa',
            slug: '',
            description: 'Kham pha toan bo bo suu tap loa Bluetooth, soundbar, karaoke va loa thong minh tai SoundHouse.',
            productCount: products.length
        },
        products: products.map(normalizeProduct),
        relatedCategories,
        brands: brandDocs.sort((a, b) => a.localeCompare(b, 'vi'))
    };
};

const loadProductPageData = async (slug) => {
    if (!canUseDatabase()) {
        const fallback = getFallbackStorefront();
        return {
            product: slug ? fallback.products.find((item) => item.slug === slug) || fallback.product : fallback.product,
            relatedProducts: fallback.relatedProducts
        };
    }

    const product = slug
        ? await Product.findOne({ slug, status: 'active', deleted: { $ne: true } }).populate('category', 'name slug')
        : await Product.findOne({ status: 'active', deleted: { $ne: true } }).populate('category', 'name slug').sort({ featured: -1, createdAt: -1 });

    if (!product) {
        const fallback = getFallbackStorefront();
        return {
            product: fallback.product,
            relatedProducts: fallback.relatedProducts
        };
    }

    const relatedProducts = await fetchStorefrontProducts({
        categorySlug: product.category?.slug,
        excludeId: product._id,
        limit: 4
    });

    return {
        product: normalizeProduct(product),
        relatedProducts
    };
};

export const renderHomePage = async (req, res, next) => {
    try {
        const fallback = getFallbackStorefront();
        let featuredProducts = fallback.products.slice(0, 8);
        let featuredCategories = fallback.categories.slice(0, 4);
        let heroBanners = [];

        if (canUseDatabase()) {
            const [categoryDocs, productDocs, bannerDocs] = await Promise.all([
                Category.find({ status: 'active' })
                    .sort({ featured: -1, order: 1, name: 1 })
                    .limit(4)
                    .lean(),
                Product.find({ status: 'active', deleted: { $ne: true } })
                    .populate('category', 'name slug')
                    .sort({ featured: -1, createdAt: -1 })
                    .limit(8)
                    .lean(),
                Banner.find({ status: 'active', placement: 'home_hero' })
                    .sort({ order: 1, createdAt: -1 })
                    .limit(6)
                    .lean()
            ]);

            if (categoryDocs.length) {
                featuredCategories = categoryDocs.map((category) => ({
                    id: String(category._id),
                    name: category.name,
                    slug: category.slug,
                    description: category.description || '',
                    productCount: category.productCount || 0
                }));
            }

            if (productDocs.length) {
                featuredProducts = productDocs.map(normalizeProduct);
            }

            heroBanners = bannerDocs.map((banner) => ({
                id: String(banner._id),
                title: banner.title,
                description: banner.description || '',
                image: banner.image,
                mobileImage: banner.mobileImage || banner.image,
                buttonText: banner.buttonText || 'Khám phá ngay',
                buttonLink: banner.buttonLink || '/category'
            }));
        }

        const heroProduct = featuredProducts[0] || fallback.product;

        res.render('page/client/index', {
            ...baseLocals,
            pageTitle: 'Trang chủ',
            searchKeyword: '',
            heroProduct,
            heroBanners,
            featuredCategories,
            featuredProducts
        });
    } catch (error) {
        next(error);
    }
};

export const renderCartPage = async (req, res, next) => {
    try {
        const recommendations = canUseDatabase()
            ? await fetchStorefrontProducts({ limit: 4 }).catch(() => getFallbackStorefront().products.slice(0, 4))
            : getFallbackStorefront().products.slice(0, 4);

        res.render('page/client/cart', {
            ...baseLocals,
            pageTitle: 'Giỏ hàng',
            recommendations
        });
    } catch (error) {
        next(error);
    }
};

export const renderCategoryPage = async (req, res, next) => {
    try {
        const filters = buildCategoryFilters(req);
        const { category, products, relatedCategories, brands } = await loadCategoryPageData(filters.categorySlug || req.params.slug, filters);

        res.render('page/client/category', {
            ...baseLocals,
            pageTitle: category?.name || 'Danh mục',
            searchKeyword: filters.search,
            category,
            products,
            relatedCategories,
            brands,
            filters
        });
    } catch (error) {
        next(error);
    }
};

export const renderCheckoutPage = renderStaticPage('checkout', {
    pageTitle: 'Thanh toan',
    checkoutConfig
});
export const renderContactFaqPage = renderStaticPage('contact-faq');
export const renderForgotPasswordPage = renderStaticPage('forgot-password');
export const renderLoginPage = renderStaticPage('login');
export const renderAccountProfilePage = renderStaticPage('account-profile', { pageTitle: 'Tai khoan' });
export const renderAccountAddressesPage = renderStaticPage('account-addresses', { pageTitle: 'So dia chi' });
export const renderAccountOrdersPage = renderStaticPage('account-orders', { pageTitle: 'Don hang cua toi' });
export const renderAdminDashboardPage = renderStaticPage('admin-dashboard', { pageTitle: 'Admin Dashboard', adminSection: 'dashboard' });
export const renderAdminOrdersPage = renderStaticPage('admin-orders', { pageTitle: 'Quan ly don hang', adminSection: 'orders' });
export const renderAdminProductsPage = renderStaticPage('admin-products', { pageTitle: 'Quan ly san pham', adminSection: 'products' });
export const renderAdminCategoriesPage = renderStaticPage('admin-categories', { pageTitle: 'Quan ly danh muc', adminSection: 'categories' });
export const renderAdminBrandsPage = renderStaticPage('admin-brands', { pageTitle: 'Quan ly thuong hieu', adminSection: 'brands' });
export const renderAdminUsersPage = renderStaticPage('admin-users', { pageTitle: 'Quan ly nguoi dung', adminSection: 'users' });
export const renderAdminEngagementPage = renderStaticPage('admin-engagement', { pageTitle: 'Cham soc khach hang', adminSection: 'engagement' });
export const renderAdminBannersPage = renderStaticPage('admin-banners', { pageTitle: 'Quan ly banner', adminSection: 'banners' });
export const renderAdminReviewsPage = renderStaticPage('admin-reviews', { pageTitle: 'Quan ly danh gia', adminSection: 'reviews' });
export const renderAdminPaymentSettingsPage = renderStaticPage('admin-payment-settings', {
    pageTitle: 'Cai dat thanh toan',
    adminSection: 'payment',
    checkoutConfig
});

export const renderProductDetailPage = async (req, res, next) => {
    try {
        const { product, relatedProducts } = await loadProductPageData(req.params.slug);

        res.render('page/client/product-detail', {
            ...baseLocals,
            pageTitle: product?.name || 'Chi tiết sản phẩm',
            product,
            relatedProducts
        });
    } catch (error) {
        next(error);
    }
};

export const renderRegisterPage = renderStaticPage('register');
export const renderResetPasswordPage = (req, res) => {
    res.render('page/client/reset-password', {
        ...baseLocals,
        pageTitle: 'Đặt lại mật khẩu',
        token: req.query.token || '',
        email: req.query.email || ''
    });
};
