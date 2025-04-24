import multer from 'multer';
import { multerConfig } from '../config/multer';
import { AppError } from './errorHandler';
import { NextFunction, Request, Response } from 'express';

// File filter to validate image types
const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed', 400) as unknown as Error);
    }
};

// Create multer middleware with config and file filter
export const uploadMiddleware = multer({
    ...multerConfig,
    fileFilter: fileFilter,
});

// Create a wrapper middleware to handle multer errors
export const handleUpload = (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Check if there's a 'multiple' query parameter to determine upload type
        const isMultiple = req.query.multiple === 'true';
        
        let upload;
        if (isMultiple) {
            // For multiple file uploads - array allows multiple files with the same field name
            upload = uploadMiddleware.array(fieldName, 10); // Allow up to 10 files
        } else {
            // For single file uploads
            upload = uploadMiddleware.single(fieldName);
        }

        upload(req, res, (err: any) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return next(
                            new AppError('File size limit exceeded. Maximum size is 5MB', 400)
                        );
                    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                        return next(
                            new AppError('Too many files uploaded. Maximum is 10 files.', 400)
                        );
                    }
                    return next(new AppError(`Upload error: ${err.message}`, 400));
                }
                return next(err);
            }
            next();
        });
    };
};