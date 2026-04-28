import User from '../models/User.js';
import { verifyAccessToken } from '../config/jwt.js';

// Middleware to verify access token
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }

        // Get user from database
        const user = await User.findById(decoded.id).select('-password -refreshTokens');
        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

// Alternative name for compatibility
export const protect = authenticateToken;

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyAccessToken(token);
            if (decoded) {
                const user = await User.findById(decoded.id).select('-password -refreshTokens');
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Admin only middleware
export const adminOnly = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during authorization'
        });
    }
};
