import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import env from '../config/env.js';

dotenv.config({ quiet: true });

const MONGO_URI = env.mongodbUri;

const makeVariant = (sku, attributes, price, stock, compareAtPrice = null, imageSeed = sku) => ({
    _id: new mongoose.Types.ObjectId(),
    sku: sku.toUpperCase(),
    attributes,
    price,
    compareAtPrice,
    stock,
    isActive: true,
    images: [`https://picsum.photos/seed/${imageSeed}/800/800`],
    createdAt: new Date(),
    updatedAt: new Date()
});

const CATEGORIES = [
    {
        name: 'Loa Bluetooth',
        slug: 'loa-bluetooth',
        description: 'Cac dong loa bluetooth cao cap cho nhu cau nghe nhac di dong va gia dinh.',
        featured: true,
        order: 1
    },
    {
        name: 'Loa Di Dong',
        slug: 'loa-di-dong',
        description: 'Loa pin sac gon nhe, chong nuoc, phu hop mang theo moi noi.',
        featured: true,
        order: 2
    },
    {
        name: 'Loa Party',
        slug: 'loa-party',
        description: 'Dong loa cong suat lon, bass manh cho su kien va tiec tai gia.',
        featured: true,
        order: 3
    },
    {
        name: 'Loa Soundbar',
        slug: 'loa-soundbar',
        description: 'Soundbar va he thong xem phim giup nang cap trai nghiem giai tri tai gia.',
        featured: true,
        order: 4
    },
    {
        name: 'Loa Thong Minh',
        slug: 'loa-thong-minh',
        description: 'Loa ket noi tro ly ao va he sinh thai nha thong minh.',
        featured: false,
        order: 5
    },
    {
        name: 'Loa Hi-Fi',
        slug: 'loa-hi-fi',
        description: 'Cac mau loa hi-fi va premium audio cho nguoi nghe kho tinh.',
        featured: false,
        order: 6
    }
];

