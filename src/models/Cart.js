import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        compareAtPrice: {
            type: Number,
            min: 0,
            default: null
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            required: true,
            trim: true
        },
        brand: {
            type: String,
            trim: true,
            default: ''
        },
        sku: {
            type: String,
            trim: true,
            default: ''
        },
        image: {
            type: String,
            trim: true,
            default: ''
        },
        attributes: {
            type: Map,
            of: String,
            default: {}
        }
    },
    {
        _id: true
    }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        sessionId: {
            type: String,
            trim: true,
            default: null,
            index: true
        },
        items: {
            type: [cartItemSchema],
            default: []
        },
        promoCode: {
            type: String,
            trim: true,
            default: null
        },
        discountAmount: {
            type: Number,
            min: 0,
            default: 0
        },
        shippingFee: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

cartSchema.index({ user: 1, updatedAt: -1 });
cartSchema.index({ sessionId: 1, updatedAt: -1 });

cartSchema.virtual('subtotal').get(function () {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

cartSchema.virtual('itemCount').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual('total').get(function () {
    const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.max(0, subtotal - this.discountAmount + this.shippingFee);
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
