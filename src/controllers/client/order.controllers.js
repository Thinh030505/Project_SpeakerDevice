import Cart from '../../models/Cart.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { buildCartQuery, normalizeCart, resolveCartOwner } from '../../utils/storefront.js';

const generateOrderNumber = () => `SH${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
const ORDER_STATUS_OPTIONS = new Set(['pending', 'processing', 'completed', 'cancelled']);
const PAYMENT_STATUS_OPTIONS = new Set(['pending', 'paid', 'failed']);
const PAYMENT_METHOD_OPTIONS = new Set(['cod', 'bank_transfer', 'qr_personal']);

const validateCheckoutPayload = (payload = {}) => {
    const requiredFields = ['fullName', 'phone', 'email', 'addressLine', 'city'];

    for (const field of requiredFields) {
        if (!String(payload[field] || '').trim()) {
            return `${field} là thông tin bắt buộc.`;
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || '').trim())) {
        return 'Email không hợp lệ.';
    }

    if (!/^(\+84|0)[0-9]{9,10}$/.test(String(payload.phone || '').replace(/[\s\-()]/g, ''))) {
        return 'Số điện thoại không hợp lệ.';
    }

    return null;
};

const mapOrder = (order) => ({
    id: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    promoCode: order.promoCode,
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
        id: String(item._id),
        name: item.name,
        slug: item.slug,
        brand: item.brand,
        image: item.image,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        attributes: item.attributes ? Object.fromEntries(item.attributes) : {}
    }))
});

const findOwnedOrder = async (owner, orderId) => {
    const query = owner.userId
        ? { _id: orderId, user: owner.userId }
        : { _id: orderId, sessionId: owner.sessionId };

    return Order.findOne(query);
};

export const createOrder = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const validationMessage = validateCheckoutPayload(req.body);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage
            });
        }

        const cart = await Cart.findOne(buildCartQuery(owner));
        if (!cart || !cart.items.length) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng đang trống.'
            });
        }

        const productIds = cart.items.map((item) => item.product);
        const products = await Product.find({
            _id: { $in: productIds },
            status: 'active',
            deleted: { $ne: true }
        });
        const productMap = new Map(products.map((product) => [String(product._id), product]));

        for (const item of cart.items) {
            const product = productMap.get(String(item.product));
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${item.name} không còn khả dụng.`
                });
            }

            const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));
            if (!variant || variant.isActive === false) {
                return res.status(400).json({
                    success: false,
                    message: `Biến thể của ${item.name} không còn khả dụng.`
                });
            }

            if (variant.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${item.name} chỉ còn ${variant.stock} đơn vị.`
                });
            }
        }

        for (const item of cart.items) {
            const product = productMap.get(String(item.product));
            const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));
            variant.stock -= item.quantity;
            await product.save();
        }

        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const order = await Order.create({
            orderNumber: generateOrderNumber(),
            user: owner.userId,
            sessionId: owner.userId ? null : owner.sessionId,
            items: cart.items.map((item) => ({
                product: item.product,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                compareAtPrice: item.compareAtPrice,
                name: item.name,
                slug: item.slug,
                brand: item.brand,
                sku: item.sku,
                image: item.image,
                attributes: item.attributes
            })),
            shippingAddress: {
                fullName: req.body.fullName.trim(),
                phone: req.body.phone.trim(),
                email: req.body.email.trim().toLowerCase(),
                addressLine: req.body.addressLine.trim(),
                ward: String(req.body.ward || '').trim(),
                district: String(req.body.district || '').trim(),
                city: req.body.city.trim(),
                note: String(req.body.note || '').trim()
            },
            paymentMethod: PAYMENT_METHOD_OPTIONS.has(String(req.body.paymentMethod || '').trim())
                ? String(req.body.paymentMethod).trim()
                : 'cod',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            promoCode: cart.promoCode,
            subtotal,
            discountAmount: cart.discountAmount,
            shippingFee: cart.shippingFee,
            totalAmount: Math.max(0, subtotal - cart.discountAmount + cart.shippingFee)
        });

        cart.items = [];
        cart.promoCode = null;
        cart.discountAmount = 0;
        cart.shippingFee = 0;
        await cart.save();

        return res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công.',
            data: {
                order: mapOrder(order),
                sessionId: owner.sessionId,
                cart: normalizeCart(cart)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getOrders = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const query = owner.userId ? { user: owner.userId } : { sessionId: owner.sessionId };
        const orders = await Order.find(query).sort({ createdAt: -1 }).limit(20);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách đơn hàng thành công.',
            data: {
                orders: orders.map(mapOrder)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const query = owner.userId
            ? { _id: req.params.id, user: owner.userId }
            : { _id: req.params.id, sessionId: owner.sessionId };
        const order = await Order.findOne(query);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết đơn hàng thành công.',
            data: {
                order: mapOrder(order)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const order = await findOwnedOrder(owner, req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay don hang.'
            });
        }

        if (!['pending', 'processing'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Don hang nay khong the huy o trang thai hien tai.'
            });
        }

        const products = await Product.find({
            _id: { $in: order.items.map((item) => item.product) },
            deleted: { $ne: true }
        });
        const productMap = new Map(products.map((product) => [String(product._id), product]));

        for (const item of order.items) {
            const product = productMap.get(String(item.product));
            if (!product) {
                continue;
            }

            const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));
            if (!variant) {
                continue;
            }

            variant.stock += item.quantity;
            await product.save();
        }

        order.orderStatus = 'cancelled';
        if (order.paymentStatus === 'pending') {
            order.paymentStatus = 'failed';
        }
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Da huy don hang thanh cong.',
            data: {
                order: mapOrder(order)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllOrdersAdmin = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const status = String(req.query.status || '').trim();
        const paymentStatus = String(req.query.paymentStatus || '').trim();
        const search = String(req.query.search || '').trim();

        const query = {};
        if (ORDER_STATUS_OPTIONS.has(status)) {
            query.orderStatus = status;
        }
        if (PAYMENT_STATUS_OPTIONS.has(paymentStatus)) {
            query.paymentStatus = paymentStatus;
        }
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.email': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Order.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Lay danh sach don hang thanh cong.',
            data: {
                orders: orders.map(mapOrder),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const nextStatus = String(req.body.orderStatus || '').trim();
        if (!ORDER_STATUS_OPTIONS.has(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Trang thai don hang khong hop le.'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay don hang.'
            });
        }

        order.orderStatus = nextStatus;
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Cap nhat trang thai don hang thanh cong.',
            data: {
                order: mapOrder(order)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updatePaymentStatus = async (req, res, next) => {
    try {
        const nextStatus = String(req.body.paymentStatus || '').trim();
        if (!PAYMENT_STATUS_OPTIONS.has(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Trang thai thanh toan khong hop le.'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay don hang.'
            });
        }

        order.paymentStatus = nextStatus;
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Cap nhat trang thai thanh toan thanh cong.',
            data: {
                order: mapOrder(order)
            }
        });
    } catch (error) {
        next(error);
    }
};
