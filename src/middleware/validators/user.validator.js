import { body, validationResult } from 'express-validator';

// Middleware để xử lý kết quả validation
export const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: formattedErrors
        });
    }

    next();
};

// Validation cho update profile
export const updateProfileValidation = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tên phải có từ 2-50 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage('Tên chỉ được chứa chữ cái và khoảng trắng'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Họ phải có từ 2-50 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage('Họ chỉ được chứa chữ cái và khoảng trắng'),

    body('phone')
        .optional()
        .trim()
        .custom((value) => {
            if (!value) return true; // Optional field

            const cleanPhone = value.replace(/[\s\-()]/g, '');
            const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567 hoặc +84901234567)');
            }
            return true;
        }),

    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Ngày sinh phải có định dạng hợp lệ (YYYY-MM-DD)')
        .custom((value) => {
            if (!value) return true;

            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            if (age < 13 || age > 120) {
                throw new Error('Tuổi phải từ 13-120');
            }
            return true;
        }),

    body('address.street')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Địa chỉ đường phải có từ 5-200 ký tự'),

    body('address.city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Thành phố phải có từ 2-50 ký tự'),

    body('address.state')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tỉnh/Bang phải có từ 2-50 ký tự'),

    body('address.zipCode')
        .optional()
        .trim()
        .isLength({ min: 5, max: 10 })
        .withMessage('Mã bưu điện phải có từ 5-10 ký tự'),

    body('address.country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Quốc gia phải có từ 2-50 ký tự'),

    validate
];

// Validation cho change password
export const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Mật khẩu hiện tại không được để trống'),

    body('newPassword')
        .isLength({ min: 6, max: 128 })
        .withMessage('Mật khẩu mới phải có từ 6-128 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Xác nhận mật khẩu không khớp');
            }
            return true;
        }),

    validate
];