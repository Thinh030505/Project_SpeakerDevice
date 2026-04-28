import { env, isDatabaseConnected } from '../../config/index.js';
import ContactMessage from '../../models/ContactMessage.js';
import NewsletterSubscriber from '../../models/NewsletterSubscriber.js';

const canUseDatabase = () => !env.skipExternalServices && isDatabaseConnected();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const createContactMessage = async (req, res, next) => {
    try {
        const payload = {
            name: String(req.body.name || '').trim(),
            email: String(req.body.email || '').trim().toLowerCase(),
            subject: String(req.body.subject || '').trim(),
            message: String(req.body.message || '').trim()
        };

        if (!payload.name || !payload.email || !payload.subject || !payload.message) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ họ tên, email, chủ đề và nội dung.'
            });
        }

        if (!isValidEmail(payload.email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ.'
            });
        }

        if (canUseDatabase()) {
            await ContactMessage.create(payload);
        }

        return res.status(201).json({
            success: true,
            message: 'Đã ghi nhận yêu cầu. SoundHouse sẽ liên hệ lại sớm.'
        });
    } catch (error) {
        next(error);
    }
};

export const subscribeNewsletter = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email.'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ.'
            });
        }

        if (canUseDatabase()) {
            await NewsletterSubscriber.findOneAndUpdate(
                { email },
                {
                    $set: {
                        email,
                        status: 'active',
                        source: 'homepage'
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Đã đăng ký nhận bản tin thành công.'
        });
    } catch (error) {
        next(error);
    }
};
