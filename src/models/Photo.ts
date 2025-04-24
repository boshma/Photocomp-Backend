import { v4 as uuidv4 } from 'uuid';

export interface PhotoSizes {
    original: string; // Original upload URL
    thumbnail?: string; // Small thumbnail (e.g., 200px width)
    medium?: string; // Medium size (e.g., 800px width)
    large?: string; // Large size (e.g., 1600px width)
}

export interface Photo {
    // Primary keys
    PK: string; // PHOTO#<PhotoID>
    SK: string; // ENTITY

    // Attributes
    id: string;
    eventId: string;
    url: string; // Original URL (kept for backwards compatibility)
    urls?: PhotoSizes; // New field containing all image size URLs
    createdAt: string;
    updatedAt: string;
    uploadedBy: string;

    // Optional metadata
    metadata?: {
        title?: string;
        description?: string;
        size?: number;
        width?: number;
        height?: number;
        mimeType?: string;
        s3Key?: string;
        s3Keys?: { // Store S3 keys for different sizes
            original?: string;
            thumbnail?: string;
            medium?: string;
            large?: string;
        };
    };

    // GSI for querying photos by event
    GSI2PK: string; // EVENT#<EventID>
    GSI2SK: string; // PHOTO#<PhotoID>
}

export interface PhotoUploadRequest {
    eventId: string;
    title?: string;
    description?: string;
}

export const createPhoto = (
    photoId: string,
    eventId: string,
    url: string,
    uploadedBy: string,
    urls?: PhotoSizes,
    metadata?: {
        title?: string;
        description?: string;
        size?: number;
        width?: number;
        height?: number;
        mimeType?: string;
        s3Key?: string;
        s3Keys?: {
            original?: string;
            thumbnail?: string;
            medium?: string;
            large?: string;
        };
    }
): Photo => {
    const now = new Date().toISOString();

    return {
        PK: `PHOTO#${photoId}`,
        SK: 'ENTITY',
        id: photoId,
        eventId,
        url, // Keep original url for backward compatibility
        urls, // Add new urls field for different sizes
        createdAt: now,
        updatedAt: now,
        uploadedBy,
        metadata,
        GSI2PK: `EVENT#${eventId}`,
        GSI2SK: `PHOTO#${photoId}`,
    };
};