import dotenv from 'dotenv';
import mongoose from 'mongoose';
import slugify from 'slugify';
import Product from '../models/Product.js';
import env from '../config/env.js';
import cloudinary from '../config/cloudinary.js';

dotenv.config({ quiet: true });

const MONGO_URI = env.mongodbUri;

const isCloudinaryUrl = (url) => String(url || '').includes('res.cloudinary.com');

const uploadRemoteImage = async (url, folder, publicId) => {
    const result = await cloudinary.uploader.upload(url, {
        folder,
        public_id: publicId,
        overwrite: false,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
    });

    return result.secure_url;
};

const run = async () => {
    if (!MONGO_URI) {
        throw new Error('Thieu MongoDB URI. Hay set MONGO_URI hoac MONGODB_URI.');
    }

    if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
        throw new Error('Thieu cau hinh Cloudinary trong .env');
    }

    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

    const products = await Product.find({ deleted: { $ne: true } });
    const cache = new Map();
    let uploadedCount = 0;
    let updatedProducts = 0;

    for (const product of products) {
        let changed = false;
        const productSlug = slugify(product.slug || product.name || String(product._id), { lower: true, strict: true, trim: true });

        const nextImages = [];
        for (let i = 0; i < (product.images || []).length; i += 1) {
            const imageUrl = product.images[i];
            if (!imageUrl || isCloudinaryUrl(imageUrl)) {
                nextImages.push(imageUrl);
                continue;
            }

            if (!cache.has(imageUrl)) {
                const uploadedUrl = await uploadRemoteImage(
                    imageUrl,
                    `product-images/${productSlug}`,
                    `${productSlug}-main-${i + 1}`
                );
                cache.set(imageUrl, uploadedUrl);
                uploadedCount += 1;
            }

            nextImages.push(cache.get(imageUrl));
            changed = true;
        }
        product.images = nextImages;

        for (let variantIndex = 0; variantIndex < (product.variants || []).length; variantIndex += 1) {
            const variant = product.variants[variantIndex];
            const nextVariantImages = [];

            for (let imageIndex = 0; imageIndex < (variant.images || []).length; imageIndex += 1) {
                const imageUrl = variant.images[imageIndex];
                if (!imageUrl || isCloudinaryUrl(imageUrl)) {
                    nextVariantImages.push(imageUrl);
                    continue;
                }

                if (!cache.has(imageUrl)) {
                    const uploadedUrl = await uploadRemoteImage(
                        imageUrl,
                        `product-images/${productSlug}/variants`,
                        `${productSlug}-variant-${variantIndex + 1}-${imageIndex + 1}`
                    );
                    cache.set(imageUrl, uploadedUrl);
                    uploadedCount += 1;
                }

                nextVariantImages.push(cache.get(imageUrl));
                changed = true;
            }

            variant.images = nextVariantImages;
        }

        if (changed) {
            product.updatedAt = new Date();
            await product.save();
            updatedProducts += 1;
            console.log(`Updated product images: ${product.name}`);
        }
    }

    console.log(`Migration completed. Products updated: ${updatedProducts}, remote uploads: ${uploadedCount}`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Cloudinary migration failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exit(1);
});
