import { v4 as uuidv4 } from 'uuid';

export interface Tag {
    // Primary keys
    PK: string; // TAG#<UserID>
    SK: string; // ENTITY

    // Attributes
    id: string;
    userId: string;
    photoId: string;
    eventId: string;
    taggedBy: string; // ID of the user who created the tag
    taggedAt: string; // ISO timestamp

    // GSI for querying tags by photo
    GSI1PK: string; // PHOTO#<PhotoID>
    GSI1SK: string; // TAG#<UserID>
}

export interface TagRequest {
    userIds: string[]; // Array of user IDs to tag
    photoId: string;
    eventId: string;
}

export const createTag = (
    userId: string,
    photoId: string,
    eventId: string,
    taggedBy: string
): Tag => {
    const id = uuidv4();
    const now = new Date().toISOString();

    return {
        PK: `TAG#${userId}`,
        SK: 'ENTITY',
        id,
        userId,
        photoId,
        eventId,
        taggedBy,
        taggedAt: now,
        GSI1PK: `PHOTO#${photoId}`,
        GSI1SK: `TAG#${userId}`,
    };
};
