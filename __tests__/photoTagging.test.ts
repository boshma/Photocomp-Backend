// Mock the modules before any imports
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg'),
}));

// Mock DynamoDB and related modules
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({
            send: jest.fn(),
        }),
    },
    PutCommand: jest.fn(),
    QueryCommand: jest.fn(),
    GetCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    BatchWriteCommand: jest.fn(),
}));

// Mock config modules
jest.mock('../src/config/db', () => ({
    dynamoDb: {
        send: jest.fn(),
    },
    TABLE_NAME: 'test-table',
}));

jest.mock('../src/config/s3', () => ({
    s3Client: {
        send: jest.fn().mockResolvedValue({}),
    },
    getSignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/photo.jpg'),
    S3_BUCKET_NAME: 'test-bucket',
}));

// Mock the UserService
jest.mock('../src/services/userService', () => {
    return {
        UserService: jest.fn().mockImplementation(() => {
            return {
                getUserByEmail: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        id: 'test-user-id',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'ADMIN',
                    });
                }),
                getUserById: jest.fn().mockImplementation(userId => {
                    return Promise.resolve({
                        id: userId,
                        email: `${userId}@example.com`,
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'MEMBER',
                    });
                }),
            };
        }),
    };
});

// Mock the EventService
jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                findEventById: jest.fn().mockImplementation(eventId => {
                    return Promise.resolve({
                        id: eventId,
                        title: 'Test Event',
                        description: 'Test Event Description',
                        isPublic: true,
                    });
                }),
            };
        }),
    };
});

