import express from 'express';
import { deleteUser, getAllUsers, updateUser } from '../../controllers/admin/index.js';
import {
    createAddress,
    deleteAddresses,
    getAddressById,
    getAddresses,
    getUserProfile,
    setDefaultAddress,
    updateAddress,
    updateUserProfile,
    uploadUserAvatar
} from '../../controllers/client/index.js';
import { adminOnly, protect, uploadAvatar } from '../../middleware/index.js';
import {
    addressValidation,
    updateAddressValidation,
    updateProfileValidation
} from '../../middleware/validators/index.js';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateProfileValidation, updateUserProfile);
router.post('/upload-avatar', protect, uploadAvatar, uploadUserAvatar);

router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addressValidation, createAddress);
router.put('/addresses/:id/set-default', protect, setDefaultAddress);
router.get('/addresses/:id', protect, getAddressById);
router.put('/addresses/:id', protect, updateAddressValidation, updateAddress);
router.delete('/addresses/:id', protect, deleteAddresses);

router.get('/admin/users', protect, adminOnly, getAllUsers);
router.put('/admin/users/:id', protect, adminOnly, updateUser);
router.delete('/admin/users/:id', protect, adminOnly, deleteUser);

export default router;
