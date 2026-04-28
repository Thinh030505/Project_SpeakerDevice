import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Review from '../../models/Review.js';
import { logError } from '../../utils/logger.js';

const REVIEW_STATUS = new Set(['active', 'hidden']);

const syncProductRating = async (productId) => {
    if (!productId) return;

    const [result] = await Review.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                status: 'active'
            }
        },
        {
            $group: {
                _id: '$product',
                average: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    await Product.updateOne(
        { _id: productId },
        {
            $set: {
                'rating.average': result ? Number(result.average.toFixed(1)) : 0,
                'rating.count': result ? result.count : 0
            }
        }
    );
};

const mapReview = (review) => ({
    id: String(review._id),
    _id: String(review._id),
    authorName: review.authorName || 'Khach hang',
    rating: review.rating || 0,
    comment: review.comment || '',
    status: review.status || 'active',
    createdAt: review.createdAt,
    product: review.product ? {
        id: String(review.product._id || review.product),
        _id: String(review.product._id || review.product),
        name: review.product.name || 'San pham da xoa',
        slug: review.product.slug || ''
    } : null,
    user: review.user ? {
        id: String(review.user._id || review.user),
        _id: String(review.user._id || review.user),
        username: review.user.username || '',
        email: review.user.email || ''
    } : null
});

export const getAdminReviews = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const status = String(req.query.status || '').trim();
        const search = String(req.query.search || '').trim();
        const product = String(req.query.product || '').trim();
        const rating = Number(req.query.rating || 0);

        const query = {};
        if (REVIEW_STATUS.has(status)) {
            query.status = status;
        }
        if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
            query.rating = rating;
        }
        if (mongoose.Types.ObjectId.isValid(product)) {
            query.product = product;
        }
        if (search) {
            query.$or = [
                { authorName: { $regex: search, $options: 'i' } },
                { comment: { $regex: search, $options: 'i' } }
            ];
        }

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('product', 'name slug')
                .populate('user', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lay danh sach danh gia thanh cong.',
            data: {
                reviews: reviews.map(mapReview),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logError('Get admin reviews error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const updateAdminReview = async (req, res) => {
    try {
        const status = String(req.body.status || '').trim();
        if (!REVIEW_STATUS.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trang thai danh gia khong hop le.'
            });
        }

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        )
            .populate('product', 'name slug')
            .populate('user', 'username email');

        if (!review) {
            return res.status(404).json({ success: false, message: 'Khong tim thay danh gia.' });
        }

        await syncProductRating(review.product?._id);

        return res.status(200).json({
            success: true,
            message: 'Cap nhat danh gia thanh cong.',
            data: { review: mapReview(review) }
        });
    } catch (error) {
        logError('Update admin review error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};

export const deleteAdminReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Khong tim thay danh gia.' });
        }

        await syncProductRating(review.product);

        return res.status(200).json({
            success: true,
            message: 'Xoa danh gia thanh cong.'
        });
    } catch (error) {
        logError('Delete admin review error:', error);
        return res.status(500).json({ success: false, message: 'Loi server' });
    }
};
