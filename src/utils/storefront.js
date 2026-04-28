import crypto from 'crypto';
import Cart from '../models/Cart.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const VIETNAMESE_CURRENCY = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
});

const DEFAULT_PROMO_CODES = {
    SOUNDHOUSE10: {
        type: 'percent',
        value: 10,
        maxDiscount: 500000
    },
    FREESHIP: {
        type: 'shipping',
        value: 50000
    }
};

export const formatCurrency = (value) => VIETNAMESE_CURRENCY.format(Number(value || 0));

export const createPlaceholderImage = (title, accent = '#636ae8') => {
    const safeAccent = /^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(accent) ? accent : '#636ae8';
    const label = String(title || 'SoundHouse').slice(0, 36);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${safeAccent}" stop-opacity="1" />
                    <stop offset="100%" stop-color="#111827" stop-opacity="1" />
                </linearGradient>
            </defs>
            <rect width="800" height="800" fill="url(#g)" rx="48" />
            <circle cx="400" cy="280" r="108" fill="rgba(255,255,255,0.12)" />
            <rect x="230" y="440" width="340" height="110" rx="20" fill="rgba(255,255,255,0.12)" />
            <text x="400" y="660" text-anchor="middle" fill="#ffffff" font-size="34" font-family="Arial, Helvetica, sans-serif">${label}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const normalizeMap = (value) => {
    if (!value) {
        return {};
    }

    if (value instanceof Map) {
        return Object.fromEntries(value.entries());
    }

    return { ...value };
};

export const normalizeVariant = (variant = {}, product = {}) => {
    const attributes = normalizeMap(variant.attributes);
    const compareAtPrice = variant.compareAtPrice || null;
    const price = Number(variant.price || 0);
    const discountPercentage = compareAtPrice && compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : 0;
    const image = variant.images?.[0] || product.images?.[0] || createPlaceholderImage(product.name || 'SoundHouse');

    return {
        id: String(variant._id || ''),
        sku: variant.sku || '',
        attributes,
        attributesText: Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(', '),
        price,
        priceText: formatCurrency(price),
        compareAtPrice,
        compareAtPriceText: compareAtPrice ? formatCurrency(compareAtPrice) : '',
        discountPercentage,
        stock: Number(variant.stock || 0),
        isActive: variant.isActive !== false,
        image,
        images: variant.images?.length ? variant.images : [image]
    };
};

export const normalizeProduct = (product) => {
    const productObject = typeof product?.toObject === 'function'
        ? product.toObject({ virtuals: true })
        : { ...product };

    const variants = Array.isArray(productObject.variants)
        ? productObject.variants.map((variant) => normalizeVariant(variant, productObject))
        : [];
    const activeVariants = variants.filter((variant) => variant.isActive);
    const primaryVariant = activeVariants[0] || variants[0] || null;
    const prices = activeVariants.map((variant) => variant.price);
    const minPrice = prices.length ? Math.min(...prices) : primaryVariant?.price || 0;
    const maxPrice = prices.length ? Math.max(...prices) : primaryVariant?.price || 0;
    const compareAtPrice = primaryVariant?.compareAtPrice || null;
    const ratingAverage = Number(productObject.rating?.average || 0);
    const ratingCount = Number(productObject.rating?.count || 0);
    const images = productObject.images?.length
        ? productObject.images
        : primaryVariant?.images?.length
            ? primaryVariant.images
            : [createPlaceholderImage(productObject.name || 'SoundHouse')];
    const availableAttributes = {};

    for (const variant of variants) {
        for (const [key, value] of Object.entries(variant.attributes)) {
            availableAttributes[key] = availableAttributes[key] || [];
            if (!availableAttributes[key].includes(value)) {
                availableAttributes[key].push(value);
            }
        }
    }

    return {
        id: String(productObject._id || ''),
        name: productObject.name || 'Sản phẩm',
        slug: productObject.slug || '',
        description: productObject.description || '',
        shortDescription: productObject.shortDescription || productObject.description || '',
        brand: productObject.brand || 'SoundHouse',
        category: productObject.category?.name
            ? {
                id: String(productObject.category._id || ''),
                name: productObject.category.name,
                slug: productObject.category.slug
            }
            : null,
        featured: Boolean(productObject.featured),
        images,
        image: images[0],
        variants,
        primaryVariant,
        minPrice,
        maxPrice,
        price: primaryVariant?.price || minPrice,
        priceText: formatCurrency(primaryVariant?.price || minPrice),
        minPriceText: formatCurrency(minPrice),
        maxPriceText: formatCurrency(maxPrice),
        compareAtPrice,
        compareAtPriceText: compareAtPrice ? formatCurrency(compareAtPrice) : '',
        discountPercentage: primaryVariant?.discountPercentage || 0,
        totalStock: Number(productObject.totalStock || variants.reduce((sum, item) => sum + item.stock, 0)),
        isInStock: variants.some((variant) => variant.stock > 0 && variant.isActive),
        ratingAverage,
        ratingCount,
        ratingText: ratingCount > 0 ? `${ratingAverage.toFixed(1)} / 5` : 'Chưa có đánh giá',
        availableAttributes,
        tags: productObject.tags || []
    };
};

export const normalizeCart = (cart) => {
    const cartObject = typeof cart?.toObject === 'function'
        ? cart.toObject({ virtuals: true })
        : { ...(cart || {}) };
    const items = Array.isArray(cartObject.items) ? cartObject.items : [];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = Number(cartObject.discountAmount || 0);
    const shippingFee = Number(cartObject.shippingFee || 0);
    const total = Math.max(0, subtotal - discountAmount + shippingFee);

    return {
        id: cartObject._id ? String(cartObject._id) : '',
        sessionId: cartObject.sessionId || null,
        user: cartObject.user ? String(cartObject.user) : null,
        promoCode: cartObject.promoCode || null,
        discountAmount,
        discountAmountText: formatCurrency(discountAmount),
        shippingFee,
        shippingFeeText: formatCurrency(shippingFee),
        subtotal,
        subtotalText: formatCurrency(subtotal),
        total,
        totalText: formatCurrency(total),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        items: items.map((item) => ({
            id: String(item._id || ''),
            productId: String(item.product || ''),
            variantId: String(item.variantId || ''),
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            priceText: formatCurrency(item.price || 0),
            lineTotal: Number(item.price || 0) * Number(item.quantity || 0),
            lineTotalText: formatCurrency((item.price || 0) * (item.quantity || 0)),
            compareAtPrice: item.compareAtPrice || null,
            compareAtPriceText: item.compareAtPrice ? formatCurrency(item.compareAtPrice) : '',
            name: item.name || 'Sản phẩm',
            slug: item.slug || '',
            brand: item.brand || '',
            sku: item.sku || '',
            image: item.image || createPlaceholderImage(item.name || 'SoundHouse'),
            attributes: normalizeMap(item.attributes),
            attributesText: Object.entries(normalizeMap(item.attributes)).map(([key, value]) => `${key}: ${value}`).join(', ')
        }))
    };
};

export const getPromoDefinition = (code) => DEFAULT_PROMO_CODES[String(code || '').trim().toUpperCase()] || null;

export const calculatePromo = (subtotal, code) => {
    const promo = getPromoDefinition(code);
    if (!promo) {
        return { promoCode: null, discountAmount: 0 };
    }

    if (promo.type === 'shipping') {
        return {
            promoCode: String(code).trim().toUpperCase(),
            discountAmount: 0,
            shippingOverride: promo.value
        };
    }

    const rawDiscount = Math.round((subtotal * promo.value) / 100);
    return {
        promoCode: String(code).trim().toUpperCase(),
        discountAmount: promo.maxDiscount ? Math.min(rawDiscount, promo.maxDiscount) : rawDiscount
    };
};

export const resolveCartOwner = (req) => {
    const headerSessionId = req.headers['x-cart-session'];
    const inputSessionId = req.body?.sessionId || req.query?.sessionId || headerSessionId;
    const sessionId = typeof inputSessionId === 'string' && inputSessionId.trim()
        ? inputSessionId.trim()
        : `cart_${crypto.randomUUID()}`;

    return {
        userId: req.user?._id || null,
        sessionId,
        generatedSessionId: !inputSessionId
    };
};

export const buildCartQuery = ({ userId, sessionId }) => {
    if (userId) {
        return { user: userId };
    }

    return { sessionId };
};

export const findOrCreateCart = async ({ userId, sessionId }) => {
    const query = buildCartQuery({ userId, sessionId });
    let cart = await Cart.findOne(query);

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            sessionId: userId ? null : sessionId,
            items: []
        });
    }

    return cart;
};

