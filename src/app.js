import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });

import {
    apiLimit,
    authLimit,
    connectDB,
    corsConfig,
    env,
    generalLimit,
    getDatabaseStatus,
    helmetConfig,
    isDatabaseConnected,
    uploadLimit
} from './config/index.js';
import { getEmailStatus, verifyConnection as verifyEmail } from './services/email.service.js';
import { errorHandler, jsonErrorHandler, notFoundHandler } from './middleware/index.js';
import router from './router/index.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
verifyEmail();

app.use(helmetConfig);
app.use(corsConfig);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(jsonErrorHandler);

app.use(generalLimit);
app.use('/api/', apiLimit);
app.use('/api/auth/login', authLimit);
app.use('/api/auth/register', authLimit);
app.use('/api/auth/forgot-password', authLimit);
app.use('/api/upload', uploadLimit);

app.get('/health', (req, res) => {
    const database = getDatabaseStatus();
    const email = getEmailStatus();
    const healthy = database.connected || database.skipped;

    return res.status(healthy ? 200 : 503).json({
        success: healthy,
        message: healthy ? 'Service is healthy' : 'Service is degraded',
        data: {
            database,
            email
        }
    });
});

app.use('/api', (req, res, next) => {
    if (req.path === '/health') {
        return next();
    }

    if (!isDatabaseConnected()) {
        return res.status(503).json({
            success: false,
            message: 'Database is not available',
            data: {
                database: getDatabaseStatus()
            }
        });
    }

    next();
});

app.use(router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