// Mock the auth middleware
jest.mock('../src/middleware/authMiddleware', () => ({
    authenticate: (req: any, res: any, next: any) => next(),
    authorizeAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock the org middleware
jest.mock('../src/middleware/OrgMiddleware', () => ({
    checkOrgAdmin: (req: any, res: any, next: any) => next(),
    checkOrgMember: (req: any, res: any, next: any) => next(),
    validateUserID: (req: any, res: any, next: any) => {
        res.locals.user = {
            info: {
                id: 'test-admin-id',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
            },
        };
        next();
    },
}));

// Mock the TagService
jest.mock('../src/services/tagService', () => {
    return {
        TagService: jest.fn().mockImplementation(() => {
            return {
                tagUsersInPhoto: jest.fn().mockImplementation((tagRequest, taggedBy) => {
                    const tags = tagRequest.userIds.map((userId: string, index: number) => ({
                        id: `tag-${index}`,
                        userId,
                        photoId: tagRequest.photoId,
                        eventId: tagRequest.eventId,
                        taggedBy,
                        taggedAt: new Date().toISOString(),
                    }));
                    return Promise.resolve(tags);
                }),
                getPhotoTags: jest.fn().mockImplementation(photoId => {
                    const tags = [
                        {
                            tag: {
                                id: 'tag-1',
                                userId: 'user-1',
                                photoId,
                                eventId: 'test-event-id',
                                taggedBy: 'test-admin-id',
                                taggedAt: new Date().toISOString(),
                            },
                            user: {
                                id: 'user-1',
                                email: 'user1@example.com',
                                firstName: 'User',
                                lastName: 'One',
                            },
                        },
                        {
                            tag: {
                                id: 'tag-2',
                                userId: 'user-2',
                                photoId,
                                eventId: 'test-event-id',
                                taggedBy: 'test-admin-id',
                                taggedAt: new Date().toISOString(),
                            },
                            user: {
                                id: 'user-2',
                                email: 'user2@example.com',
                                firstName: 'User',
                                lastName: 'Two',
                            },
                        },
                    ];
                    return Promise.resolve(tags);
                }),
                removeTag: jest.fn().mockImplementation((userId, photoId) => {
                    return Promise.resolve(true);
                }),
                getUserTaggedPhotos: jest.fn().mockImplementation(userId => {
                    const photos = [
                        {
                            id: 'photo-1',
                            eventId: 'event-1',
                            url: 'https://presigned-url.example.com/photo1.jpg',
                            uploadedBy: 'test-admin-id',
                            createdAt: new Date().toISOString(),
                            metadata: {
                                title: 'Team Photo',
                                description: 'Annual company picnic',
                            },
                        },
                        {
                            id: 'photo-2',
                            eventId: 'event-2',
                            url: 'https://presigned-url.example.com/photo2.jpg',
                            uploadedBy: 'test-admin-id',
                            createdAt: new Date().toISOString(),
                            metadata: {
                                title: 'Award Ceremony',
                                description: 'Employee recognition event',
                            },
                        },
                    ];
                    return Promise.resolve(photos);
                }),
            };
        }),
    };
});

// Mock the PhotoRepository
jest.mock('../src/repositories/photoRepository', () => {
    return {
        PhotoRepository: jest.fn().mockImplementation(() => {
            return {
                getPhotoById: jest.fn().mockImplementation(photoId => {
                    return Promise.resolve({
                        id: photoId,
                        eventId: 'test-event-id',
                        url: 'https://example.com/photo.jpg',
                        uploadedBy: 'test-admin-id',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }),
            };
        }),
    };
});

// Now import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { photoTagsRouter } from '../src/controllers/photoTagsController';
import { userRouter } from '../src/controllers/userController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

// Cast the mock for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Photo Tagging Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testPhotoId = 'test-photo-id';
    const testUserId = 'test-user-id';
    const testAdminId = 'test-admin-id';

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());

        // Set up middleware to properly populate res.locals with user info
        app.use((req, res, next) => {
            res.locals.user = {
                id: testAdminId,
                email: 'admin@example.com',
                role: 'ADMIN',
                info: {
                    id: testAdminId,
                    email: 'admin@example.com',
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                },
            };
            next();
        });

        // Mount photo tagging routes
        app.use('/organizations/:id/events/:eventId/photos/:photoId/tags', photoTagsRouter);
        app.use('/users', userRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    describe('GET /organizations/:id/events/:eventId/photos/:photoId/tags', () => {
        it('should retrieve all users tagged in a photo', async () => {
            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/tags`)
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.data.tags).toBeDefined();
            expect(response.body.data.tags.length).toBe(2);
            expect(response.body.data.tags[0].tag).toBeDefined();
            expect(response.body.data.tags[0].user).toBeDefined();
            expect(response.body.data.tags[0].tag.photoId).toBe(testPhotoId);
        });
    });

    describe('POST /organizations/:id/events/:eventId/photos/:photoId/tags', () => {
        it('should tag multiple users in a photo', async () => {
            const userIds = ['user-1', 'user-2', 'user-3'];

            const response = await request(app)
                .post(
                    `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/tags`
                )
                .set('Authorization', 'Bearer valid-token')
                .send({ userIds })
                .expect(201);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe(`Tagged ${userIds.length} users in photo`);
            expect(response.body.data.tags).toBeDefined();
            expect(response.body.data.tags.length).toBe(userIds.length);
            expect(response.body.data.tags[0].userId).toBe(userIds[0]);
            expect(response.body.data.tags[0].photoId).toBe(testPhotoId);
            expect(response.body.data.tags[0].eventId).toBe(testEventId);
        });

        it('should return 400 if userIds array is empty', async () => {
            const response = await request(app)
                .post(
                    `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/tags`
                )
                .set('Authorization', 'Bearer valid-token')
                .send({ userIds: [] })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('A list of user IDs is required');
        });
    });

    describe('DELETE /organizations/:id/events/:eventId/photos/:photoId/tags/:userId', () => {
        it('should remove a tag (untag a user from a photo)', async () => {
            const userIdToUntag = 'user-1';

            const response = await request(app)
                .delete(
                    `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/tags/${userIdToUntag}`
                )
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User untagged from photo successfully');
        });
    });

    describe('GET /users/:userId/tagged-photos', () => {
        it('should get all photos a user is tagged in', async () => {
            // Create a separate app for user routes
            const userApp = express();
            userApp.use(express.json());

            // Set up middleware to properly populate res.locals with user info
            userApp.use((req, res, next) => {
                res.locals.user = {
                    id: testUserId,
                    email: 'user@example.com',
                    role: 'MEMBER',
                };
                next();
            });

            userApp.use('/users', userRouter);
            userApp.use(errorHandler);

            const response = await request(userApp)
                .get(`/users/${testUserId}/tagged-photos`)
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);
            expect(response.body.data.count).toBe(2);
            expect(response.body.data.photos[0].id).toBe('photo-1');
            expect(response.body.data.photos[1].id).toBe('photo-2');
        });

        it("should return 403 if user tries to view another user's tagged photos", async () => {
            // Create a separate app for user routes with different user
            const userApp = express();
            userApp.use(express.json());

            // Set up middleware to populate res.locals with a different user
            userApp.use((req, res, next) => {
                res.locals.user = {
                    id: 'different-user-id',
                    email: 'different@example.com',
                    role: 'MEMBER',
                };
                next();
            });

            userApp.use('/users', userRouter);
            userApp.use(errorHandler);

            const response = await request(userApp)
                .get(`/users/${testUserId}/tagged-photos`)
                .set('Authorization', 'Bearer valid-token')
                .expect(403);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('You can only view your own tagged photos');
        });
    });
});
