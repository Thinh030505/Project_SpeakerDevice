import Brand from '../../models/Brand.js';
import Category from '../../models/Category.js';
import ContactMessage from '../../models/ContactMessage.js';
import NewsletterSubscriber from '../../models/NewsletterSubscriber.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import { logError } from '../../utils/logger.js';

const buildRangeFilter = (days = 7) => ({
    createdAt: {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
});

export const getDashboardSummary = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalProducts,
            activeProducts,
            draftProducts,
            totalCategories,
            totalBrands,
            totalOrders,
            pendingOrders,
            paidOrders,
            totalContacts,
            newContacts,
            totalSubscribers,
            recentOrders,
            recentContacts
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            Product.countDocuments({ deleted: { $ne: true } }),
            Product.countDocuments({ status: 'active', deleted: { $ne: true } }),
            Product.countDocuments({ status: 'draft', deleted: { $ne: true } }),
            Category.countDocuments(),
            Brand.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ orderStatus: 'pending' }),
            Order.countDocuments({ paymentStatus: 'paid' }),
            ContactMessage.countDocuments(),
            ContactMessage.countDocuments({ status: 'new' }),
            NewsletterSubscriber.countDocuments({ status: 'active' }),
            Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('orderNumber totalAmount paymentStatus orderStatus shippingAddress createdAt'),
            ContactMessage.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email subject status createdAt')
        ]);

        const revenueAgg = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        const recentOrdersCount = await Order.countDocuments(buildRangeFilter(7));
        const recentUsersCount = await User.countDocuments(buildRangeFilter(7));

        return res.status(200).json({
            success: true,
            message: 'Dashboard summary retrieved successfully',
            data: {
                stats: {
                    totalUsers,
                    activeUsers,
                    recentUsersCount,
                    totalProducts,
                    activeProducts,
                    draftProducts,
                    totalCategories,
                    totalBrands,
                    totalOrders,
                    pendingOrders,
                    paidOrders,
                    recentOrdersCount,
                    totalContacts,
                    newContacts,
                    totalSubscribers,
                    totalRevenue: revenueAgg[0]?.revenue || 0
                },
                recentOrders,
                recentContacts
            }
        });
    } catch (error) {
        logError('Get dashboard summary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Loi server'
        });
    }
};
