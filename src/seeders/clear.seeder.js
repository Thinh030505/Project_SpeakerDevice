import mongoose from 'mongoose';
import dotenv from 'dotenv';
import env from '../config/env.js';

dotenv.config({ quiet: true });

async function clear() {
    if (!env.mongodbUri) {
        throw new Error('Thieu MongoDB URI. Hay set MONGO_URI hoac MONGODB_URI.');
    }

    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    await db.collection('products').deleteMany({});
    await db.collection('categories').deleteMany({});
    console.log('✅ Cleared products and categories');
    await mongoose.disconnect();
    process.exit(0);
}

clear().catch(err => { console.error(err.message); process.exit(1); });
