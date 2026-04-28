import jwt from 'jsonwebtoken';
import env from './env.js';

export const generateAccessToken = (payload) => {
    return jwt.sign(
        {
            id: payload.id,
            username: payload.username,
            email: payload.email
        },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn }
    );
};

export const generateRefreshToken = (payload) => {
    return jwt.sign(
        { id: payload.id },
        env.jwtRefreshSecret,
        { expiresIn: env.jwtRefreshExpiresIn }
    );
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, env.jwtSecret);
    } catch {
        return null;
    }
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, env.jwtRefreshSecret);
    } catch {
        return null;
    }
};

export default {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
