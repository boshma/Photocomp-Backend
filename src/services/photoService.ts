import { v4 as uuidv4 } from 'uuid';
import { PhotoRepository } from '../repositories/photoRepository';
import { S3Service } from './s3Service';
import { Photo, createPhoto, PhotoSizes } from '../models/Photo';
import { AppError } from '../middleware/errorHandler';
import { EventService } from './eventService';
import { logger } from '../util/logger';
import { EventRepository } from '../repositories/eventRepository';
import { Event as EventModel } from '../models/Event';
import { OrgService } from './orgService';
import { ImageService } from './imageService';

export class PhotoService {
    private photoRepository: PhotoRepository;
    private s3Service: S3Service;
    private eventService: EventService;
    private eventRepository: EventRepository;
    private imageService: ImageService;

    constructor(
        photoRepository: PhotoRepository = new PhotoRepository(),
        s3Service: S3Service = new S3Service(),
        eventService: EventService = new EventService(),
        eventRepository: EventRepository = new EventRepository(),
        imageService: ImageService = new ImageService()
    ) {
        this.photoRepository = photoRepository;
        this.s3Service = s3Service;
        this.eventService = eventService;
        this.eventRepository = eventRepository;
        this.imageService = imageService;
    }

     /**
     * Upload a photo for an event
     * Enhanced to handle either a single file or multiple files within the same request
     * 
     * @param photoId The unique ID for the photo (or null if batch upload)
     * @param eventId The event ID the photo belongs to
     * @param fileBuffer The file buffer containing the photo data
     * @param mimeType The MIME type of the photo
     * @param uploadedBy The user ID of who uploaded the photo
     * @param metadata Additional metadata for the photo
     * @returns The created photo object or array of photo objects
     */
     async uploadPhoto(
        photoId: string | null,
        eventId: string,
        fileBuffer: Buffer | Buffer[],
        mimeType: string | string[],
        uploadedBy: string,
        metadata?: {
            title?: string;
            description?: string;
            size?: number;
            mimeType?: string;
            s3Key?: string;
        }
    ): Promise<Photo | Photo[]> {
        try {
            // Verify that the event exists
            const event = await this.eventService.findEventById(eventId);
            if (!event) {
                throw new AppError(`Event not found: ${eventId}`, 404);
            }

            // Check if we're handling a single file or multiple files
            if (!Array.isArray(fileBuffer)) {
                // Single file upload - use existing logic
                const id = photoId || uuidv4();
                const singleMimeType = Array.isArray(mimeType) ? mimeType[0] : mimeType;
                return await this.processSinglePhoto(id, eventId, fileBuffer, singleMimeType, uploadedBy, metadata);
            } else {
                // Multiple file upload - process each file
                const photoPromises: Promise<Photo>[] = [];
                
                for (let i = 0; i < fileBuffer.length; i++) {
                    const id = uuidv4(); // Generate a new ID for each photo
                    const buffer = fileBuffer[i];
                    const mime = Array.isArray(mimeType) ? mimeType[i] : mimeType;
                    
                    // Use the same metadata for all photos in the batch
                    photoPromises.push(this.processSinglePhoto(id, eventId, buffer, mime, uploadedBy, metadata));
                }
                
                return await Promise.all(photoPromises);
            }
        } catch (error) {
            logger.error('Error uploading photo:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to upload photo: ${(error as Error).message}`, 500);
        }
    }
    
    /**
     * Process a single photo upload
     * Helper method to keep code DRY
     */
    private async processSinglePhoto(
        id: string,
        eventId: string,
        buffer: Buffer,
        mimeType: string,
        uploadedBy: string,
        metadata?: {
            title?: string;
            description?: string;
            size?: number;
            mimeType?: string;
            s3Key?: string;
        }
    ): Promise<Photo> {
        // Create the base S3 key using a structured pattern
        const fileExtension = mimeType.split('/')[1] || 'jpg';
        const baseS3Key = `photos/${eventId}/${id}`;

        // Get original image info
        const imageInfo = await this.imageService.getImageInfo(buffer);

        // Generate different sizes of the image
        const {
            buffers,
            s3Keys,
            dimensions
        } = await this.imageService.generateImageSizes(buffer, baseS3Key, fileExtension);

        // Upload all sizes to S3
        await this.s3Service.uploadResizedImages(buffers, s3Keys, mimeType);

        // Generate pre-signed URLs for all sizes
        const urls = await this.s3Service.getMultiplePreSignedUrls(s3Keys);

        // Add S3 keys and dimensions to metadata
        const updatedMetadata = {
            ...(metadata || {}),
            width: imageInfo.width,
            height: imageInfo.height,
            size: imageInfo.size,
            mimeType: mimeType,
            s3Key: s3Keys.original, // Keep original s3Key for backward compatibility
            s3Keys: s3Keys // Store all S3 keys
        };

        // Create and save the photo record
        const photo = createPhoto(
            id, 
            eventId, 
            urls.original, // Keep original URL for backward compatibility
            uploadedBy,
            urls, // Add URLs for all sizes
            updatedMetadata
        );

        await this.photoRepository.createPhoto(photo);
        return photo;
    }

    /**
     * Get all photos for an event
     * @param eventId The event ID to get photos for
     * @returns Array of photos for the event
     */
    async getEventPhotos(eventId: string): Promise<Photo[]> {
        try {
            // Verify that the event exists
            const event = await this.eventService.findEventById(eventId);
            if (!event) {
                throw new AppError(`Event not found: ${eventId}`, 404);
            }

            // Get all photos for the event with better error handling
            try {
                const photos = await this.photoRepository.getPhotosByEvent(eventId);

                // Ensure photos is an array
                if (!Array.isArray(photos)) {
                    logger.warn(`Expected photos to be an array, but got: ${typeof photos}`);
                    return [];
                }

                // Refresh pre-signed URLs for all photos
                for (const photo of photos) {
                    try {
                        // Check if the photo has the new urls structure
                        if (photo.metadata?.s3Keys) {
                            // Generate fresh pre-signed URLs for all sizes
                            photo.urls = await this.s3Service.getMultiplePreSignedUrls(photo.metadata.s3Keys);
                            // Update the main URL to be the original for backward compatibility
                            photo.url = photo.urls.original;
                        } else if (photo?.metadata?.s3Key) {
                            // Legacy photo - just update the main URL
                            photo.url = await this.s3Service.getLogoPreSignedUrl(photo.metadata.s3Key);
                        } else if (photo?.url) {
                            // Very old format - try to extract the key from the URL
                            try {
                                const urlParts = new URL(photo.url);
                                const s3Key = urlParts.pathname.substring(1); // Remove leading slash
                                photo.url = await this.s3Service.getLogoPreSignedUrl(s3Key);
                            } catch (error) {
                                logger.error(`Error refreshing pre-signed URL for photo: ${error}`);
                                // Keep original URL if parsing fails
                            }
                        }
                    } catch (error) {
                        logger.error(`Error refreshing pre-signed URL: ${error}`);
                        // Continue processing other photos even if one fails
                    }
                }

                return photos;
            } catch (error) {
                logger.error(`Error in photoRepository.getPhotosByEvent: ${error}`);
                // Return empty array on repository error to prevent controller failure
                return [];
            }
        } catch (error) {
            logger.error('Error getting event photos:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get event photos: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Delete a photo and all its sizes
     * @param photoId The ID of the photo to delete
     * @param eventId The event ID the photo belongs to (for validation)
     */
    async deletePhoto(photoId: string, eventId: string): Promise<void> {
        try {
            // Get the photo to verify it exists and belongs to the right event
            const photo = await this.photoRepository.getPhotoById(photoId);

            if (!photo) {
                throw new AppError(`Photo not found: ${photoId}`, 404);
            }

            if (photo.eventId !== eventId) {
                throw new AppError('Photo does not belong to the specified event', 400);
            }

            // Collect all S3 keys that need to be deleted
            const s3KeysToDelete: string[] = [];

            // Add all sizes from the new format if available
            if (photo.metadata?.s3Keys) {
                Object.values(photo.metadata.s3Keys).forEach(key => {
                    if (key) s3KeysToDelete.push(key);
                });
            } 
            // Add the legacy S3 key if available
            else if (photo.metadata?.s3Key) {
                s3KeysToDelete.push(photo.metadata.s3Key);
            }
            // Try to extract the key from the URL as a last resort
            else if (photo.url) {
                try {
                    const urlParts = new URL(photo.url);
                    const s3Key = urlParts.pathname.substring(1); // Remove leading slash
                    if (s3Key) s3KeysToDelete.push(s3Key);
                } catch (error) {
                    logger.error(`Error parsing photo URL: ${photo.url}`, error);
                }
            }

            // Delete the photo from the database first
            await this.photoRepository.deletePhoto(photoId);

            // Delete all the files from S3
            if (s3KeysToDelete.length > 0) {
                try {
                    await this.s3Service.deleteMultipleFiles(s3KeysToDelete);
                    logger.info(`Deleted photo files from S3: ${s3KeysToDelete.join(', ')}`);
                } catch (error) {
                    logger.error(`Error deleting photo files from S3: ${error}`);
                    // Continue even if S3 deletion fails, as the database record is already deleted
                }
            } else {
                logger.warn(`Could not determine S3 keys for photo: ${photoId}`);
            }
        } catch (error) {
            logger.error('Error deleting photo:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to delete photo: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Validates if a user has access to an event's photos
     * @param eventId The event ID to check access for
     * @param userId The user ID requesting access
     * @returns Boolean indicating if the user has access
     */
    async validateUserEventAccess(eventId: string, userId: string): Promise<boolean> {
        try {
            // Check if the user is attending the event
            const eventUser = await this.eventRepository.findEventUserbyUser(eventId, userId);
            return !!eventUser; // Return true if the user is found, false otherwise
        } catch (error) {
            logger.error('Error validating user event access:', error);
            return false; // Default to no access on error
        }
    }

    /**
     * Gets a download URL for a specific photo
     * @param photoId The ID of the photo to download
     * @param eventId The event ID the photo belongs to (for validation)
     * @param size The size of the photo to download (default: 'original')
     * @returns A pre-signed download URL for the photo
     */
    async getPhotoDownloadUrl(
        photoId: string, 
        eventId: string, 
        size: 'original' | 'thumbnail' | 'medium' | 'large' = 'original'
    ): Promise<string> {
        try {
            // Get the photo to verify it exists and belongs to the right event
            const photo = await this.photoRepository.getPhotoById(photoId);

            if (!photo) {
                throw new AppError(`Photo not found: ${photoId}`, 404);
            }

            if (photo.eventId !== eventId) {
                throw new AppError('Photo does not belong to the specified event', 400);
            }

            // Get the appropriate S3 key based on the requested size
            let s3Key: string | undefined;
            
            if (photo.metadata?.s3Keys && photo.metadata.s3Keys[size]) {
                // Use the requested size if available
                s3Key = photo.metadata.s3Keys[size];
            } else if (photo.metadata?.s3Key) {
                // Fall back to the original key for legacy photos
                s3Key = photo.metadata.s3Key;
            } else if (photo.url) {
                // Try to extract from URL as last resort
                try {
                    const urlParts = new URL(photo.url);
                    s3Key = urlParts.pathname.substring(1); // Remove leading slash
                } catch (error) {
                    logger.error(`Error parsing photo URL: ${photo.url}`, error);
                    throw new AppError('Could not determine photo storage location', 500);
                }
            }

            if (!s3Key) {
                throw new AppError('Photo storage information missing', 500);
            }

            // Generate a filename for the download
            const sizeSuffix = size !== 'original' ? `_${size}` : '';
            const filename = `photo-${photoId}${sizeSuffix}.jpg`;

            // Get a download URL with content-disposition header
            return await this.s3Service.getDownloadUrl(s3Key, filename);
        } catch (error) {
            logger.error('Error generating photo download URL:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Failed to get photo download URL: ${(error as Error).message}`,
                500
            );
        }
    }

    /**
     * Get all photos for an organization across all events
     * @param orgName The organization name
     * @param userId The user ID requesting the photos
     * @returns Array of photos with their associated event information
     */
    async getAllOrganizationPhotos(
        orgName: string,
        userId: string
    ): Promise<{ photos: Photo[]; events: Map<string, EventModel> }> {
        try {
            // Check if the user is a member of the organization
            const orgService = new OrgService();
            const userOrg = await orgService.findSpecificOrgByUser(orgName, userId);

            if (!userOrg) {
                throw new AppError('You are not a member of this organization', 403);
            }

            // Get all events for the organization
            const eventService = new EventService();
            const events = await eventService.getAllOrganizationEvents(orgName);

            if (!events || events.length === 0) {
                return { photos: [], events: new Map() };
            }

            // Create a map of event IDs to event objects for easy reference
            const eventMap = new Map<string, EventModel>();
            events.forEach(event => {
                eventMap.set(event.id, event);
            });

            // Get photos for each event
            const photoPromises = events.map(event =>
                this.photoRepository.getPhotosByEvent(event.id)
            );
            const photoArrays = await Promise.all(photoPromises);

            // Flatten the array of photo arrays
            let allPhotos: Photo[] = [];
            photoArrays.forEach(photos => {
                allPhotos = allPhotos.concat(photos);
            });

            // Refresh pre-signed URLs for all photos
            for (const photo of allPhotos) {
                try {
                    // Check if the photo has the new urls structure
                    if (photo.metadata?.s3Keys) {
                        // Generate fresh pre-signed URLs for all sizes
                        photo.urls = await this.s3Service.getMultiplePreSignedUrls(photo.metadata.s3Keys);
                        // Update the main URL to be the original for backward compatibility
                        photo.url = photo.urls.original;
                    } else if (photo?.metadata?.s3Key) {
                        // Legacy photo - just update the main URL
                        photo.url = await this.s3Service.getLogoPreSignedUrl(photo.metadata.s3Key);
                    }
                } catch (error) {
                    logger.error(`Error refreshing pre-signed URL: ${error}`);
                    // Continue processing other photos even if one fails
                }
            }

            return { photos: allPhotos, events: eventMap };
        } catch (error) {
            logger.error('Error getting organization photos:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                `Failed to get organization photos: ${(error as Error).message}`,
                500
            );
        }
    }
}