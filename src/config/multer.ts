import multer from 'multer';

// Configure storage to memory
const storage = multer.memoryStorage();

// Configure multer with limits
export const multerConfig = {
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
};
