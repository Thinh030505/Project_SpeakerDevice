import Product from '../../models/Product.js';
import Review from '../../models/Review.js';
import { resolveCartOwner } from '../../utils/storefront.js';

const syncProductRating = async (productId) => {
    const [result] = await Review.aggregate([
        {
            $match: {
                product: productId,
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
    authorName: review.authorName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt
});

export const getProductReviews = async (req, res, next) => {
    try {
        const product = await Product.findOne({
            slug: req.params.slug,
            deleted: { $ne: true }
        }).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay san pham.'
            });
        }

        const reviews = await Review.find({
            product: product._id,
            status: 'active'
        }).sort({ createdAt: -1 }).limit(20);

        return res.status(200).json({
            success: true,
            message: 'Lay danh sach danh gia thanh cong.',
            data: {
                reviews: reviews.map(mapReview)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createProductReview = async (req, res, next) => {
    try {
        const product = await Product.findOne({
            slug: req.params.slug,
            status: 'active',
            deleted: { $ne: true }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay san pham.'
            });
        }

        const rating = Number(req.body.rating);
        const comment = String(req.body.comment || '').trim();
        const authorName = String(req.body.authorName || req.user?.username || '').trim();

        if (!authorName || !comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Du lieu danh gia khong hop le.'
            });
        }

        const owner = resolveCartOwner(req);
        const duplicateQuery = req.user?._id
            ? { product: product._id, user: req.user._id }
            : { product: product._id, sessionId: owner.sessionId };
        const existingReview = await Review.findOne(duplicateQuery);

        if (existingReview) {
            existingReview.authorName = authorName;
            existingReview.rating = rating;
            existingReview.comment = comment;
            existingReview.status = 'active';
            await existingReview.save();
            await syncProductRating(product._id);

            return res.status(200).json({
                success: true,
                message: 'Cap nhat danh gia thanh cong.',
                data: {
                    review: mapReview(existingReview)
                }
            });
        }

        const review = await Review.create({
            product: product._id,
            user: req.user?._id || null,
            sessionId: req.user?._id ? null : owner.sessionId,
            authorName,
            rating,
            comment
        });

        await syncProductRating(product._id);

        return res.status(201).json({
            success: true,
            message: 'Gui danh gia thanh cong.',
            data: {
                review: mapReview(review)
            }
        });
    } catch (error) {
        next(error);
    }
};
