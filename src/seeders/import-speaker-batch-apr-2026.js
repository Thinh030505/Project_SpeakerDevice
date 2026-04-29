import dotenv from 'dotenv';
import mongoose from 'mongoose';
import slugify from 'slugify';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import env from '../config/env.js';

dotenv.config({ quiet: true });

const MONGO_URI = env.mongodbUri;

const CATEGORY_DEFS = {
    'loa-bluetooth': {
        name: 'Loa Bluetooth',
        description: 'Cac dong loa bluetooth cao cap cho nhu cau nghe nhac di dong va gia dinh.',
        featured: true,
        order: 1
    },
    'loa-karaoke': {
        name: 'Loa Karaoke',
        description: 'Dong loa cong suat lon phu hop karaoke, party va su kien tai gia.',
        featured: true,
        order: 3
    }
};

const RAW_PRODUCTS = [
    {
        name: 'Loa JBL Clip 5',
        brand: 'JBL',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth mini co moc treo, nho gon va de mang theo.',
        description: 'Loa JBL Clip 5 co thiet ke nho gon, tich hop moc treo tien loi, am thanh ro rang va phu hop cho du lich, da ngoai hoac nghe nhac hang ngay.',
        status: 'active',
        featured: true,
        images: [
            'https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-clip-5-_2_.png'
        ],
        tags: ['loa bluetooth', 'jbl', 'clip', 'portable'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 1490000,
                compareAtPrice: 1790000,
                stock: 20,
                images: [
                    'https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-clip-5-_2_.png'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa JBL Charge 5',
        brand: 'JBL',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth pin lau, bass manh, phu hop di choi.',
        description: 'Loa JBL Charge 5 mang den am thanh manh me, thoi luong pin dai, thiet ke ben bi va phu hop cho nhu cau nghe nhac ngoai troi.',
        status: 'active',
        featured: true,
        images: [
            'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lmjq2u0b9fj31d.webp'
        ],
        tags: ['loa bluetooth', 'jbl', 'charge', 'bass'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 3590000,
                compareAtPrice: 4290000,
                stock: 18,
                images: [
                    'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lmjq2u0b9fj31d.webp'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa JBL PartyBox Encore',
        brand: 'JBL',
        categorySlug: 'loa-karaoke',
        shortDescription: 'Loa party cong suat lon, am thanh soi dong.',
        description: 'Loa JBL PartyBox Encore phu hop cho tiec, karaoke va khong gian giai tri voi am thanh manh, bass chac va thiet ke hien dai.',
        status: 'active',
        featured: true,
        images: [
            'https://thienhaaudio.vn/wp-content/uploads/2023/03/jbl-encore-768x768.jpg'
        ],
        tags: ['loa bluetooth', 'jbl', 'partybox', 'karaoke'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 7490000,
                compareAtPrice: 8990000,
                stock: 8,
                images: [
                    'https://thienhaaudio.vn/wp-content/uploads/2023/03/jbl-encore-768x768.jpg'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Marshall Willen II Cream',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth mini phong cach co dien, mau kem sang trong.',
        description: 'Marshall Willen II Cream la loa bluetooth nho gon voi thiet ke dac trung cua Marshall, am thanh can bang, de mang theo va phu hop nghe nhac moi ngay.',
        status: 'active',
        featured: false,
        images: [
            'https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/2162/329603/loa-bluetooth-marshall-willen-ii-kem-1-638644972303706907-750x500.jpg'
        ],
        tags: ['loa bluetooth', 'marshall', 'willen', 'mini'],
        variants: [
            {
                attributes: { Color: 'Cream' },
                price: 2990000,
                compareAtPrice: 3490000,
                stock: 15,
                images: [
                    'https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/2162/329603/loa-bluetooth-marshall-willen-ii-kem-1-638644972303706907-750x500.jpg'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Marshall Acton III',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth de ban, thiet ke co dien va am thanh manh me.',
        description: 'Marshall Acton III co thiet ke vintage dac trung, am thanh chi tiet, ket noi on dinh va phu hop cho phong ngu, phong lam viec hoac phong khach nho.',
        status: 'active',
        featured: true,
        images: [
            'https://cdn.hstatic.net/products/200000409445/marshall_acton_3_blu-01_658400b84fed4678ac8b80ffee68d08e_master.jpg'
        ],
        tags: ['loa bluetooth', 'marshall', 'acton', 'premium'],
        variants: [
            {
                attributes: { Color: 'Blue' },
                price: 6990000,
                compareAtPrice: 7990000,
                stock: 10,
                images: [
                    'https://cdn.hstatic.net/products/200000409445/marshall_acton_3_blu-01_658400b84fed4678ac8b80ffee68d08e_master.jpg'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Marshall Emberton',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth di dong, thiet ke ben bi va am thanh da huong.',
        description: 'Marshall Emberton co thiet ke nho gon, am thanh da huong, thoi luong pin tot va phu hop cho nguoi dung thuong xuyen di chuyen.',
        status: 'active',
        featured: false,
        images: [
            'https://bizweb.dktcdn.net/100/479/913/products/loa-marshall-emberton-03.jpg?v=1681899764290'
        ],
        tags: ['loa bluetooth', 'marshall', 'emberton', 'portable'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 3990000,
                compareAtPrice: 4590000,
                stock: 16,
                images: [
                    'https://bizweb.dktcdn.net/100/479/913/products/loa-marshall-emberton-03.jpg?v=1681899764290'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Marshall Middleton',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth cao cap, am thanh lon va thiet ke chac chan.',
        description: 'Marshall Middleton mang den am thanh manh me, thiet ke cao cap, phu hop cho nghe nhac trong nha, da ngoai va cac buoi gap go ban be.',
        status: 'active',
        featured: true,
        images: [
            'https://product.hstatic.net/200000730863/product/marshall-middleton-3_2e90ebc6d8cf484a80e59b00ab38108c_master.jpeg'
        ],
        tags: ['loa bluetooth', 'marshall', 'middleton', 'premium'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 7990000,
                compareAtPrice: 8990000,
                stock: 9,
                images: [
                    'https://product.hstatic.net/200000730863/product/marshall-middleton-3_2e90ebc6d8cf484a80e59b00ab38108c_master.jpeg'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Harman Kardon Onyx Studio 8 Champagne',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth cao cap, thiet ke sang trong mau champagne.',
        description: 'Harman Kardon Onyx Studio 8 Champagne co thiet ke hien dai, am thanh can bang, phu hop trang tri phong khach va nghe nhac chat luong cao.',
        status: 'active',
        featured: true,
        images: [
            'https://bizweb.dktcdn.net/100/068/091/products/1-hk-onyx8-champagne-hero-0154-x3-jpg-v-1714967723930.jpg?v=1734687963560'
        ],
        tags: ['loa bluetooth', 'harman kardon', 'onyx', 'premium'],
        variants: [
            {
                attributes: { Color: 'Champagne' },
                price: 5290000,
                compareAtPrice: 6290000,
                stock: 11,
                images: [
                    'https://bizweb.dktcdn.net/100/068/091/products/1-hk-onyx8-champagne-hero-0154-x3-jpg-v-1714967723930.jpg?v=1734687963560'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Harman Kardon Aura Studio 4',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth thiet ke trong suot, am thanh 360 do.',
        description: 'Harman Kardon Aura Studio 4 co thiet ke doc dao, hieu ung anh sang dep, am thanh lan toa 360 do va phu hop khong gian noi that hien dai.',
        status: 'active',
        featured: true,
        images: [
            'https://linhkientot.net/storage/media/7T6b0aHu4D3seVAAbfjqgUlzounA5LgHoRkhUMkL.png'
        ],
        tags: ['loa bluetooth', 'harman kardon', 'aura', '360'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 6290000,
                compareAtPrice: 7490000,
                stock: 13,
                images: [
                    'https://linhkientot.net/storage/media/7T6b0aHu4D3seVAAbfjqgUlzounA5LgHoRkhUMkL.png'
                ],
                isActive: true
            }
        ]
    },
    {
        name: 'Loa Harman Kardon SoundSticks 5',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        shortDescription: 'Loa bluetooth thiet ke doc dao, phu hop khong gian hien dai.',
        description: 'Harman Kardon SoundSticks 5 co thiet ke an tuong, am thanh ro net, phu hop nghe nhac tai nha, ban lam viec va khong gian giai tri cao cap.',
        status: 'active',
        featured: true,
        images: [
            'https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/2162/358201/loa-bluetooth-harman-kardon-soundsticks-5-den-1-638965787029717563-750x500.jpg'
        ],
        tags: ['loa bluetooth', 'harman kardon', 'soundsticks', 'premium'],
        variants: [
            {
                attributes: { Color: 'Black' },
                price: 7990000,
                compareAtPrice: 8990000,
                stock: 7,
                images: [
                    'https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/2162/358201/loa-bluetooth-harman-kardon-soundsticks-5-den-1-638965787029717563-750x500.jpg'
                ],
                isActive: true
            }
        ]
    }
];

const normalizeSkuBase = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

const buildVariantSku = (productName, attributes, index) => {
    const base = normalizeSkuBase(productName).slice(0, 20) || 'PRODUCT';
    const firstAttributeValue = Object.values(attributes || {})[0];
    const suffix = normalizeSkuBase(firstAttributeValue).slice(0, 12) || `VAR${index + 1}`;
    return `${base}-${suffix}`;
};

const createBootstrapAdminUser = async () => {
    const suffix = Date.now();
    const adminUser = await User.create({
        role: 'admin',
        username: `seedadmin${suffix}`,
        email: `seedadmin${suffix}@soundhouse.com`,
        password: `SeedAdmin${suffix}`
    });

    console.log(`Created bootstrap admin user: ${adminUser.email}`);
    return adminUser;
};

const pickAdminUser = async () => {
    const users = await User.find({}, '_id role email username').lean();
    const adminUser = users.find((user) => String(user.role).toLowerCase() === 'admin') || users[0];

    if (!adminUser) {
        return createBootstrapAdminUser();
    }

    return adminUser;
};

const ensureCategory = async (slug, userId) => {
    let category = await Category.findOne({ slug });
    if (category) {
        return category;
    }

    const def = CATEGORY_DEFS[slug];
    if (!def) {
        throw new Error(`Khong co dinh nghia category cho slug: ${slug}`);
    }

    category = await Category.create({
        name: def.name,
        slug,
        description: def.description,
        featured: def.featured,
        order: def.order,
        status: 'active',
        productCount: 0,
        createdBy: userId,
        updatedBy: userId
    });

    return category;
};

const normalizeVariant = (productName, variant, index) => ({
    sku: buildVariantSku(productName, variant.attributes, index),
    attributes: variant.attributes || { PhienBan: `Mac dinh ${index + 1}` },
    price: Number(variant.price),
    compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
    stock: Number(variant.stock || 0),
    images: Array.isArray(variant.images) ? variant.images : [],
    isActive: variant.isActive !== false
});

const buildSeo = (product) => ({
    title: product.name,
    description: product.shortDescription || product.description.slice(0, 150),
    keywords: product.tags || []
});

const PRODUCTS = RAW_PRODUCTS.map((product) => ({
    ...product,
    slug: slugify(product.name, { lower: true, strict: true, trim: true })
}));

const run = async () => {
    if (!MONGO_URI) {
        throw new Error('Thieu MongoDB URI. Hay set MONGO_URI hoac MONGODB_URI.');
    }

    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

    const adminUser = await pickAdminUser();
    const categoryMap = new Map();

    for (const slug of [...new Set(PRODUCTS.map((product) => product.categorySlug))]) {
        const category = await ensureCategory(slug, adminUser._id);
        categoryMap.set(slug, category);
    }

    let inserted = 0;
    let updated = 0;

    for (const product of PRODUCTS) {
        const category = categoryMap.get(product.categorySlug);
        const payload = {
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            brand: product.brand,
            category: category._id,
            variants: product.variants.map((variant, index) => normalizeVariant(product.name, variant, index)),
            images: product.images || [],
            tags: product.tags || [],
            status: product.status || 'active',
            featured: Boolean(product.featured),
            rating: { average: 0, count: 0 },
            seo: buildSeo(product),
            deleted: false,
            deletedAt: null,
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        };

        const existing = await Product.findOne({ slug: product.slug }).lean();
        if (existing) {
            await Product.updateOne({ _id: existing._id }, { $set: payload });
            updated += 1;
        } else {
            await Product.create(payload);
            inserted += 1;
        }
    }

    for (const [slug, category] of categoryMap.entries()) {
        const count = await Product.countDocuments({
            category: category._id,
            status: 'active',
            deleted: { $ne: true }
        });
        await Category.updateOne(
            { _id: category._id },
            { $set: { productCount: count, updatedBy: adminUser._id } }
        );
        console.log(`Category ${slug}: ${count} products`);
    }

    console.log(`Import completed. Inserted: ${inserted}, Updated: ${updated}`);
    console.log(`Products processed: ${PRODUCTS.length}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Import failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exit(1);
});
