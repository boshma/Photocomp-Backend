import { Request, Response, NextFunction, Router } from 'express';
import { PhotoService } from '../services/photoService';
import { PhotoUploadRequest } from '../models/Photo';
import { checkOrgAdmin } from '../middleware/OrgMiddleware';
import { handleUpload } from '../middleware/uploadMiddleware';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const photoService = new PhotoService();
export const photoRouter = Router({ mergeParams: true });

/**
 * Upload a photo to an event - enhanced to handle multiple files
 * POST /events/:eventId/photos
 */
photoRouter.post(
    '/',
    checkOrgAdmin,
    handleUpload('photo'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = req.params.eventId;
            const user = res.locals.user.info;

            // Check if any files were uploaded
            if (!req.file && !req.files) {
                throw new AppError('No photo file uploaded', 400);
            }

            // Handle single file upload case
            if (req.file) {
                const photoId = uuidv4();
                
                const photo = await photoService.uploadPhoto(
                    photoId,
                    eventId,
                    req.file.buffer,
                    req.file.mimetype,
                    user.id,
                    {
                        title: req.body.title,
                        description: req.body.description,
                        size: req.file.size,
                        mimeType: req.file.mimetype,
                    }
                );

                return res.status(201).json({
                    status: 'success',
                    data: {
                        photo,
                    },
                });
            } 
            // Handle multiple file upload case
            else if (req.files) {
                let files: Express.Multer.File[] = [];
                
                // Handle both array and object formats that Multer might return
                if (Array.isArray(req.files)) {
                    // If req.files is already an array of files
                    files = req.files;
                } else {
                    // If req.files is an object with fieldname keys
                    // Get the 'photo' field which contains our files
                    const photoFiles = req.files['photo'];
                    if (Array.isArray(photoFiles)) {
                        files = photoFiles;
                    }
                }
                
                if (files.length === 0) {
                    throw new AppError('No photo files found in upload', 400);
                }
                
                // Prepare arrays for batch processing
                const buffers: Buffer[] = [];
                const mimeTypes: string[] = [];
                
                files.forEach(file => {
                    buffers.push(file.buffer);
                    mimeTypes.push(file.mimetype);
                });
                
                const photos = await photoService.uploadPhoto(
                    null, // We'll generate IDs for each photo inside the service
                    eventId,
                    buffers,
                    mimeTypes,
                    user.id,
                    {
                        title: req.body.title,
                        description: req.body.description,
                    }
                );

                return res.status(201).json({
                    status: 'success',
                    data: {
                        photos, // Return array of photos when batch uploading
                    },
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get all photos for an event
 * GET /events/:eventId/photos
 */
photoRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = req.params.eventId;

        const photos = await photoService.getEventPhotos(eventId);

        return res.status(200).json({
            status: 'success',
            data: {
                photos,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get a download URL for a specific photo
 * GET /events/:eventId/photos/:photoId/download
 */
photoRouter.get('/:photoId/download', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = req.params.eventId;
        const photoId = req.params.photoId;
        const user = res.locals.user.info;

        // Optional size parameter (defaults to 'original' if not provided)
        const size = req.query.size as 'original' | 'thumbnail' | 'medium' | 'large' || 'original';

        if (!['original', 'thumbnail', 'medium', 'large'].includes(size)) {
            throw new AppError('Invalid size parameter. Must be one of: original, thumbnail, medium, large', 400);
        }

        // Check if user has access to the event (is a member or admin)
        const canAccess = await photoService.validateUserEventAccess(eventId, user.id);

        if (!canAccess) {
            throw new AppError('You do not have access to photos from this event', 403);
        }

        // Generate download URL for the requested size
        const downloadUrl = await photoService.getPhotoDownloadUrl(photoId, eventId, size);

        return res.status(200).json({
            status: 'success',
            data: {
                downloadUrl,
                size,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Delete a photo
 * DELETE /events/:eventId/photos/:photoId
 */
photoRouter.delete(
    '/:photoId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const eventId = req.params.eventId;

            await photoService.deletePhoto(photoId, eventId);

            return res.status(200).json({
                status: 'success',
                message: 'Photo deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);