import ContactMessage from '../../models/ContactMessage.js';
import NewsletterSubscriber from '../../models/NewsletterSubscriber.js';
import { logError } from '../../utils/logger.js';

const CONTACT_STATUS = new Set(['new', 'reviewed', 'resolved']);
const SUBSCRIBER_STATUS = new Set(['active', 'unsubscribed']);

export const getAdminContactMessages = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const status = String(req.query.status || '').trim();
        const search = String(req.query.search || '').trim();

        const query = {};
        if (CONTACT_STATUS.has(status)) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const [messages, total] = await Promise.all([
            ContactMessage.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            ContactMessage.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Contact messages retrieved successfully',
            data: {
                messages,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logError('Get contact messages error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server'
        });
    }
};

export const updateAdminContactMessage = async (req, res) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!CONTACT_STATUS.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trang thai lien he khong hop le'
            });
        }

        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay lien he'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cap nhat lien he thanh cong',
            data: { message }
        });
    } catch (error) {
        logError('Update contact message error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server'
        });
    }
};

export const getAdminNewsletterSubscribers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const status = String(req.query.status || '').trim();
        const search = String(req.query.search || '').trim();

        const query = {};
        if (SUBSCRIBER_STATUS.has(status)) {
            query.status = status;
        }
        if (search) {
            query.email = { $regex: search, $options: 'i' };
        }

        const [subscribers, total] = await Promise.all([
            NewsletterSubscriber.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            NewsletterSubscriber.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Subscribers retrieved successfully',
            data: {
                subscribers,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logError('Get subscribers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server'
        });
    }
};

export const updateAdminNewsletterSubscriber = async (req, res) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!SUBSCRIBER_STATUS.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trang thai dang ky khong hop le'
            });
        }

        const subscriber = await NewsletterSubscriber.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay nguoi dang ky'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cap nhat nguoi dang ky thanh cong',
            data: { subscriber }
        });
    } catch (error) {
        logError('Update subscriber error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server'
        });
    }
};
