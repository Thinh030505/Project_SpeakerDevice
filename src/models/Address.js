import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: [true, 'Tên người nhận là bắt buộc'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Số điện thoại là bắt buộc'],
        trim: true,
        validate: {
            validator: function (value) {
                return /^(0|\+84)[0-9]{9,10}$/.test(value);
            },
            message: 'Số điện thoại không hợp lệ'
        }
    },
    address: {
        type: String,
        required: [true, 'Địa chỉ là bắt buộc'],
        trim: true
    },
    ward: {
        type: String,
        required: [true, 'Phường/Xã là bắt buộc'],
        trim: true
    },
    district: {
        type: String,
        required: [true, 'Quận/Huyện là bắt buộc'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'Tỉnh/Thành phố là bắt buộc'],
        trim: true
    },
    addressNew: {
        type: Boolean,
        default: false
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    note: {
        type: String,
        trim: true
    }
},
    {
        timestamps: true
    })

// index
addressSchema.index({ userId: 1, isDefault: 1 });

// set default address
addressSchema.statics.setDefaultAddress = async function (addressId, userId) {
    // bỏ mặc định của user
    await this.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
    )
    // đặt địa chỉ mặc định
    return this.findByIdAndUpdate(
        addressId,
        { isDefault: true },
        { new: true }
    )
}




const Address = mongoose.model('Address', addressSchema);

export default Address;
