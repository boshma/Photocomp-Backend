import { dynamoDb, TABLE_NAME } from '../config/db';
import { Tag } from '../models/Tag';
import {
    PutCommand,
    QueryCommand,
    GetCommand,
    DeleteCommand,
    BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../util/logger';

export class TagRepository {
    /**
     * Creates a new tag in the database
     * @param tag The tag to create
     * @returns The created tag
     */
    async createTag(tag: Tag): Promise<Tag> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: tag,
                    // Add a conditional expression to prevent duplicates
                    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
                })
            );
            return tag;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError('User is already tagged in this photo', 409);
            }
            throw new AppError(`Failed to create tag: ${error.message}`, 500);
        }
    }

    /**
     * Creates multiple tags in a batch operation
     * @param tags Array of tags to create
     * @returns True if successful
     */
    async batchCreateTags(tags: Tag[]): Promise<boolean> {
        try {
            // DynamoDB batch operations have a limit of 25 items
            const chunks: Tag[][] = [];
            for (let i = 0; i < tags.length; i += 25) {
                chunks.push(tags.slice(i, i + 25));
            }

            // Process each chunk
            for (const chunk of chunks) {
                const putRequests = chunk.map(tag => ({
                    PutRequest: {
                        Item: tag,
                    },
                }));

                const params = {
                    RequestItems: {
                        [TABLE_NAME as string]: putRequests,
                    },
                };

                await dynamoDb.send(new BatchWriteCommand(params));
            }

            return true;
        } catch (error: any) {
            logger.error('Error creating batch tags:', error);
            throw new AppError(`Failed to create tags in batch: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all photos a user is tagged in
     * @param userId The user's ID
     * @returns Array of tags containing photo information
     */
    async getTagsByUser(userId: string): Promise<Tag[]> {
        try {
            const response = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: 'PK = :pk AND SK = :sk',
                    ExpressionAttributeValues: {
                        ':pk': `TAG#${userId}`,
                        ':sk': 'ENTITY',
                    },
                })
            );

            return (response.Items || []) as Tag[];
        } catch (error: any) {
            logger.error('Error getting user tags:', error);
            throw new AppError(`Failed to retrieve user tags: ${error.message}`, 500);
        }
    }

    /**
     * Retrieves all users tagged in a photo
     * @param photoId The photo's ID
     * @returns Array of tags containing user information
     */
    async getTagsByPhoto(photoId: string): Promise<Tag[]> {
        try {
            const response = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'GSI1PK-GSI1SK-INDEX',
                    KeyConditionExpression: 'GSI1PK = :pk',
                    ExpressionAttributeValues: {
                        ':pk': `PHOTO#${photoId}`,
                    },
                })
            );

            return (response.Items || []) as Tag[];
        } catch (error: any) {
            logger.error('Error getting photo tags:', error);
            throw new AppError(`Failed to retrieve photo tags: ${error.message}`, 500);
        }
    }

    /**
     * Deletes a tag (removes a user from a photo)
     * @param userId The user's ID
     * @param photoId The photo's ID
     * @returns True if successful
     */
    async deleteTag(userId: string): Promise<boolean> {
        try {
            await dynamoDb.send(
                new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `TAG#${userId}`,
                        SK: 'ENTITY',
                    },
                })
            );
            return true;
        } catch (error: any) {
            logger.error('Error deleting tag:', error);
            throw new AppError(`Failed to delete tag: ${error.message}`, 500);
        }
    }

    /**
     * Checks if a tag exists for a user and photo
     * @param userId The user's ID
     * @param photoId The photo's ID
     * @returns The tag if it exists, null otherwise
     */
    async getTagByUserAndPhoto(userId: string, photoId: string): Promise<Tag | null> {
        try {
            // First get the tag by user ID
            const userTag = await dynamoDb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `TAG#${userId}`,
                        SK: 'ENTITY',
                    },
                })
            );

            // Return null if no tag exists
            if (!userTag.Item) {
                return null;
            }

            const tag = userTag.Item as Tag;

            // Check if this tag is for the specified photo
            if (tag.photoId === photoId) {
                return tag;
            }

            return null;
        } catch (error: any) {
            logger.error('Error checking tag existence:', error);
            throw new AppError(`Failed to check tag existence: ${error.message}`, 500);
        }
    }
}
