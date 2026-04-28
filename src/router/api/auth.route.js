import express from 'express';
import {
    changePassword,
    deleteAvatar,
    forgotPassword,
    getProfile,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
    updateProfile,
    uploadAvatar,
    validatePhone
} from '../../controllers/client/index.js';
import { uploadMemory } from '../../config/index.js';
import { authenticateToken } from '../../middleware/index.js';
import {
    forgotPasswordValidation,
    loginValidation,
    refreshTokenValidation,
    registerValidation,
    resetPasswordValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Auth routes working!' });
});

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshTokenValidation, refreshToken);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);
router.post('/validate-phone', validatePhone);

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

router.post('/upload-avatar', authenticateToken, uploadMemory.single('avatar'), uploadAvatar);
router.delete('/delete-avatar', authenticateToken, deleteAvatar);

export default router;
