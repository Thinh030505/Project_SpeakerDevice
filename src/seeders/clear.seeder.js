import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

async function clear() {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    await db.collection('products').deleteMany({});
    await db.collection('categories').deleteMany({});
    console.log('✅ Cleared products and categories');
    await mongoose.disconnect();
    process.exit(0);
}

clear().catch(err => { console.error(err.message); process.exit(1); });
