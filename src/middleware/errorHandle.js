import { logError } from '../utils/logger.js';

const isApiRequest = (req) => req.originalUrl.startsWith('/api');
const prefersHtml = (req) => !isApiRequest(req) && req.accepts('html');

const renderWebError = (req, res, statusCode, message) => {
    return res.status(statusCode).render('page/error', {
        statusCode,
        message
    });
};

const sendApiError = (res, statusCode, message, extra = {}) => {
    return res.status(statusCode).json({
        success: false,
        message,
        ...extra
    });
};

export const jsonErrorHandler = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        if (prefersHtml(req)) {
            return renderWebError(req, res, 400, 'Dữ liệu gửi lên không đúng định dạng JSON.');
        }

        return sendApiError(res, 400, 'Invalid JSON format');
    }

    next();
};

export const notFoundHandler = (req, res) => {
    if (prefersHtml(req)) {
        return renderWebError(req, res, 404, 'Trang bạn tìm không tồn tại hoặc đã được chuyển sang địa chỉ khác.');
    }

    return sendApiError(res, 404, 'Route not found');
};

export const errorHandler = (err, req, res, next) => {
    logError('Unhandled error:', err);

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal server error';
    let extra = {};

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        extra = {
            errors: Object.values(err.errors).map((errorItem) => errorItem.message)
        };
    } else if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'Field';
        message = `${field} already exists`;
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = `${err.path || 'Field'} is invalid`;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File quá lớn. Kích thước tối đa là 5MB.';
    } else if (typeof err.message === 'string' && err.message.toLowerCase().includes('hình ảnh')) {
        statusCode = 400;
        message = err.message;
    }

    if (prefersHtml(req)) {
        return renderWebError(req, res, statusCode, message);
    }

    return sendApiError(res, statusCode, message, extra);
};
