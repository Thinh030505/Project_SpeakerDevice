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
            message: 'Dữ liệu địa chỉ không hợp lệ',
            errors: formattedErrors
        });
    }

    next();
};

// Validation cho address - chỉ validate dữ liệu
export const addressValidation = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Họ tên không được để trống')
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải có từ 2-100 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Số điện thoại không được để trống')
        .custom((value) => {
            // Loại bỏ các ký tự không phải số
            const cleanPhone = value.replace(/[\s\-()]/g, '');

            // Regex cho số điện thoại Việt Nam
            const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Số điện thoại không hợp lệ. Định dạng: 0901234567 hoặc +84901234567');
            }

            // Kiểm tra đầu số hợp lệ của Việt Nam
            const validPrefixes = [
                '032', '033', '034', '035', '036', '037', '038', '039', // Viettel
                '070', '079', '077', '076', '078', // Mobifone
                '083', '084', '085', '081', '082', // Vinaphone
                '056', '058', // Vietnamobile
                '059', // Gmobile
                '099', '098', '097', '096', '086', // Viettel cũ
                '090', '093', '089', '088', // Mobifone cũ
                '091', '094', '092', '095', '087' // Vinaphone cũ
            ];

            let phoneToCheck = cleanPhone;
            if (phoneToCheck.startsWith('+84')) {
                phoneToCheck = '0' + phoneToCheck.substring(3);
            }

            const prefix = phoneToCheck.substring(0, 3);
            if (!validPrefixes.includes(prefix)) {
                throw new Error('Đầu số điện thoại không hợp lệ');
            }

            return true;
        }),

    body('address')
        .trim()
        .notEmpty()
        .withMessage('Địa chỉ không được để trống')
        .isLength({ min: 10, max: 300 })
        .withMessage('Địa chỉ phải có từ 10-300 ký tự'),

    body('ward')
        .trim()
        .notEmpty()
        .withMessage('Phường/Xã không được để trống')
        .isLength({ min: 2, max: 100 })
        .withMessage('Phường/Xã phải có từ 2-100 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\.]+$/)
        .withMessage('Phường/Xã chỉ được chứa chữ cái, số, khoảng trắng, dấu gạch ngang và dấu chấm'),

    body('district')
        .trim()
        .notEmpty()
        .withMessage('Quận/Huyện không được để trống')
        .isLength({ min: 2, max: 100 })
        .withMessage('Quận/Huyện phải có từ 2-100 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\.]+$/)
        .withMessage('Quận/Huyện chỉ được chứa chữ cái, số, khoảng trắng, dấu gạch ngang và dấu chấm'),

    body('city')
        .trim()
        .notEmpty()
        .withMessage('Tỉnh/Thành phố không được để trống')
        .isLength({ min: 2, max: 100 })
        .withMessage('Tỉnh/Thành phố phải có từ 2-100 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\.]+$/)
        .withMessage('Tỉnh/Thành phố chỉ được chứa chữ cái, số, khoảng trắng, dấu gạch ngang và dấu chấm'),

    body('note')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được quá 500 ký tự'),

    body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('Trường isDefault phải là true hoặc false'),

    body('addressNew')
        .optional()
        .isBoolean()
        .withMessage('Trường addressNew phải là true hoặc false'),

    validate
];

// Validation cho update address
export const updateAddressValidation = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải có từ 2-100 ký tự')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage('Họ tên chỉ được chứa chữ cái và khoảng trắng'),

    body('phone')
        .optional()
        .trim()
        .custom((value) => {
            if (!value) return true; // Optional field

            const cleanPhone = value.replace(/[\s\-()]/g, '');
            const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;

            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Số điện thoại không hợp lệ. Định dạng: 0901234567 hoặc +84901234567');
            }
            return true;
        }),

    body('address')
        .optional()
        .trim()
        .isLength({ min: 10, max: 300 })
        .withMessage('Địa chỉ phải có từ 10-300 ký tự'),

    body('ward')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Phường/Xã phải có từ 2-100 ký tự'),

    body('district')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Quận/Huyện phải có từ 2-100 ký tự'),

    body('city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Tỉnh/Thành phố phải có từ 2-100 ký tự'),

    body('note')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được quá 500 ký tự'),

    body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('Trường isDefault phải là true hoặc false'),

    validate
];