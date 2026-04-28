import mongoose from 'mongoose';

const newsletterSubscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        status: {
            type: String,
            enum: ['active', 'unsubscribed'],
            default: 'active'
        },
        source: {
            type: String,
            trim: true,
            default: 'homepage'
        }
    },
    {
        timestamps: true
    }
);

const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);

export default NewsletterSubscriber;
