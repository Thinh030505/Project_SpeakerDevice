import mongoose from 'mongoose';
import { env } from './env.js';
import { logError, logInfo, logWarn } from '../utils/logger.js';

let listenersRegistered = false;
let lastDatabaseError = null;

const getDatabaseStatus = () => ({
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    lastError: lastDatabaseError,
    skipped: env.skipExternalServices
});

const registerConnectionListeners = () => {
    if (listenersRegistered) {
        return;
    }

    listenersRegistered = true;

    mongoose.connection.on('connected', () => {
        lastDatabaseError = null;
        logInfo(`MongoDB connected: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('disconnected', () => {
        logWarn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
        lastDatabaseError = null;
        logInfo('MongoDB reconnected');
    });

    mongoose.connection.on('error', (error) => {
        lastDatabaseError = error.message;
        logError('MongoDB runtime error:', error.message);
    });
};

const connectDB = async () => {
    if (env.skipExternalServices) {
        lastDatabaseError = null;
        logInfo('Skipping MongoDB connection because SKIP_EXTERNAL_SERVICES is enabled.');
        return false;
    }

    registerConnectionListeners();

    try {
        await mongoose.connect(env.mongodbUri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        lastDatabaseError = null;
        return true;
    } catch (error) {
        lastDatabaseError = error.message;
        logError('MongoDB connection error:', error.message);
        return false;
    }
};

export const isDatabaseConnected = () => env.skipExternalServices || mongoose.connection.readyState === 1;
export { getDatabaseStatus };
export default connectDB;
