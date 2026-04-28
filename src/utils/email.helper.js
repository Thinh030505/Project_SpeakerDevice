import bcrypt from 'bcrypt';
import env from '../config/env.js';

/**
 * Sinh mã OTP ngẫu nhiên 6 chữ số.
 * @returns {string}
 */
export const generateOTP = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Hash OTP bằng bcrypt trước khi lưu vào DB.
 * @param {string} otp
 * @returns {Promise<string>}
 */
export const hashOTP = async (otp) => {
    return bcrypt.hash(otp, env.bcryptSaltRounds);
};

/**
 * So sánh OTP người dùng nhập với OTP đã hash trong DB.
 * @param {string} otp
 * @param {string} hashedOTP
 * @returns {Promise<boolean>}
 */
export const compareOTP = async (otp, hashedOTP) => {
    return bcrypt.compare(otp, hashedOTP);
};

/**
 * Kiểm tra OTP đã hết hạn chưa.
 * @param {Date|string} createdAt
 * @param {number} minutesLimit
 * @returns {boolean}
 */
export const isOTPExpired = (createdAt, minutesLimit = 5) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMs = now - created;
    const diffMin = diffMs / (1000 * 60);
    return diffMin > minutesLimit;
};