export const getFallbackProducts = () => ([
    {
        _id: 'fallback-marshall',
        slug: 'marshall-stanmore-iii',
        name: 'Loa Marshall Stanmore III',
        brand: 'Marshall',
        description: 'Mẫu loa mang phong cách cổ điển, âm thanh mạnh mẽ cho phòng khách hiện đại.',
        shortDescription: 'Âm thanh mạnh mẽ, hoàn thiện cao cấp, phù hợp nhiều không gian.',
        category: {
            _id: 'fallback-category',
            name: 'Loa Bluetooth',
            slug: 'loa-bluetooth'
        },
        featured: true,
        rating: { average: 4.8, count: 128 },
        images: [createPlaceholderImage('Marshall Stanmore III')],
        variants: [
            {
                _id: 'variant-black',
                sku: 'MRS-STANMORE-III-BLK',
                attributes: { Mau: 'Đen cổ điển' },
                price: 9490000,
                compareAtPrice: 10500000,
                stock: 8,
                images: [createPlaceholderImage('Stanmore Black')]
            },
            {
                _id: 'variant-cream',
                sku: 'MRS-STANMORE-III-CRM',
                attributes: { Mau: 'Kem vintage' },
                price: 9690000,
                compareAtPrice: 10500000,
                stock: 4,
                images: [createPlaceholderImage('Stanmore Cream', '#d1b48c')]
            }
        ]
    },
    {
        _id: 'fallback-jbl',
        slug: 'jbl-authentics-300',
        name: 'Loa JBL Authentics 300',
        brand: 'JBL',
        description: 'Thiết kế retro kết hợp Bluetooth và pin di động, cân bằng giữa thẩm mỹ và hiệu năng.',
        shortDescription: 'Thiết kế retro, pin di động, âm thanh sống động.',
        category: {
            _id: 'fallback-category',
            name: 'Loa Bluetooth',
            slug: 'loa-bluetooth'
        },
        featured: true,
        rating: { average: 4.6, count: 64 },
        images: [createPlaceholderImage('JBL Authentics 300', '#f59e0b')],
        variants: [
            {
                _id: 'variant-jbl-main',
                sku: 'JBL-AUTH-300',
                attributes: { Mau: 'Đen' },
                price: 8990000,
                compareAtPrice: 9490000,
                stock: 10,
                images: [createPlaceholderImage('JBL 300', '#f59e0b')]
            }
        ]
    },
    {
        _id: 'fallback-bose',
        slug: 'bose-home-speaker-500',
        name: 'Loa Bose Home Speaker 500',
        brand: 'Bose',
        description: 'Loa thông minh với dải mid chi tiết, giọng hát nổi bật và hệ sinh thái điều khiển tiện lợi.',
        shortDescription: 'Thiết kế gọn, âm trường rộng, hỗ trợ trợ lý ảo.',
        category: {
            _id: 'fallback-category',
            name: 'Loa Bluetooth',
            slug: 'loa-bluetooth'
        },
        featured: false,
        rating: { average: 4.7, count: 51 },
        images: [createPlaceholderImage('Bose Speaker 500', '#10b981')],
        variants: [
            {
                _id: 'variant-bose-main',
                sku: 'BOSE-HS500',
                attributes: { Mau: 'Trắng bạc' },
                price: 9900000,
                stock: 6,
                images: [createPlaceholderImage('Bose 500', '#10b981')]
            }
        ]
    },
    {
        _id: 'fallback-hk',
        slug: 'harman-kardon-aura-studio-4',
        name: 'Loa Harman Kardon Aura Studio 4',
        brand: 'Harman Kardon',
        description: 'Mẫu loa có thiết kế trong suốt đặc trưng cùng bass sâu, hợp decor hiện đại.',
        shortDescription: 'Thiết kế nổi bật, bass dày, trình diễn đẹp mắt.',
        category: {
            _id: 'fallback-category',
            name: 'Loa Bluetooth',
            slug: 'loa-bluetooth'
        },
        featured: false,
        rating: { average: 4.5, count: 33 },
        images: [createPlaceholderImage('Aura Studio 4', '#8b5cf6')],
        variants: [
            {
                _id: 'variant-hk-main',
                sku: 'HK-AURA-4',
                attributes: { Mau: 'Transparent' },
                price: 6490000,
                stock: 7,
                images: [createPlaceholderImage('Aura 4', '#8b5cf6')]
            }
        ]
    }
]);

export const getFallbackCategories = () => ([
    {
        _id: 'fallback-category',
        name: 'Loa Bluetooth',
        slug: 'loa-bluetooth',
        description: 'Các mẫu loa di động và loa để bàn cao cấp từ nhiều thương hiệu.',
        productCount: 4,
        children: []
    }
]);

export const getFallbackStorefront = () => {
    const products = getFallbackProducts().map(normalizeProduct);
    const categories = getFallbackCategories();

    return {
        products,
        product: products[0],
        relatedProducts: products.slice(1),
        category: categories[0],
        categories,
        brands: ['Marshall', 'JBL', 'Bose', 'Harman Kardon']
    };
};

export const fetchStorefrontProducts = async ({ limit = 8, categorySlug = null, excludeId = null } = {}) => {
    const query = {
        status: 'active',
        deleted: { $ne: true }
    };

    if (categorySlug) {
        const category = await Category.findOne({ slug: categorySlug }).lean();
        if (category) {
            query.category = category._id;
        }
    }

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const products = await Product.find(query)
        .populate('category', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    return products.map(normalizeProduct);
};
