import Banner from '../../models/Banner.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import { logError } from '../../utils/logger.js';

const BANNER_STATUS = new Set(['active', 'inactive']);

const isValidHttpUrl = (value) => {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const mapBanner = (banner) => ({
    id: String(banner._id),
    _id: String(banner._id),
    title: banner.title,
    description: banner.description || '',
    image: banner.image || '',
    mobileImage: banner.mobileImage || '',
    buttonText: banner.buttonText || '',
    buttonLink: banner.buttonLink || '',
    status: banner.status,
    order: banner.order || 0,
    placement: banner.placement || 'home_hero',
    createdAt: banner.createdAt,
    updatedAt: banner.updatedAt
});

const readBannerPayload = (body = {}) => ({
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    image: String(body.image || '').trim(),
    mobileImage: String(body.mobileImage || '').trim(),
    buttonText: String(body.buttonText || '').trim(),
    buttonLink: String(body.buttonLink || '').trim(),
    status: String(body.status || 'active').trim(),
    order: Number(body.order || 0),
    placement: 'home_hero'
});

const validateBannerPayload = (payload, partial = false) => {
    const errors = [];

    if (!partial || payload.title !== '') {
        if (!payload.title || payload.title.length < 2 || payload.title.length > 160) {
            errors.push('Tieu de banner phai tu 2-160 ky tu.');
        }
    }

    if (!partial || payload.image !== '') {
        if (!payload.image || !isValidHttpUrl(payload.image)) {
            errors.push('Anh banner phai la URL hop le.');
        }
    }

    if (payload.mobileImage && !isValidHttpUrl(payload.mobileImage)) {
        errors.push('Anh mobile phai la URL hop le.');
    }

    if (payload.buttonLink && !payload.buttonLink.startsWith('/') && !isValidHttpUrl(payload.buttonLink)) {
        errors.push('Button link phai la URL hop le hoac duong dan noi bo bat dau bang /.');
    }

    if (!BANNER_STATUS.has(payload.status)) {
        errors.push('Trang thai banner khong hop le.');
    }

    if (!Number.isInteger(payload.order) || payload.order < 0) {
        errors.push('Thu tu banner phai la so nguyen khong am.');
    }

    return errors;
};

export const getAdminBanners = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const status = String(req.query.status || '').trim();
        const search = String(req.query.search || '').trim();

        const query = { placement: 'home_hero' };
        if (BANNER_STATUS.has(status)) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const [banners, total] = await Promise.all([
            Banner.find(query)
                .sort({ order: 1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Banner.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lay danh sach banner thanh cong.',
            data: {
                banners: banners.map(mapBanner),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logError('Get admin banners error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const createAdminBanner = async (req, res) => {
    try {
        const payload = readBannerPayload(req.body);
        const errors = validateBannerPayload(payload);
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const banner = await Banner.create({
            ...payload,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: 'Tao banner thanh cong.',
            data: { banner: mapBanner(banner) }
        });
    } catch (error) {
        logError('Create admin banner error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const updateAdminBanner = async (req, res) => {
    try {
        const payload = readBannerPayload(req.body);
        const errors = validateBannerPayload(payload);
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    ...payload,
                    updatedBy: req.user._id
                }
            },
            { new: true, runValidators: true }
        );

        if (!banner) {
            return res.status(404).json({ success: false, message: 'Khong tim thay banner.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cap nhat banner thanh cong.',
            data: { banner: mapBanner(banner) }
        });
    } catch (error) {
        logError('Update admin banner error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const deleteAdminBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Khong tim thay banner.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Xoa banner thanh cong.'
        });
    } catch (error) {
        logError('Delete admin banner error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const uploadAdminImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui long chon file hinh anh.'
            });
        }

        const folder = String(req.body.folder || 'admin-images').trim() || 'admin-images';
        const uploadResult = await uploadToCloudinary(req.file, folder);
        if (!uploadResult.success) {
            return res.status(500).json({
                success: false,
                message: `Loi upload hinh anh: ${uploadResult.error}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Upload hinh anh thanh cong.',
            data: {
                url: uploadResult.url,
                publicId: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height
            }
        });
    } catch (error) {
        logError('Upload admin image error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};
