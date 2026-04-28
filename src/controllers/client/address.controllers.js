import Address from "../../models/Address.js";
import { NotFoundError } from "../../utils/errors.js";

export const getAddresses = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                addresses,
                total: addresses.length
            }
        })
    } catch (error) {
        next(error);
    }
}

export const getAddressById = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const address = await Address.findOne({ _id: id, userId });
        if (!address) {
            throw new NotFoundError('Địa chỉ không tồn tại');
        }

        res.status(200).json({
            success: true,
            data: {
                address
            }
        });

    } catch (error) {
        next(error);
    }
}



export const createAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const {
            fullName, phone, address, addressNew, ward, district, city, isDefault, note
        } = req.body;

        if (isDefault) {
            await Address.updateMany(
                { userId, isDefault: true },
                { isDefault: false }
            )
        }

        const newAddress = await Address.create({
            userId,
            fullName,
            phone,
            address,
            addressNew,
            ward,
            district,
            city,
            isDefault: isDefault || false,
            note
        })

        res.status(201).json({
            success: true,
            message: 'Thêm địa chỉ thành công',
            data: {
                address: newAddress
            }
        })


    } catch (error) {
        next(error);
    }
}


/**
 * UPDATE ADDRESS - Cập nhật địa chỉ
 * 
 * ENDPOINT: PUT /api/v1/users/addresses/:id
 */
export const updateAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { fullName, phone, address, ward, district, city, isDefault, note } = req.body;

        // Tìm địa chỉ
        const addressDoc = await Address.findOne({ _id: id, userId });

        if (!addressDoc) {
            throw new NotFoundError('Địa chỉ không tồn tại');
        }

        // Nếu đặt làm mặc định, bỏ mặc định các địa chỉ khác
        if (isDefault && !addressDoc.isDefault) {
            await Address.updateMany(
                { userId, isDefault: true },
                { isDefault: false }
            );
        }

        // Cập nhật
        Object.assign(addressDoc, {
            fullName,
            phone,
            address,
            ward,
            district,
            city,
            isDefault: isDefault !== undefined ? isDefault : addressDoc.isDefault,
            note
        });

        await addressDoc.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật địa chỉ thành công',
            data: {
                address: addressDoc
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAddresses = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const address = await Address.findOneAndDelete({ _id: id, userId });
        if (!address) {
            throw new NotFoundError('Địa chỉ không tồn tại');
        }

        // Nếu xóa địa chỉ mặc định, tự động set địa chỉ khác làm mặc định
        if (address.isDefault) {
            const firstAddress = await Address.findOne({ userId }).sort({ createdAt: 1 });
            if (firstAddress) {
                firstAddress.isDefault = true;
                await firstAddress.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Xóa địa chỉ thành công'
        });

    } catch (error) {
        next(error);
    }
}




/**
 * SET DEFAULT ADDRESS - Đặt địa chỉ làm mặc định
 * 
 * ENDPOINT: PUT /api/v1/users/addresses/:id/set-default
 */
export const setDefaultAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const address = await Address.findOne({ _id: id, userId });

        if (!address) {
            throw new NotFoundError('Địa chỉ không tồn tại');
        }

        // Sử dụng static method để set default
        await Address.setDefaultAddress(id, userId);

        // Lấy địa chỉ đã cập nhật
        const updatedAddress = await Address.findById(id);

        return res.status(200).json({
            success: true,
            message: 'Đặt địa chỉ mặc định thành công',
            data: {
                address: updatedAddress
            }
        });
    } catch (error) {
        next(error);
    }
};