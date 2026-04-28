import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
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
            min: 1
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

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
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
            type: [orderItemSchema],
            default: []
        },
        shippingAddress: {
            fullName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true, lowercase: true },
            addressLine: { type: String, required: true, trim: true },
            ward: { type: String, trim: true, default: '' },
            district: { type: String, trim: true, default: '' },
            city: { type: String, required: true, trim: true },
            note: { type: String, trim: true, default: '' }
        },
        paymentMethod: {
            type: String,
            enum: ['cod', 'bank_transfer', 'qr_personal'],
            default: 'cod'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'cancelled'],
            default: 'pending'
        },
        promoCode: {
            type: String,
            trim: true,
            default: null
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0
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
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ sessionId: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
