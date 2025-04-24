import { Request, Response, NextFunction, Router } from 'express';
import { PhotoService } from '../services/photoService';
import { AppError } from '../middleware/errorHandler';
import { checkOrgMember } from '../middleware/OrgMiddleware';

const photoService = new PhotoService();
export const orgPhotosRouter = Router({ mergeParams: true });

/**
 * Get all photos for an organization across all events
 * @route GET /organizations/:orgId/photos
 */
orgPhotosRouter.get(
    '/',
    checkOrgMember,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.orgId;
            const user = res.locals.user.info;
            
            // Optional parameter to specify preferred image size
            const preferredSize = req.query.size as string || 'medium';
            
            const { photos, events } = await photoService.getAllOrganizationPhotos(
                orgName,
                user.id
            );

            // Add event information to each photo for the response
            const photosWithEventInfo = photos.map(photo => {
                const event = events.get(photo.eventId);
                
                // Determine the appropriate URL based on the requested size
                let displayUrl = photo.url; // Default to original URL for backward compatibility
                
                // Use the requested size if available
                if (photo.urls && photo.urls[preferredSize as keyof typeof photo.urls]) {
                    displayUrl = photo.urls[preferredSize as keyof typeof photo.urls] as string;
                } else if (photo.urls && photo.urls.original) {
                    // Fallback to original if the requested size is not available
                    displayUrl = photo.urls.original;
                }
                
                return {
                    ...photo,
                    displayUrl, // Add the chosen display URL
                    availableSizes: photo.urls ? Object.keys(photo.urls) : ['original'],
                    dimensions: photo.metadata ? {
                        width: photo.metadata.width,
                        height: photo.metadata.height
                    } : undefined,
                    event: event
                        ? {
                              id: event.id,
                              title: event.title,
                              date: event.date,
                          }
                        : null,
                };
            });

            return res.status(200).json({
                status: 'success',
                data: {
                    photos: photosWithEventInfo,
                    count: photos.length,
                    preferredSize,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);