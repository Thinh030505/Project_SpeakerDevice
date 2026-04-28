import { uploadMemory } from '../config/multer.js';

// Middleware for avatar upload
export const uploadAvatar = uploadMemory.single('avatar');