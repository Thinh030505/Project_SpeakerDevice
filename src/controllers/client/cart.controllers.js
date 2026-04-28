import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import {
    calculatePromo,
    findOrCreateCart,
    formatCurrency,
    normalizeCart,
    normalizeVariant,
    resolveCartOwner
} from '../../utils/storefront.js';

const CART_SHIPPING_FEE = 50000;

const getVariantById = (product, variantId) =>
    product.variants.find((variant) => String(variant._id) === String(variantId));

const syncItemFromProduct = (item, product, variant) => {
    const normalizedVariant = normalizeVariant(variant, product);
    item.price = normalizedVariant.price;
    item.compareAtPrice = normalizedVariant.compareAtPrice;
    item.name = product.name;
    item.slug = product.slug;
    item.brand = product.brand || '';
    item.sku = normalizedVariant.sku;
    item.image = normalizedVariant.image;
    item.attributes = normalizedVariant.attributes;
};

const recalculateCart = (cart) => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const promoResult = calculatePromo(subtotal, cart.promoCode);

    cart.discountAmount = promoResult.discountAmount || 0;
    cart.shippingFee = subtotal > 0 ? CART_SHIPPING_FEE : 0;

    if (promoResult.shippingOverride) {
        cart.shippingFee = Math.max(0, cart.shippingFee - promoResult.shippingOverride);
    }

    if (!promoResult.promoCode && cart.promoCode) {
        cart.promoCode = null;
        cart.discountAmount = 0;
    }
};

const enrichCartFromProducts = async (cart) => {
    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({
        _id: { $in: productIds },
        deleted: { $ne: true }
    }).populate('category', 'name slug');
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    cart.items = cart.items.filter((item) => {
        const product = productMap.get(String(item.product));
        if (!product) {
            return false;
        }

        const variant = getVariantById(product, item.variantId);
        if (!variant || variant.isActive === false) {
            return false;
        }

        syncItemFromProduct(item, product, variant);
        if (item.quantity > variant.stock) {
            item.quantity = Math.max(1, variant.stock);
        }

        return variant.stock > 0;
    });

    recalculateCart(cart);
    await cart.save();

    return cart;
};

const sendCartResponse = (res, cart, sessionId, message = 'Lấy giỏ hàng thành công') => {
    return res.status(200).json({
        success: true,
        message,
        data: {
            cart: normalizeCart(cart),
            sessionId
        }
    });
};

export const getCart = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);
        await enrichCartFromProducts(cart);

        return sendCartResponse(res, cart, owner.sessionId);
    } catch (error) {
        next(error);
    }
};

export const addToCart = async (req, res, next) => {
    try {
        const { productId, variantId, quantity = 1 } = req.body;
        const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

        if (!productId || !variantId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin sản phẩm hoặc biến thể.'
            });
        }

        const product = await Product.findOne({
            _id: productId,
            status: 'active',
            deleted: { $ne: true }
        }).populate('category', 'name slug');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm.'
            });
        }

        const variant = getVariantById(product, variantId);
        if (!variant || variant.isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'Biến thể sản phẩm không hợp lệ.'
            });
        }

        if (variant.stock < parsedQuantity) {
            return res.status(400).json({
                success: false,
                message: `Sản phẩm chỉ còn ${variant.stock} đơn vị trong kho.`
            });
        }

        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);
        const existingItem = cart.items.find(
            (item) => String(item.product) === String(productId) && String(item.variantId) === String(variantId)
        );

        if (existingItem) {
            if (existingItem.quantity + parsedQuantity > variant.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Bạn chỉ có thể thêm tối đa ${variant.stock} sản phẩm cho biến thể này.`
                });
            }

            existingItem.quantity += parsedQuantity;
            syncItemFromProduct(existingItem, product, variant);
        } else {
            const normalizedVariant = normalizeVariant(variant, product);
            cart.items.push({
                product: product._id,
                variantId: variant._id,
                quantity: parsedQuantity,
                price: normalizedVariant.price,
                compareAtPrice: normalizedVariant.compareAtPrice,
                name: product.name,
                slug: product.slug,
                brand: product.brand || '',
                sku: normalizedVariant.sku,
                image: normalizedVariant.image,
                attributes: normalizedVariant.attributes
            });
        }

        recalculateCart(cart);
        await cart.save();

        return res.status(201).json({
            success: true,
            message: 'Đã thêm sản phẩm vào giỏ hàng.',
            data: {
                cart: normalizeCart(cart),
                sessionId: owner.sessionId
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const parsedQuantity = parseInt(quantity, 10);

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn hoặc bằng 1.'
            });
        }

        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);
        const item = cart.items.id(req.params.itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng.'
            });
        }

        const product = await Product.findOne({
            _id: item.product,
            status: 'active',
            deleted: { $ne: true }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không còn tồn tại.'
            });
        }

        const variant = getVariantById(product, item.variantId);
        if (!variant || variant.isActive === false || variant.stock < parsedQuantity) {
            return res.status(400).json({
                success: false,
                message: `Số lượng không hợp lệ. Hiện chỉ còn ${variant?.stock || 0} sản phẩm.`
            });
        }

        item.quantity = parsedQuantity;
        syncItemFromProduct(item, product, variant);
        recalculateCart(cart);
        await cart.save();

        return sendCartResponse(res, cart, owner.sessionId, 'Cập nhật giỏ hàng thành công.');
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);
        const item = cart.items.id(req.params.itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng.'
            });
        }

        item.deleteOne();
        recalculateCart(cart);
        await cart.save();

        return sendCartResponse(res, cart, owner.sessionId, 'Đã xóa sản phẩm khỏi giỏ hàng.');
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req, res, next) => {
    try {
        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);

        cart.items = [];
        cart.promoCode = null;
        cart.discountAmount = 0;
        cart.shippingFee = 0;
        await cart.save();

        return sendCartResponse(res, cart, owner.sessionId, 'Đã xóa toàn bộ giỏ hàng.');
    } catch (error) {
        next(error);
    }
};

export const applyPromoCode = async (req, res, next) => {
    try {
        const { code } = req.body;
        const normalizedCode = String(code || '').trim().toUpperCase();
        const owner = resolveCartOwner(req);
        const cart = await findOrCreateCart(owner);

        if (!cart.items.length) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng đang trống, chưa thể áp mã giảm giá.'
            });
        }

        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const promoResult = calculatePromo(subtotal, normalizedCode);

        if (!promoResult.promoCode) {
            return res.status(400).json({
                success: false,
                message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'
            });
        }

        cart.promoCode = promoResult.promoCode;
        cart.discountAmount = promoResult.discountAmount || 0;
        cart.shippingFee = CART_SHIPPING_FEE;

        if (promoResult.shippingOverride) {
            cart.shippingFee = Math.max(0, cart.shippingFee - promoResult.shippingOverride);
        }

        await cart.save();

        return res.status(200).json({
            success: true,
            message: `Áp dụng mã ${promoResult.promoCode} thành công. Bạn tiết kiệm ${formatCurrency(cart.discountAmount)}.`,
            data: {
                cart: normalizeCart(cart),
                sessionId: owner.sessionId
            }
        });
    } catch (error) {
        next(error);
    }
};
