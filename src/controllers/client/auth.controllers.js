import crypto from 'crypto';
import User from '../../models/User.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../../config/cloudinary.js';
import env from '../../config/env.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../config/jwt.js';
import { sendEmail } from '../../services/email.service.js';
import resetPasswordTemplate from '../../templates/email/resetPassword.template.js';
import welcomeTemplate from '../../templates/email/welcome.template.js';
import { logError, logInfo } from '../../utils/logger.js';

const APP_NAME = env.appName;
const FRONTEND_URL = env.frontendUrl;
const RESET_PASSWORD_EXPIRE_MINUTES = 15;

const buildResetPasswordUrl = (token) => {
    return `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${token}`;
};

const createPasswordResetToken = () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    return {
        rawToken,
        hashedToken,
        expiresAt: new Date(Date.now() + RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000)
    };
};

const createPasswordResetCode = () => {
    const rawCode = String(Math.floor(100000 + Math.random() * 900000));
    const hashedCode = crypto.createHash('sha256').update(rawCode).digest('hex');

    return {
        rawCode,
        hashedCode,
        expiresAt: new Date(Date.now() + RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000)
    };
};

const buildResetPreviewPayload = (rawToken, resetUrl, expiresAt) => {
    if (env.nodeEnv === 'production') {
        return undefined;
    }

    return {
        resetToken: rawToken,
        resetUrl,
        expiresAt
    };
};

export const register = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đủ thông tin'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại'
            });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập đã tồn tại'
            });
        }

        const user = new User({ username, password, email });
        await user.save();

        const welcomeEmailHtml = welcomeTemplate({
            username: user.username,
            appName: APP_NAME,
            loginUrl: `${FRONTEND_URL.replace(/\/$/, '')}/login`
        });

        const welcomeEmailResult = await sendEmail({
            to: user.email,
            subject: `Chào mừng bạn đến với ${APP_NAME}`,
            html: welcomeEmailHtml,
            text: `Chào mừng ${user.username} đến với ${APP_NAME}. Bạn có thể đăng nhập tại ${FRONTEND_URL.replace(/\/$/, '')}/login`
        });

        const payload = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await user.addRefreshToken(refreshToken);

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken,
                welcomeEmailSent: welcomeEmailResult.success
            }
        });
    } catch (error) {
        logError('Register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        const genericMessage = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const { rawToken, hashedToken, expiresAt } = createPasswordResetToken();
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = expiresAt;
        await user.save();

        const resetUrl = buildResetPasswordUrl(rawToken);
        const html = resetPasswordTemplate({
            username: user.username,
            resetUrl,
            appName: APP_NAME,
            expireMin: RESET_PASSWORD_EXPIRE_MINUTES
        });

        const emailResult = await sendEmail({
            to: user.email,
            subject: `${APP_NAME} - Đặt lại mật khẩu`,
            html,
            text: `Xin chào ${user.username}, truy cập ${resetUrl} để đặt lại mật khẩu. Link có hiệu lực trong ${RESET_PASSWORD_EXPIRE_MINUTES} phút.`
        });

        if (!emailResult.success) {
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.'
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage
        });
    } catch (error) {
        logError('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const forgotPasswordHandler = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        const genericMessage = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const { rawToken, hashedToken, expiresAt } = createPasswordResetToken();
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = expiresAt;
        await user.save();

        const resetUrl = buildResetPasswordUrl(rawToken);
        const previewPayload = buildResetPreviewPayload(rawToken, resetUrl, expiresAt);

        if (env.skipExternalServices || !env.emailUser || !env.emailPass) {
            logInfo(`Forgot password email skipped for ${user.email}.`);

            return res.status(200).json({
                success: true,
                message: genericMessage,
                ...(previewPayload ? { data: previewPayload } : {})
            });
        }

        const html = resetPasswordTemplate({
            username: user.username,
            resetUrl,
            appName: APP_NAME,
            expireMin: RESET_PASSWORD_EXPIRE_MINUTES
        });

        const emailResult = await sendEmail({
            to: user.email,
            subject: `${APP_NAME} - Đặt lại mật khẩu`,
            html,
            text: `Xin chào ${user.username}, truy cập ${resetUrl} để đặt lại mật khẩu. Link có hiệu lực trong ${RESET_PASSWORD_EXPIRE_MINUTES} phút.`
        });

        if (!emailResult.success) {
            if (env.nodeEnv !== 'production') {
                logInfo(`Forgot password email failed for ${user.email}. Returning preview payload.`);

                return res.status(200).json({
                    success: true,
                    message: genericMessage,
                    ...(previewPayload ? { data: previewPayload } : {})
                });
            }

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.'
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
            ...(previewPayload ? { data: previewPayload } : {})
        });
    } catch (error) {
        logError('Forgot password handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const token = req.params.token || req.body.token;
        const { password } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu token đặt lại mật khẩu'
            });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
            });
        }

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.clearRefreshTokens();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.'
        });
    } catch (error) {
        logError('Reset password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
            });
        }

        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Thông tin đăng nhập không chính xác'
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Thông tin đăng nhập không chính xác'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị vô hiệu hóa'
            });
        }

        const payload = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await user.addRefreshToken(refreshToken);
        user.lastLogin = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        logError('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu refresh token'
            });
        }

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token không hợp lệ'
            });
        }

        const user = await User.findById(decoded.id);
        if (user) {
            await user.removeRefreshToken(refreshToken);
        }

        return res.status(200).json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        logError('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: refreshTokenValue } = req.body;

        if (!refreshTokenValue) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu refresh token'
            });
        }

        const decoded = verifyRefreshToken(refreshTokenValue);
        if (!decoded) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token không hợp lệ hoặc đã hết hạn'
            });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Không tìm thấy người dùng hoặc tài khoản đã bị khóa'
            });
        }

        const tokenExists = user.refreshTokens.some((item) => item.token === refreshTokenValue);
        if (!tokenExists) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token không hợp lệ'
            });
        }

        const payload = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        return res.status(200).json({
            success: true,
            message: 'Làm mới token thành công',
            data: {
                accessToken: generateAccessToken(payload)
            }
        });
    } catch (error) {
        logError('Refresh token error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Lấy thông tin tài khoản thành công',
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
                message: 'Không tìm thấy người dùng'
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
                        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam, ví dụ 0901234567 hoặc +84901234567.'
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
            message: 'Cập nhật hồ sơ thành công',
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

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        user.password = newPassword;
        await user.save();
        await user.clearRefreshTokens();

        return res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
        });
    } catch (error) {
        logError('Change password error:', error);
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

        const maxSize = 5 * 1024 * 1024;
        if (req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: 'Kích thước file không được vượt quá 5MB'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
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

        logInfo(`Avatar updated for user ${user._id}`);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công',
            data: {
                avatar: uploadResult.url,
                publicId: uploadResult.public_id,
                copyLink: uploadResult.url
            }
        });
    } catch (error) {
        logError('Upload avatar error:', error);
        return res.status(500).json({
            success: false,
            message: `Lỗi server: ${error.message}`
        });
    }
};

