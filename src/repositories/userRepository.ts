import { AppError } from '../middleware/errorHandler';
import { dynamoDb, TABLE_NAME } from '../config/db';
import { User, UserRole } from '../models/User';
import {
    PutCommand,
    QueryCommand,
    GetCommand,
    BatchWriteCommand,
    DeleteCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * Repository class for User-related database operations
 * Handles CRUD operations for user data in DynamoDB
 */
export class UserRepository {
    /**
     * Create a new user in the database
     * @param user The user object to create
     * @returns The created user
     * @throws AppError if user already exists or operation fails
     */
    async createUser(user: User): Promise<User> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: user,
                    ConditionExpression: 'attribute_not_exists(PK)',
                })
            );
            return user;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError('User already exists', 409);
            }
            throw new AppError(`Failed to create user: ${error.message}`, 500);
        }
    }

    /**
     * Find a user by email address
     * @param email Email address to search for
     * @returns The user object or null if not found
     * @throws AppError if operation fails
     */
    async findUserByEmail(email: string): Promise<User | null> {
        try {
            const params = {
                TableName: TABLE_NAME,
                IndexName: 'GSI1PK-GSI1SK-INDEX',
                KeyConditionExpression: 'GSI1PK = :emailKey AND GSI1SK = :entityValue',
                ExpressionAttributeValues: {
                    ':emailKey': `EMAIL#${email}`,
                    ':entityValue': 'ENTITY',
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as User;
        } catch (error: any) {
            throw new AppError(`Failed to find user by email: ${error.message}`, 500);
        }
    }

    /**
     * Get a user by their ID
     * @param userId The user ID to look up
     * @returns The user object or null if not found
     * @throws AppError if operation fails
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            const result = await dynamoDb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: `ENTITY`,
                    },
                })
            );

            if (!result.Item) {
                return null;
            }

            return result.Item as User;
        } catch (error: any) {
            throw new AppError(`Failed to get user by ID: ${error.message}`, 500);
        }
    }

    /**
     * Update a user's password
     * @param userId The ID of the user
     * @param newPassword The new hashed password
     * @returns Boolean indicating success
     * @throws AppError if operation fails
     */
    async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
        try {
            const now = new Date().toISOString();
            
            const result = await dynamoDb.send(
                new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: 'ENTITY',
                    },
                    UpdateExpression: 'SET #password = :password, updatedAt = :updatedAt',
                    ExpressionAttributeNames: {
                        '#password': 'password',
                    },
                    ExpressionAttributeValues: {
                        ':password': newPassword,
                        ':updatedAt': now,
                    },
                    ReturnValues: 'UPDATED_NEW',
                })
            );

            if (!result.Attributes) {
                throw new AppError('Failed to update password', 500);
            }

            return true;
        } catch (error: any) {
            throw new AppError(`Failed to update password: ${error.message}`, 500);
        }
    }

    /**
     * Delete a user from the database
     * @param userId The ID of the user to delete
     * @returns True if successful
     * @throws AppError if operation fails
     */
    async deleteUser(userId: string): Promise<boolean> {
        try {
            // First check if the user exists
            const user = await this.getUserById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Delete the user record using DeleteCommand
            await dynamoDb.send(
                new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: 'ENTITY',
                    },
                })
            );

            // If the user has an email (they should), delete the GSI record too
            if (user.email) {
                await dynamoDb.send(
                    new DeleteCommand({
                        TableName: TABLE_NAME,
                        Key: {
                            PK: `EMAIL#${user.email}`,
                            SK: 'ENTITY',
                        },
                    })
                );
            }

            return true;
        } catch (error: any) {
            throw new AppError(`Failed to delete user: ${error.message}`, 500);
        }
    }

    /**
     * Delete all organization memberships for a user
     * @param userId The ID of the user
     * @returns True if successful
     * @throws AppError if operation fails
     */
    async deleteUserOrganizationMemberships(userId: string): Promise<boolean> {
        try {
            // Make sure TABLE_NAME is defined
            if (!TABLE_NAME) {
                throw new AppError('Table name not configured', 500);
            }

            // First get all organizations the user is a member of
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :userId AND begins_with(SK, :orgPrefix)',
                ExpressionAttributeValues: {
                    ':userId': `USER#${userId}`,
                    ':orgPrefix': 'ORG#',
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            // No memberships found - consider it a success
            if (!result.Items || result.Items.length === 0) {
                return true;
            }

            // Prepare batch request for delete - DynamoDB can handle 25 at a time
            const chunks = [];
            for (let i = 0; i < result.Items.length; i += 25) {
                chunks.push(result.Items.slice(i, i + 25));
            }

            // Process each chunk as a batch
            for (const chunk of chunks) {
                const deleteRequests = chunk.map(item => ({
                    DeleteRequest: {
                        Key: {
                            PK: item.PK,
                            SK: item.SK,
                        },
                    },
                }));

                const requestItems: Record<string, any> = {};
                requestItems[TABLE_NAME] = deleteRequests;

                await dynamoDb.send(
                    new BatchWriteCommand({
                        RequestItems: requestItems,
                    })
                );
            }

            return true;
        } catch (error: any) {
            throw new AppError(`Failed to delete user memberships: ${error.message}`, 500);
        }
    }

    /**
     * Delete all event attendance records for a user
     * @param userId The ID of the user
     * @returns True if successful
     * @throws AppError if operation fails
     */
    async deleteUserEventAttendance(userId: string): Promise<boolean> {
        try {
            // Make sure TABLE_NAME is defined
            if (!TABLE_NAME) {
                throw new AppError('Table name not configured', 500);
            }

            // First get all events the user is attending
            const params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :userId AND begins_with(SK, :eventPrefix)',
                ExpressionAttributeValues: {
                    ':userId': `USER#${userId}`,
                    ':eventPrefix': 'EVENT#',
                },
            };

            const result = await dynamoDb.send(new QueryCommand(params));

            // No event attendance records found - consider it a success
            if (!result.Items || result.Items.length === 0) {
                return true;
            }

            // Prepare batch request for delete - DynamoDB can handle 25 at a time
            const chunks = [];
            for (let i = 0; i < result.Items.length; i += 25) {
                chunks.push(result.Items.slice(i, i + 25));
            }

            // Process each chunk as a batch
            for (const chunk of chunks) {
                const deleteRequests = chunk.map(item => ({
                    DeleteRequest: {
                        Key: {
                            PK: item.PK,
                            SK: item.SK,
                        },
                    },
                }));

                const requestItems: Record<string, any> = {};
                requestItems[TABLE_NAME] = deleteRequests;

                await dynamoDb.send(
                    new BatchWriteCommand({
                        RequestItems: requestItems,
                    })
                );
            }

            return true;
        } catch (error: any) {
            throw new AppError(
                `Failed to delete user event attendance records: ${error.message}`,
                500
            );
        }
    }
}