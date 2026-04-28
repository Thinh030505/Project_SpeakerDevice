import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            errors: formattedErrors,
            success: false,
            message: 'Dữ liệu không hợp lệ.'
        });
    }

    next();
};

export const registerValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Tên người dùng không được để trống.')
        .isLength({ min: 3, max: 30 })
        .withMessage('Tên người dùng phải có từ 3 đến 30 ký tự.')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới.'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email không được để trống.')
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ.')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống.')
        .isLength({ min: 6, max: 128 })
        .withMessage('Mật khẩu phải có từ 6 đến 128 ký tự.'),

    body('passwordConfirm')
        .optional()
        .custom((value, { req }) => {
            if (value && value !== req.body.password) {
                throw new Error('Mật khẩu xác nhận không khớp.');
            }
            return true;
        }),

    validate
];

export const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username hoặc email không được để trống.'),

    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống.'),

    validate
];

export const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token không được để trống.'),

    validate
];

export const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email không được để trống.')
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ.')
        .normalizeEmail(),

    validate
];

export const addressValidation = [
    body('fullName')
        .notEmpty()
        .withMessage('Tên người nhận là bắt buộc.')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tên người nhận phải có từ 2 đến 50 ký tự.'),

    body('phone')
        .notEmpty()
        .withMessage('Số điện thoại là bắt buộc.')
        .trim()
        .matches(/^(0|\+84)[0-9]{9,10}$/)
        .withMessage('Số điện thoại không hợp lệ.'),

    body('address')
        .notEmpty()
        .withMessage('Địa chỉ là bắt buộc.')
        .trim(),

    body('ward')
        .notEmpty()
        .withMessage('Phường/Xã là bắt buộc.')
        .trim(),

    body('district')
        .notEmpty()
        .withMessage('Quận/Huyện là bắt buộc.')
        .trim(),

    body('city')
        .notEmpty()
        .withMessage('Tỉnh/Thành phố là bắt buộc.')
        .trim(),

    body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('isDefault phải là boolean.'),

    body('note')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Ghi chú không được quá 200 ký tự.'),

    validate
];

export const resetPasswordValidation = [
    param('token').optional(),
    body('token').optional(),

    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ.'),

    body('code')
        .optional()
        .trim()
        .isLength({ min: 6, max: 6 })
        .withMessage('Mã khôi phục phải gồm 6 chữ số.'),

    body().custom((_, { req }) => {
        const token = req.params.token || req.body.token;
        const hasCodeFlow = Boolean(req.body.email && req.body.code);

        if (!token && !hasCodeFlow) {
            throw new Error('Cần cung cấp token hoặc cặp email và mã khôi phục.');
        }
        return true;
    }),

    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống.')
        .isLength({ min: 6, max: 128 })
        .withMessage('Mật khẩu phải có từ 6 đến 128 ký tự.'),

    body('passwordConfirm')
        .notEmpty()
        .withMessage('Xác nhận mật khẩu không được để trống.')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Mật khẩu xác nhận không khớp.');
            }
            return true;
        }),

    validate
];