export const deleteAvatar = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.profile.avatarPublicId) {
            await deleteFromCloudinary(user.profile.avatarPublicId);
        }

        user.profile.avatar = null;
        user.profile.avatarPublicId = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Xóa ảnh đại diện thành công',
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        logError('Delete avatar error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const validatePhone = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập số điện thoại'
            });
        }

        const cleanPhone = phone.replace(/[\s\-()]/g, '');
        const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

        if (!phoneRegex.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam, ví dụ 0901234567 hoặc +84901234567.'
            });
        }

        const formattedPhone = cleanPhone.startsWith('0')
            ? `+84${cleanPhone.substring(1)}`
            : cleanPhone;

        return res.status(200).json({
            success: true,
            message: 'Số điện thoại hợp lệ',
            data: {
                originalPhone: phone,
                cleanPhone,
                formattedPhone,
                isValid: true
            }
        });
    } catch (error) {
        logError('Validate phone error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const forgotPasswordCodeHandler = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        const genericMessage = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã khôi phục mật khẩu.';

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const { rawCode, hashedCode, expiresAt } = createPasswordResetCode();
        user.resetPasswordToken = hashedCode;
        user.resetPasswordExpires = expiresAt;
        await user.save();

        const previewPayload = env.nodeEnv === 'production'
            ? undefined
            : {
                email: user.email,
                resetCode: rawCode,
                expiresAt
            };

        if (env.skipExternalServices || !env.emailUser || !env.emailPass) {
            logInfo(`Forgot password code email skipped for ${user.email}.`);

            return res.status(200).json({
                success: true,
                message: genericMessage,
                ...(previewPayload ? { data: previewPayload } : {})
            });
        }

        const html = resetPasswordTemplate({
            username: user.username,
            resetCode: rawCode,
            appName: APP_NAME,
            expireMin: RESET_PASSWORD_EXPIRE_MINUTES
        });

        const emailResult = await sendEmail({
            to: user.email,
            subject: `${APP_NAME} - Mã khôi phục mật khẩu`,
            html,
            text: `Xin chào ${user.username}, mã khôi phục mật khẩu của bạn là ${rawCode}. Mã có hiệu lực trong ${RESET_PASSWORD_EXPIRE_MINUTES} phút.`
        });

        if (!emailResult.success) {
            if (env.nodeEnv !== 'production') {
                logInfo(`Forgot password code email failed for ${user.email}. Returning preview payload.`);

                return res.status(200).json({
                    success: true,
                    message: genericMessage,
                    ...(previewPayload ? { data: previewPayload } : {})
                });
            }

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Không thể gửi mã khôi phục mật khẩu. Vui lòng thử lại sau.'
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
            ...(previewPayload ? { data: previewPayload } : {})
        });
    } catch (error) {
        logError('Forgot password code handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

export const resetPasswordCodeHandler = async (req, res) => {
    try {
        const token = req.params.token || req.body.token;
        const code = String(req.body.code || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const { password } = req.body;

        let user = null;

        if (token) {
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else if (email && code) {
            const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
            user = await User.findOne({
                email,
                resetPasswordToken: hashedCode,
                resetPasswordExpires: { $gt: new Date() }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã khôi phục hoặc email đặt lại mật khẩu'
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Mã khôi phục không hợp lệ hoặc đã hết hạn'
            });
        }

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.clearRefreshTokens();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.'
        });
    } catch (error) {
        logError('Reset password code handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};
