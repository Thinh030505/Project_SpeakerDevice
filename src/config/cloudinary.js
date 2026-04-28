import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import { logDebug, logError } from '../utils/logger.js';

cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret
});

export const uploadToCloudinary = async (file, folder = 'avatars') => {
    try {
        const uploadOptions = {
            folder,
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
            eager_async: false
        };

        if (folder === 'user-avatars') {
            uploadOptions.transformation = [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ];
        }

        let result;

        if (file.buffer) {
            logDebug('Uploading file to Cloudinary from memory buffer.');
            result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, uploadResult) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(uploadResult);
                    }
                );

                uploadStream.on('error', reject);
                uploadStream.end(file.buffer);
            });
        } else if (file.path) {
            logDebug(`Uploading file to Cloudinary from disk path: ${file.path}`);
            result = await cloudinary.uploader.upload(file.path, uploadOptions);
        } else {
            throw new Error('Invalid file format');
        }

        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height
        };
    } catch (error) {
        logError('Cloudinary upload error:', error.message || error);
        return {
            success: false,
            error: error.message || 'Unknown upload error'
        };
    }
};

export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: true,
            result
        };
    } catch (error) {
        logError('Cloudinary delete error:', error.message || error);
        return {
            success: false,
            error: error.message
        };
    }
};

export default cloudinary;