const buildProducts = (catMap, userId) => {
    const now = new Date();

    return [
        {
            name: 'Marshall Emberton II',
            slug: 'marshall-emberton-ii',
            description: 'Loa bluetooth compact voi am thanh 360 do, pin den 30 gio va thiet ke Marshall co dien.',
            shortDescription: 'Loa bluetooth Marshall gon nhe, pin lau, chat am can bang.',
            brand: 'Marshall',
            category: catMap['loa-di-dong'],
            variants: [
                makeVariant('MAR-EMB2-BLACK', { color: 'Black & Brass' }, 4590000, 20, 4990000, 'marshall-emberton-ii-black'),
                makeVariant('MAR-EMB2-CREAM', { color: 'Cream' }, 4590000, 12, 4990000, 'marshall-emberton-ii-cream')
            ],
            images: ['https://picsum.photos/seed/marshall-emberton-ii/800/800'],
            tags: ['loa bluetooth', 'portable', 'marshall', 'premium'],
            status: 'active',
            featured: true,
            rating: { average: 4.8, count: 124 },
            seo: { title: 'Marshall Emberton II', description: 'Loa bluetooth Marshall Emberton II chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Marshall Stanmore III',
            slug: 'marshall-stanmore-iii',
            description: 'Mau loa de ban noi bat voi am thanh rong, bass chac va kha nang ket noi Bluetooth the he moi.',
            shortDescription: 'Loa de ban Marshall cao cap cho phong khach va phong ngu.',
            brand: 'Marshall',
            category: catMap['loa-bluetooth'],
            variants: [
                makeVariant('MAR-STM3-BLACK', { color: 'Black' }, 9490000, 10, 10500000, 'marshall-stanmore-iii-black'),
                makeVariant('MAR-STM3-BROWN', { color: 'Brown' }, 9490000, 6, 10500000, 'marshall-stanmore-iii-brown')
            ],
            images: ['https://picsum.photos/seed/marshall-stanmore-iii/800/800'],
            tags: ['loa bluetooth', 'marshall', 'desktop'],
            status: 'active',
            featured: true,
            rating: { average: 4.7, count: 88 },
            seo: { title: 'Marshall Stanmore III', description: 'Loa Marshall Stanmore III chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Bose SoundLink Flex',
            slug: 'bose-soundlink-flex',
            description: 'Loa portable chong nuoc IP67, am thanh ro va can bang, toi uu cho du lich.',
            shortDescription: 'Loa Bose gon nhe, chong nuoc, de mang di.',
            brand: 'Bose',
            category: catMap['loa-di-dong'],
            variants: [
                makeVariant('BOSE-FLEX-BLACK', { color: 'Black' }, 3190000, 18, 3590000, 'bose-soundlink-flex-black'),
                makeVariant('BOSE-FLEX-WHITE', { color: 'White Smoke' }, 3190000, 10, 3590000, 'bose-soundlink-flex-white')
            ],
            images: ['https://picsum.photos/seed/bose-soundlink-flex/800/800'],
            tags: ['bose', 'portable', 'ip67', 'loa bluetooth'],
            status: 'active',
            featured: true,
            rating: { average: 4.7, count: 91 },
            seo: { title: 'Bose SoundLink Flex', description: 'Loa Bose SoundLink Flex chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Bose Home Speaker 500',
            slug: 'bose-home-speaker-500',
            description: 'Loa thong minh voi am truong rong, thiet ke sang trong va ho tro tro ly ao.',
            shortDescription: 'Loa thong minh Bose cho khong gian song hien dai.',
            brand: 'Bose',
            category: catMap['loa-thong-minh'],
            variants: [
                makeVariant('BOSE-HS500-BLACK', { color: 'Triple Black' }, 9900000, 8, 10990000, 'bose-home-speaker-500-black'),
                makeVariant('BOSE-HS500-SILVER', { color: 'Luxe Silver' }, 9900000, 5, 10990000, 'bose-home-speaker-500-silver')
            ],
            images: ['https://picsum.photos/seed/bose-home-speaker-500/800/800'],
            tags: ['bose', 'smart speaker', 'wifi'],
            status: 'active',
            featured: false,
            rating: { average: 4.6, count: 57 },
            seo: { title: 'Bose Home Speaker 500', description: 'Loa thong minh Bose Home Speaker 500.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'JBL Charge 5',
            slug: 'jbl-charge-5',
            description: 'Loa bluetooth ban chay voi bass manh, sac du phong, chong nuoc IP67.',
            shortDescription: 'JBL Charge 5 pin ben, bass manh, chong nuoc.',
            brand: 'JBL',
            category: catMap['loa-di-dong'],
            variants: [
                makeVariant('JBL-CHARGE5-BLACK', { color: 'Black' }, 3590000, 25, 3990000, 'jbl-charge-5-black'),
                makeVariant('JBL-CHARGE5-BLUE', { color: 'Blue' }, 3590000, 14, 3990000, 'jbl-charge-5-blue')
            ],
            images: ['https://picsum.photos/seed/jbl-charge-5/800/800'],
            tags: ['jbl', 'portable', 'charge', 'ip67'],
            status: 'active',
            featured: true,
            rating: { average: 4.8, count: 146 },
            seo: { title: 'JBL Charge 5', description: 'Loa bluetooth JBL Charge 5 chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'JBL PartyBox 310',
            slug: 'jbl-partybox-310',
            description: 'Loa party cong suat lon, den LED dong bo nhac va banh xe keo tien dung.',
            shortDescription: 'Loa party JBL cho su kien va tiec tai gia.',
            brand: 'JBL',
            category: catMap['loa-party'],
            variants: [
                makeVariant('JBL-PB310-BLACK', { color: 'Black' }, 13500000, 7, 15000000, 'jbl-partybox-310-black')
            ],
            images: ['https://picsum.photos/seed/jbl-partybox-310/800/800'],
            tags: ['jbl', 'partybox', 'party speaker'],
            status: 'active',
            featured: true,
            rating: { average: 4.6, count: 56 },
            seo: { title: 'JBL PartyBox 310', description: 'Loa JBL PartyBox 310 chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Sony SRS-XG300',
            slug: 'sony-srs-xg300',
            description: 'Loa di dong X-Series voi bass sau, tay xach thong minh va thoi luong pin den 25 gio.',
            shortDescription: 'Loa Sony portable cho nhu cau ngoai troi va gia dinh.',
            brand: 'Sony',
            category: catMap['loa-di-dong'],
            variants: [
                makeVariant('SONY-XG300-BLACK', { color: 'Black' }, 5990000, 9, 6690000, 'sony-srs-xg300-black'),
                makeVariant('SONY-XG300-LIGHT', { color: 'Light Gray' }, 5990000, 5, 6690000, 'sony-srs-xg300-light')
            ],
            images: ['https://picsum.photos/seed/sony-srs-xg300/800/800'],
            tags: ['sony', 'portable', 'x-series'],
            status: 'active',
            featured: false,
            rating: { average: 4.5, count: 42 },
            seo: { title: 'Sony SRS-XG300', description: 'Loa Sony SRS-XG300 chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Sony HT-A3000',
            slug: 'sony-ht-a3000',
            description: 'Soundbar Dolby Atmos cho phong khach hien dai, ket noi TV Sony BRAVIA de dang.',
            shortDescription: 'Soundbar Sony Dolby Atmos gon dep va manh me.',
            brand: 'Sony',
            category: catMap['loa-soundbar'],
            variants: [
                makeVariant('SONY-HTA3000-BLACK', { color: 'Black' }, 12990000, 6, 14500000, 'sony-ht-a3000-black')
            ],
            images: ['https://picsum.photos/seed/sony-ht-a3000/800/800'],
            tags: ['sony', 'soundbar', 'dolby atmos'],
            status: 'active',
            featured: false,
            rating: { average: 4.6, count: 39 },
            seo: { title: 'Sony HT-A3000', description: 'Soundbar Sony HT-A3000 chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Harman Kardon Onyx Studio 8',
            slug: 'harman-kardon-onyx-studio-8',
            description: 'Loa bluetooth premium voi thiet ke bieu tuong, am thanh can bang va phong cach decor hien dai.',
            shortDescription: 'Loa Harman Kardon sang trong cho phong khach.',
            brand: 'Harman Kardon',
            category: catMap['loa-bluetooth'],
            variants: [
                makeVariant('HK-ONYX8-BLUE', { color: 'Blue' }, 6490000, 8, 6990000, 'harman-kardon-onyx-studio-8-blue'),
                makeVariant('HK-ONYX8-BLACK', { color: 'Black' }, 6490000, 7, 6990000, 'harman-kardon-onyx-studio-8-black')
            ],
            images: ['https://picsum.photos/seed/harman-kardon-onyx-studio-8/800/800'],
            tags: ['harman kardon', 'premium speaker', 'bluetooth'],
            status: 'active',
            featured: true,
            rating: { average: 4.7, count: 77 },
            seo: { title: 'Harman Kardon Onyx Studio 8', description: 'Loa Harman Kardon Onyx Studio 8.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Bang & Olufsen Beosound A1 Gen 2',
            slug: 'bang-olufsen-beosound-a1-gen-2',
            description: 'Loa mini cao cap, chong nuoc, vat lieu nhom cao cap va chat am tinh te.',
            shortDescription: 'Loa portable B&O cao cap, thiet ke toi gian.',
            brand: 'Bang & Olufsen',
            category: catMap['loa-di-dong'],
            variants: [
                makeVariant('BO-A1-GREY', { color: 'Grey Mist' }, 8500000, 6, 9200000, 'bang-olufsen-beosound-a1-grey'),
                makeVariant('BO-A1-GREEN', { color: 'Green' }, 8500000, 4, 9200000, 'bang-olufsen-beosound-a1-green')
            ],
            images: ['https://picsum.photos/seed/bang-olufsen-beosound-a1/800/800'],
            tags: ['bang olufsen', 'portable', 'premium'],
            status: 'active',
            featured: false,
            rating: { average: 4.5, count: 31 },
            seo: { title: 'B&O Beosound A1 Gen 2', description: 'Loa Bang & Olufsen Beosound A1 Gen 2.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Sonos Era 100',
            slug: 'sonos-era-100',
            description: 'Loa wifi thong minh cho he sinh thai Sonos, ket noi app de mo rong multi-room.',
            shortDescription: 'Loa Sonos all-in-one cho nha thong minh.',
            brand: 'Sonos',
            category: catMap['loa-thong-minh'],
            variants: [
                makeVariant('SONOS-ERA100-WHITE', { color: 'White' }, 7490000, 11, 7990000, 'sonos-era-100-white'),
                makeVariant('SONOS-ERA100-BLACK', { color: 'Black' }, 7490000, 10, 7990000, 'sonos-era-100-black')
            ],
            images: ['https://picsum.photos/seed/sonos-era-100/800/800'],
            tags: ['sonos', 'smart speaker', 'wifi', 'multi-room'],
            status: 'active',
            featured: true,
            rating: { average: 4.7, count: 63 },
            seo: { title: 'Sonos Era 100', description: 'Loa Sonos Era 100 chinh hang.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Sonos Beam Gen 2',
            slug: 'sonos-beam-gen-2',
            description: 'Soundbar nho gon ho tro Dolby Atmos, de dang ghep voi he sinh thai Sonos.',
            shortDescription: 'Soundbar Sonos Beam Gen 2 cho chung cu va phong khach.',
            brand: 'Sonos',
            category: catMap['loa-soundbar'],
            variants: [
                makeVariant('SONOS-BEAM2-BLACK', { color: 'Black' }, 11990000, 7, 12990000, 'sonos-beam-gen-2-black'),
                makeVariant('SONOS-BEAM2-WHITE', { color: 'White' }, 11990000, 5, 12990000, 'sonos-beam-gen-2-white')
            ],
            images: ['https://picsum.photos/seed/sonos-beam-gen-2/800/800'],
            tags: ['sonos', 'soundbar', 'dolby atmos'],
            status: 'active',
            featured: false,
            rating: { average: 4.8, count: 45 },
            seo: { title: 'Sonos Beam Gen 2', description: 'Soundbar Sonos Beam Gen 2.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Samsung HW-Q990C',
            slug: 'samsung-hw-q990c',
            description: 'He thong soundbar flagship 11.1.4 cho trai nghiem phim anh va game cao cap.',
            shortDescription: 'Flagship soundbar Samsung cho home theater.',
            brand: 'Samsung',
            category: catMap['loa-soundbar'],
            variants: [
                makeVariant('SS-Q990C-BLACK', { color: 'Black' }, 22990000, 4, 25990000, 'samsung-hw-q990c-black')
            ],
            images: ['https://picsum.photos/seed/samsung-hw-q990c/800/800'],
            tags: ['samsung', 'soundbar', 'home theater'],
            status: 'active',
            featured: true,
            rating: { average: 4.8, count: 41 },
            seo: { title: 'Samsung HW-Q990C', description: 'Soundbar Samsung HW-Q990C cao cap.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'LG XBoom 360 XO3',
            slug: 'lg-xboom-360-xo3',
            description: 'Loa 360 do voi den ambient va thiet ke trang tri noi that hien dai.',
            shortDescription: 'Loa LG 360 do cho khong gian song va tiec nho.',
            brand: 'LG',
            category: catMap['loa-bluetooth'],
            variants: [
                makeVariant('LG-XO3-BEIGE', { color: 'Beige' }, 4990000, 9, 5590000, 'lg-xboom-360-xo3-beige'),
                makeVariant('LG-XO3-BLACK', { color: 'Black' }, 4990000, 7, 5590000, 'lg-xboom-360-xo3-black')
            ],
            images: ['https://picsum.photos/seed/lg-xboom-360-xo3/800/800'],
            tags: ['lg', '360 speaker', 'bluetooth'],
            status: 'active',
            featured: false,
            rating: { average: 4.4, count: 28 },
            seo: { title: 'LG XBoom 360 XO3', description: 'Loa LG XBoom 360 XO3.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Apple HomePod 2',
            slug: 'apple-homepod-2',
            description: 'Loa thong minh cao cap danh cho he sinh thai Apple, tai hien giong noi va am thanh chi tiet.',
            shortDescription: 'HomePod the he moi cho nguoi dung Apple.',
            brand: 'Apple',
            category: catMap['loa-thong-minh'],
            variants: [
                makeVariant('APPLE-HP2-WHITE', { color: 'White' }, 8290000, 8, 8990000, 'apple-homepod-2-white'),
                makeVariant('APPLE-HP2-MIDNIGHT', { color: 'Midnight' }, 8290000, 8, 8990000, 'apple-homepod-2-midnight')
            ],
            images: ['https://picsum.photos/seed/apple-homepod-2/800/800'],
            tags: ['apple', 'homepod', 'smart speaker'],
            status: 'active',
            featured: true,
            rating: { average: 4.7, count: 69 },
            seo: { title: 'Apple HomePod 2', description: 'Loa thong minh Apple HomePod 2.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Devialet Mania',
            slug: 'devialet-mania',
            description: 'Loa portable hi-end voi cong nghe am thanh doc quyen, thiet ke sang trong va tinh di dong cao.',
            shortDescription: 'Loa portable hi-end Devialet cho gioi yeu audio.',
            brand: 'Devialet',
            category: catMap['loa-hi-fi'],
            variants: [
                makeVariant('DEV-MANIA-LIGHT', { color: 'Light Grey' }, 23900000, 3, 25900000, 'devialet-mania-light'),
                makeVariant('DEV-MANIA-BLACK', { color: 'Black' }, 23900000, 2, 25900000, 'devialet-mania-black')
            ],
            images: ['https://picsum.photos/seed/devialet-mania/800/800'],
            tags: ['devialet', 'hi-fi', 'premium speaker'],
            status: 'active',
            featured: false,
            rating: { average: 4.9, count: 18 },
            seo: { title: 'Devialet Mania', description: 'Loa hi-end Devialet Mania.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Klipsch The One Plus',
            slug: 'klipsch-the-one-plus',
            description: 'Loa desktop mang phong cach retro, am thanh dynamic va day chi tiet.',
            shortDescription: 'Loa Klipsch de ban phong cach co dien.',
            brand: 'Klipsch',
            category: catMap['loa-hi-fi'],
            variants: [
                makeVariant('KLP-ONEP-WALNUT', { color: 'Walnut' }, 9990000, 5, 10990000, 'klipsch-the-one-plus-walnut')
            ],
            images: ['https://picsum.photos/seed/klipsch-the-one-plus/800/800'],
            tags: ['klipsch', 'desktop speaker', 'retro'],
            status: 'active',
            featured: false,
            rating: { average: 4.6, count: 22 },
            seo: { title: 'Klipsch The One Plus', description: 'Loa Klipsch The One Plus.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        },
        {
            name: 'Ultimate Ears Hyperboom',
            slug: 'ultimate-ears-hyperboom',
            description: 'Loa portable cong suat lon, phu hop cho tiec ngoai troi va khong gian rong.',
            shortDescription: 'Loa Ultimate Ears cho tiec va su kien.',
            brand: 'Ultimate Ears',
            category: catMap['loa-party'],
            variants: [
                makeVariant('UE-HYPERBOOM-BLACK', { color: 'Black' }, 10990000, 5, 11990000, 'ultimate-ears-hyperboom-black')
            ],
            images: ['https://picsum.photos/seed/ultimate-ears-hyperboom/800/800'],
            tags: ['ultimate ears', 'party', 'portable'],
            status: 'active',
            featured: false,
            rating: { average: 4.7, count: 34 },
            seo: { title: 'Ultimate Ears Hyperboom', description: 'Loa Ultimate Ears Hyperboom.' },
            createdBy: userId,
            updatedBy: null,
            createdAt: now,
            updatedAt: now
        }
    ];
};

async function seed() {
    console.log('Starting SoundHouse speaker seeder...');

    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000
    });

    const db = mongoose.connection.db;
    const usersCol = db.collection('users');
    const categoriesCol = db.collection('categories');
    const productsCol = db.collection('products');
    const reviewsCol = db.collection('reviews');

    let adminUser = await usersCol.findOne({ username: 'admin' });
    let userId;

    if (!adminUser) {
        const hashed = await bcrypt.hash('Admin123', 12);
        const result = await usersCol.insertOne({
            username: 'admin',
            email: 'admin@example.com',
            password: hashed,
            role: 'admin',
            isActive: true,
            refreshTokens: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        userId = result.insertedId;
        console.log('Created admin user: admin / Admin123');
    } else {
        userId = adminUser._id;
        if (adminUser.role !== 'admin') {
            await usersCol.updateOne(
                { _id: adminUser._id },
                { $set: { role: 'admin', updatedAt: new Date() } }
            );
        }
        console.log('Admin user already exists');
    }

    await productsCol.deleteMany({});
    await reviewsCol.deleteMany({});
    await categoriesCol.deleteMany({});
    console.log('Cleared existing products, reviews, and categories');

    const catMap = {};
    for (const category of CATEGORIES) {
        const result = await categoriesCol.insertOne({
            ...category,
            status: 'active',
            image: `https://picsum.photos/seed/${category.slug}/800/800`,
            icon: 'speaker',
            seo: {
                title: category.name,
                description: category.description,
                keywords: [category.slug, 'soundhouse', 'loa']
            },
            productCount: 0,
            parent: null,
            createdBy: userId,
            updatedBy: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        catMap[category.slug] = result.insertedId;
    }
    console.log(`Created ${CATEGORIES.length} audio categories`);

    const products = buildProducts(catMap, userId);
    await productsCol.insertMany(products);
    console.log(`Created ${products.length} speaker products`);

    for (const category of CATEGORIES) {
        const productCount = products.filter((product) => String(product.category) === String(catMap[category.slug])).length;
        await categoriesCol.updateOne(
            { _id: catMap[category.slug] },
            { $set: { productCount } }
        );
    }

    console.log('SoundHouse speaker seed completed');
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(async (error) => {
    console.error('Seeder failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch {}
    process.exit(1);
});
