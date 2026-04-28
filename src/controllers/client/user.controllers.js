import User from '../../models/User.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../../config/cloudinary.js';
import { logError } from '../../utils/logger.js';

export const getProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: {
                user: req.user.toJSON()
            }
        });
    } catch (error) {
        logError('Get profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { firstName, lastName, phone, dateOfBirth, address } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (firstName !== undefined) user.profile.firstName = firstName;
        if (lastName !== undefined) user.profile.lastName = lastName;

        if (phone !== undefined) {
            if (phone) {
                const cleanPhone = phone.replace(/[\s\-()]/g, '');
                const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

                if (!phoneRegex.test(cleanPhone)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567 hoặc +84901234567)'
                    });
                }

                user.profile.phone = cleanPhone.startsWith('0')
                    ? `+84${cleanPhone.substring(1)}`
                    : cleanPhone;
            } else {
                user.profile.phone = null;
            }
        }

        if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;
        if (address !== undefined) {
            user.profile.address = {
                ...user.profile.address,
                ...address
            };
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        logError('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file hình ảnh'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const uploadResult = await uploadToCloudinary(req.file, 'user-avatars');
        if (!uploadResult.success) {
            return res.status(500).json({
                success: false,
                message: `Lỗi upload hình ảnh: ${uploadResult.error}`
            });
        }

        if (user.profile.avatar && user.profile.avatarPublicId) {
            await deleteFromCloudinary(user.profile.avatarPublicId);
        }

        user.profile.avatar = uploadResult.url;
        user.profile.avatarPublicId = uploadResult.public_id;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Avatar đã được cập nhật thành công',
            data: {
                avatar: uploadResult.url,
                copyLink: uploadResult.url
            }
        });
    } catch (error) {
        logError('Upload avatar error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};
