import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
    },
    'loa-soundbar': {
        name: 'Loa Soundbar',
        description: 'Soundbar va he thong giai tri nang cap trai nghiem xem phim tai nha.',
        featured: true,
        order: 4
    },
    'loa-thong-minh': {
        name: 'Loa Thong Minh',
        description: 'Loa ket noi tro ly ao va he sinh thai nha thong minh.',
        featured: false,
        order: 5
    }
};

const PRODUCTS = [
    {
        name: 'Harman Kardon Go + Play 3',
        slug: 'harman-kardon-go-play-3',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth cao cap voi am thanh manh me, thiet ke bieu tuong va pin ben bi cho nhu cau giai tri tai gia va di dong.',
        shortDescription: 'Loa Bluetooth cao cap, am thanh manh me.',
        images: ['https://bizweb.dktcdn.net/thumb/1024x1024/100/451/485/products/go-play-3-2.jpg?v=1768363077667'],
        tags: ['harman kardon', 'bluetooth speaker', 'portable', 'premium'],
        status: 'active',
        featured: true,
        rating: { average: 4.8, count: 64 },
        variants: [
            {
                sku: 'HK-GOPLAY3-BLACK',
                attributes: { color: 'Black' },
                price: 8900000,
                compareAtPrice: 9900000,
                stock: 12,
                images: ['https://bizweb.dktcdn.net/thumb/1024x1024/100/451/485/products/go-play-3-2.jpg?v=1768363077667'],
                weight: 4900,
                barcode: '893100000001',
                isActive: true
            }
        ]
    },
    {
        name: 'Harman Kardon Aura Studio 4',
        slug: 'harman-kardon-aura-studio-4',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth thiet ke trong suot an tuong, phu hop khong gian hien dai va trai nghiem nghe nhac cao cap.',
        shortDescription: 'Loa Bluetooth thiet ke trong suot, cao cap.',
        images: ['https://bizweb.dktcdn.net/100/451/485/products/loa-bluetooth-harman-kardon-aura-studio-4-467fd76f-19e9-47ea-be66-9e8464bb918f.jpg?v=1710391697153'],
        tags: ['harman kardon', 'aura studio 4', 'bluetooth speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.7, count: 45 },
        variants: [
            {
                sku: 'HK-AURASTUDIO4-BLACK',
                attributes: { color: 'Black' },
                price: 6990000,
                compareAtPrice: 7990000,
                stock: 9,
                images: ['https://bizweb.dktcdn.net/100/451/485/products/loa-bluetooth-harman-kardon-aura-studio-4-467fd76f-19e9-47ea-be66-9e8464bb918f.jpg?v=1710391697153'],
                weight: 3600,
                barcode: '893100000002',
                isActive: true
            }
        ]
    },
    {
        name: 'Harman Kardon Go + Play Mini 4',
        slug: 'harman-kardon-go-play-mini-4',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        description: 'Phien ban gon hon cua dong Go + Play voi thiet ke sang trong va am thanh can bang.',
        shortDescription: 'Loa Bluetooth gon nhe, sang trong.',
        images: ['https://scenter.com.vn/wp-content/uploads/2024/12/bluetooth-harman-kardon-go-play-mini-4-org.png'],
        tags: ['harman kardon', 'go play mini 4', 'portable speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.6, count: 28 },
        variants: [
            {
                sku: 'HK-GOPLAYMINI4-BLACK',
                attributes: { color: 'Black' },
                price: 6490000,
                compareAtPrice: 7290000,
                stock: 7,
                images: ['https://scenter.com.vn/wp-content/uploads/2024/12/bluetooth-harman-kardon-go-play-mini-4-org.png'],
                weight: 3200,
                barcode: '893100000003',
                isActive: true
            }
        ]
    },
    {
        name: 'Harman Kardon Onyx Studio 8',
        slug: 'harman-kardon-onyx-studio-8',
        brand: 'Harman Kardon',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth thiet ke cao cap, phu hop phong khach va khong gian nghe nhac hien dai.',
        shortDescription: 'Loa Bluetooth cao cap cho phong khach.',
        images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-harman-kardon-onyx-studio-8-3.jpg'],
        tags: ['harman kardon', 'onyx studio 8', 'premium speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.8, count: 91 },
        variants: [
            {
                sku: 'HK-ONYX8-BLACK',
                attributes: { color: 'Black' },
                price: 7590000,
                compareAtPrice: 8990000,
                stock: 10,
                images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-harman-kardon-onyx-studio-8-3.jpg'],
                weight: 3500,
                barcode: '893100000004',
                isActive: true
            }
        ]
    },
    {
        name: 'JBL Flip 7',
        slug: 'jbl-flip-7',
        brand: 'JBL',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth di dong chong nuoc, phu hop du lich va hoat dong ngoai troi.',
        shortDescription: 'Loa Bluetooth di dong chong nuoc.',
        images: ['https://cdn2.cellphones.com.vn/358x/media/catalog/product/l/o/loa-bluetooth-jbl-flip-7_23__1.png'],
        tags: ['jbl', 'flip 7', 'portable speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.5, count: 37 },
        variants: [
            {
                sku: 'JBL-FLIP7-BLACK',
                attributes: { color: 'Black' },
                price: 3290000,
                compareAtPrice: 3790000,
                stock: 16,
                images: ['https://cdn2.cellphones.com.vn/358x/media/catalog/product/l/o/loa-bluetooth-jbl-flip-7_23__1.png'],
                weight: 800,
                barcode: '893100000005',
                isActive: true
            }
        ]
    },
    {
        name: 'JBL Boombox 3',
        slug: 'jbl-boombox-3',
        brand: 'JBL',
        categorySlug: 'loa-bluetooth',
        description: 'Loa cong suat lon, am bass manh, phu hop tiec ngoai troi va nhu cau giai tri cong suat cao.',
        shortDescription: 'Loa cong suat lon, bass manh.',
        images: ['https://thienhaaudio.vn/wp-content/uploads/2022/09/JBL_boombox_3-01-768x768.jpg'],
        tags: ['jbl', 'boombox 3', 'party speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.8, count: 73 },
        variants: [
            {
                sku: 'JBL-BOOMBOX3-BLACK',
                attributes: { color: 'Black' },
                price: 10990000,
                compareAtPrice: 11990000,
                stock: 5,
                images: ['https://thienhaaudio.vn/wp-content/uploads/2022/09/JBL_boombox_3-01-768x768.jpg'],
                weight: 6700,
                barcode: '893100000006',
                isActive: true
            }
        ]
    },
    {
        name: 'JBL PartyBox Stage 320',
        slug: 'jbl-partybox-stage-320',
        brand: 'JBL',
        categorySlug: 'loa-karaoke',
        description: 'Loa party cong suat lon, phu hop karaoke va su kien nho tai nha.',
        shortDescription: 'Loa party, karaoke, cong suat lon.',
        images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-partybox-stage-320_1_.png'],
        tags: ['jbl', 'partybox', 'karaoke', 'party speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.9, count: 54 },
        variants: [
            {
                sku: 'JBL-PARTYBOX320-BLACK',
                attributes: { color: 'Black' },
                price: 13990000,
                compareAtPrice: 14990000,
                stock: 6,
                images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-partybox-stage-320_1_.png'],
                weight: 16500,
                barcode: '893100000007',
                isActive: true
            }
        ]
    },
    {
        name: 'JBL Go 4',
        slug: 'jbl-go-4',
        brand: 'JBL',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth mini nho gon, phu hop nghe nhac ca nhan va mang di hang ngay.',
        shortDescription: 'Loa mini nho gon, de mang theo.',
        images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-go-4-1_3_.png'],
        tags: ['jbl', 'go 4', 'mini speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.4, count: 22 },
        variants: [
            {
                sku: 'JBL-GO4-BLACK',
                attributes: { color: 'Black' },
                price: 1190000,
                compareAtPrice: 1490000,
                stock: 20,
                images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-jbl-go-4-1_3_.png'],
                weight: 250,
                barcode: '893100000008',
                isActive: true
            }
        ]
    },
    {
        name: 'Marshall Stanmore III',
        slug: 'marshall-stanmore-iii',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        description: 'Loa gia dinh phong cach co dien, am thanh day dan va thiet ke dac trung cua Marshall.',
        shortDescription: 'Loa gia dinh phong cach co dien.',
        images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/marshall_stanmore_iii_5.png'],
        tags: ['marshall', 'stanmore iii', 'home speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.8, count: 88 },
        variants: [
            {
                sku: 'MARSHALL-STANMORE3-BLACK',
                attributes: { color: 'Black' },
                price: 10990000,
                compareAtPrice: 11990000,
                stock: 8,
                images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/m/a/marshall_stanmore_iii_5.png'],
                weight: 4250,
                barcode: '893100000009',
                isActive: true
            }
        ]
    },
    {
        name: 'Marshall Emberton II',
        slug: 'marshall-emberton-ii',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth di dong voi thiet ke sang trong, pin lau va chat am dac trung Marshall.',
        shortDescription: 'Loa di dong premium cua Marshall.',
        images: ['https://scenter.com.vn/wp-content/uploads/2022/12/marshall-emberton-ii-black-brass-01-1.png'],
        tags: ['marshall', 'emberton ii', 'portable speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.7, count: 128 },
        variants: [
            {
                sku: 'MARSHALL-EMBERTON2-BLACK',
                attributes: { color: 'Black Brass' },
                price: 4590000,
                compareAtPrice: 4990000,
                stock: 14,
                images: ['https://scenter.com.vn/wp-content/uploads/2022/12/marshall-emberton-ii-black-brass-01-1.png'],
                weight: 700,
                barcode: '893100000010',
                isActive: true
            }
        ]
    },
    {
        name: 'Marshall Kilburn II',
        slug: 'marshall-kilburn-ii',
        brand: 'Marshall',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth xach tay voi quai cam, chat am manh me va phong cach co dien.',
        shortDescription: 'Loa xach tay phong cach co dien.',
        images: ['https://down-vn.img.susercontent.com/file/b47add3c180956868cfda16886655b0c@resize_w900_nl.webp'],
        tags: ['marshall', 'kilburn ii', 'portable speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.6, count: 31 },
        variants: [
            {
                sku: 'MARSHALL-KILBURN2-BLACK',
                attributes: { color: 'Black' },
                price: 7990000,
                compareAtPrice: 8990000,
                stock: 6,
                images: ['https://down-vn.img.susercontent.com/file/b47add3c180956868cfda16886655b0c@resize_w900_nl.webp'],
                weight: 2500,
                barcode: '893100000011',
                isActive: true
            }
        ]
    },
    {
        name: 'Bose SoundLink Max',
        slug: 'bose-soundlink-max',
        brand: 'Bose',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Bluetooth cao cap cua Bose, am thanh lon, can bang va phu hop giai tri di dong.',
        shortDescription: 'Loa Bluetooth Bose am thanh lon.',
        images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-bose-soundlink-max_3_.png'],
        tags: ['bose', 'soundlink max', 'portable speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.8, count: 42 },
        variants: [
            {
                sku: 'BOSE-SOUNDLINKMAX-BLACK',
                attributes: { color: 'Black' },
                price: 9990000,
                compareAtPrice: 10990000,
                stock: 9,
                images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/l/o/loa-bluetooth-bose-soundlink-max_3_.png'],
                weight: 2200,
                barcode: '893100000012',
                isActive: true
            }
        ]
    },
    {
        name: 'Bose SoundLink Home',
        slug: 'bose-soundlink-home',
        brand: 'Bose',
        categorySlug: 'loa-bluetooth',
        description: 'Loa khong day phong cach toi gian, phu hop khong gian song hien dai.',
        shortDescription: 'Loa khong day danh cho khong gian song.',
        images: ['https://antien.vn/files/styles/pslide/public/products/photos/2025/02/14/loa-bose-soundlink-home-den-chinh-hang.jpg?itok=6hK37HpQ'],
        tags: ['bose', 'soundlink home', 'home speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.5, count: 19 },
        variants: [
            {
                sku: 'BOSE-SOUNDLINKHOME-BLACK',
                attributes: { color: 'Black' },
                price: 6990000,
                compareAtPrice: 7590000,
                stock: 7,
                images: ['https://antien.vn/files/styles/pslide/public/products/photos/2025/02/14/loa-bose-soundlink-home-den-chinh-hang.jpg?itok=6hK37HpQ'],
                weight: 1500,
                barcode: '893100000013',
                isActive: true
            }
        ]
    },
    {
        name: 'Sony Ult Field 7',
        slug: 'sony-ult-field-7',
        brand: 'Sony',
        categorySlug: 'loa-bluetooth',
        description: 'Loa Sony cho nhu cau nghe nhac ngoai troi voi thiet ke hien dai va cong nghe am thanh manh me.',
        shortDescription: 'Loa Sony cho ngoai troi va di dong.',
        images: ['https://sony.scene7.com/is/image/sonyglobalsolutions/Product-Intro-4-M-6?$productIntroPlatemobile$&fmt=png-alpha'],
        tags: ['sony', 'bluetooth speaker', 'portable speaker'],
        status: 'active',
        featured: false,
        rating: { average: 4.4, count: 17 },
        variants: [
            {
                sku: 'SONY-ULTFIELD7-BLACK',
                attributes: { color: 'Black' },
                price: 8490000,
                compareAtPrice: 8990000,
                stock: 5,
                images: ['https://sony.scene7.com/is/image/sonyglobalsolutions/Product-Intro-4-M-6?$productIntroPlatemobile$&fmt=png-alpha'],
                weight: 3200,
                barcode: '893100000014',
                isActive: true
            }
        ]
    },
    {
        name: 'Sony SRS-XV900',
        slug: 'sony-srs-xv900',
        brand: 'Sony',
        categorySlug: 'loa-karaoke',
        description: 'Loa cong suat lon cua Sony, phu hop tiec, su kien va khong gian giai tri rong.',
        shortDescription: 'Loa party cong suat lon cua Sony.',
        images: ['https://sony.scene7.com/is/image/sonyglobalsolutions/SRS-XV900_hero_mobile?$productIntroPlatemobile$'],
        tags: ['sony', 'srs-xv900', 'party speaker'],
        status: 'active',
        featured: true,
        rating: { average: 4.7, count: 26 },
        variants: [
            {
                sku: 'SONY-SRSXV900-BLACK',
                attributes: { color: 'Black' },
                price: 18990000,
                compareAtPrice: 20990000,
                stock: 4,
                images: ['https://sony.scene7.com/is/image/sonyglobalsolutions/SRS-XV900_hero_mobile?$productIntroPlatemobile$'],
                weight: 26000,
                barcode: '893100000015',
                isActive: true
            }
        ]
    }
];

const pickAdminUser = async () => {
    const users = await User.find({}, '_id role email username').lean();
    const adminUser = users.find((user) => String(user.role).toLowerCase() === 'admin') || users[0];

    if (!adminUser) {
        throw new Error('Khong tim thay user nao de gan createdBy cho product.');
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

const normalizeVariant = (variant) => ({
    sku: String(variant.sku).trim().toUpperCase(),
    attributes: variant.attributes || {},
    price: Number(variant.price),
    compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
    stock: Number(variant.stock || 0),
    images: Array.isArray(variant.images) ? variant.images : [],
    weight: variant.weight ? Number(variant.weight) : undefined,
    barcode: variant.barcode || undefined,
    isActive: variant.isActive !== false
});

const buildSeo = (product) => ({
    title: product.name,
    description: product.shortDescription || product.description.slice(0, 150),
    keywords: product.tags || []
});

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
            variants: product.variants.map(normalizeVariant),
            images: product.images || [],
            tags: product.tags || [],
            status: product.status || 'active',
            featured: Boolean(product.featured),
            rating: product.rating || { average: 0, count: 0 },
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
        await Category.updateOne({ _id: category._id }, { $set: { productCount: count, updatedBy: adminUser._id } });
        console.log(`Category ${slug}: ${count} products`);
    }

    console.log(`Import completed. Inserted: ${inserted}, Updated: ${updated}`);
    console.log(`Products processed: ${PRODUCTS.length}`);
    console.log(`createdBy user: ${adminUser.email}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Import failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exit(1);
});
