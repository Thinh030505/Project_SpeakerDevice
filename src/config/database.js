import mongoose from 'mongoose';
import { env, getMongoEnvKeys, isValidMongoUri, maskMongoUri } from './env.js';
import { logError, logInfo, logWarn } from '../utils/logger.js';

let listenersRegistered = false;
let lastDatabaseError = null;
let connectPromise = null;

const getMongoUriPreview = () => {
    if (!env.mongodbUri) {
        return '';
    }

    return maskMongoUri(env.mongodbUri);
};

const getDatabaseStatus = () => ({
    configured: Boolean(env.mongodbUri),
    envKey: env.mongoEnvKey,
    uriPreview: getMongoUriPreview(),
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

    if (!env.mongodbUri) {
        lastDatabaseError = `MongoDB URI is not set. Checked env keys: ${getMongoEnvKeys().join(', ')}`;
        logError('MongoDB connection error:', lastDatabaseError);
        return false;
    }

    if (!isValidMongoUri(env.mongodbUri)) {
        const currentValueStart = JSON.stringify(String(env.mongodbUri).slice(0, 24));
        lastDatabaseError = `Invalid MongoDB URI format. Current value starts with: ${currentValueStart}`;
        logError('MongoDB connection error:', lastDatabaseError);
        return false;
    }

    if (mongoose.connection.readyState === 1) {
        return true;
    }

    if (connectPromise) {
        return connectPromise;
    }

    registerConnectionListeners();
    logInfo(`MongoDB URI loaded from ${env.mongoEnvKey}: ${getMongoUriPreview()}`);

    connectPromise = mongoose.connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    }).then(() => {
        lastDatabaseError = null;
        logInfo('MongoDB connected successfully');
        return true;
    }).catch((error) => {
        lastDatabaseError = error.message;
        logError('MongoDB connection error:', error.message);
        return false;
    }).finally(() => {
        connectPromise = null;
    });

    return connectPromise;
};

export const isDatabaseConnected = () => env.skipExternalServices || mongoose.connection.readyState === 1;
export { getDatabaseStatus };
export default connectDB;
