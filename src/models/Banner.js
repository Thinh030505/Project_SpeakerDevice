import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Tieu de banner la bat buoc'],
            trim: true,
            maxlength: [160, 'Tieu de banner khong duoc qua 160 ky tu']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Mo ta banner khong duoc qua 500 ky tu']
        },
        image: {
            type: String,
            required: [true, 'Anh banner la bat buoc'],
            trim: true
        },
        mobileImage: {
            type: String,
            trim: true,
            default: ''
        },
        buttonText: {
            type: String,
            trim: true,
            maxlength: [60, 'Button text khong duoc qua 60 ky tu'],
            default: ''
        },
        buttonLink: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true
        },
        order: {
            type: Number,
            default: 0,
            min: 0,
            index: true
        },
        placement: {
            type: String,
            enum: ['home_hero'],
            default: 'home_hero',
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

bannerSchema.index({ placement: 1, status: 1, order: 1 });
bannerSchema.index({ title: 'text', description: 'text' });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
