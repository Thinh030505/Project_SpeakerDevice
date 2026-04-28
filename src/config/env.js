import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const toBoolean = (value, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSecret = (value) => String(value || '').replace(/\s+/g, '').trim();

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: toNumber(process.env.PORT, 3000),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    appName: process.env.EMAIL_FROM_NAME || 'BE Products',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/product-management',
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
    emailPort: toNumber(process.env.EMAIL_PORT, 465),
    emailSecure: process.env.EMAIL_SECURE === undefined
        ? toNumber(process.env.EMAIL_PORT, 465) === 465
        : toBoolean(process.env.EMAIL_SECURE),
    emailUser: String(process.env.EMAIL_USER || '').trim(),
    emailPass: normalizeSecret(process.env.EMAIL_PASS),
    emailFromName: process.env.EMAIL_FROM_NAME || 'My App',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:3001'],
    skipExternalServices: toBoolean(process.env.SKIP_EXTERNAL_SERVICES),
    verifyEmailOnStartup: !toBoolean(process.env.SKIP_EMAIL_VERIFY) && !toBoolean(process.env.SKIP_EXTERNAL_SERVICES),
    bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
    debugLogs: toBoolean(process.env.DEBUG_LOGS),
    paymentBankCode: String(process.env.PAYMENT_BANK_CODE || '').trim().toUpperCase(),
    paymentBankName: String(process.env.PAYMENT_BANK_NAME || '').trim(),
    paymentBankAccountNumber: String(process.env.PAYMENT_BANK_ACCOUNT_NUMBER || '').trim(),
    paymentBankAccountName: String(process.env.PAYMENT_BANK_ACCOUNT_NAME || '').trim(),
    paymentQrTemplate: String(process.env.PAYMENT_QR_TEMPLATE || 'compact2').trim(),
    paymentQrImageUrl: String(process.env.PAYMENT_QR_IMAGE_URL || '').trim()
};

export const getMissingOptionalEnv = () => {
    const optionalVars = [
        ['EMAIL_USER', env.emailUser],
        ['EMAIL_PASS', env.emailPass],
        ['CLOUDINARY_CLOUD_NAME', env.cloudinaryCloudName],
        ['CLOUDINARY_API_KEY', env.cloudinaryApiKey],
        ['CLOUDINARY_API_SECRET', env.cloudinaryApiSecret],
        ['PAYMENT_BANK_CODE', env.paymentBankCode],
        ['PAYMENT_BANK_ACCOUNT_NUMBER', env.paymentBankAccountNumber],
        ['PAYMENT_BANK_ACCOUNT_NAME', env.paymentBankAccountName]
    ];

    return optionalVars.filter(([, value]) => !value).map(([key]) => key);
};

export default env;
