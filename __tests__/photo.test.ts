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
}));

// Mock multer
jest.mock('multer', () => {
    const multerMock = () => ({
        single: () => (req: any, res: any, next: any) => {
            // Mock file object that multer would create
            req.file = {
                buffer: Buffer.from('mock file content'),
                mimetype: 'image/jpeg',
                size: 1024 * 10, // 10KB
            };
            next();
        },
    });
    multerMock.memoryStorage = jest.fn();
    return multerMock;
});

// Mock UUID for controlled test values
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('test-photo-uuid'),
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

// IMPORTANT: Mock UserService and its getUserByEmail method
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
            };
        }),
    };
});

// Mock EventService with findEventById method
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
                        PK: `EVENT#${eventId}`,
                        SK: 'ENTITY',
                    });
                }),
                findEventUserbyUser: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        PK: 'USER#test-user-id',
                        SK: 'EVENT#test-event-id',
                    });
                }),
            };
        }),
    };
});

// Mock the validation middleware from orgController
jest.mock('../src/controllers/orgController', () => {
    return {
        validateUserID: (req: any, res: any, next: any) => {
            // Mock user data without making actual service call
            res.locals.user = {
                info: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ADMIN',
                },
            };
            next();
        },
        orgRouter: jest.fn(),
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
                id: 'test-user-id',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'ADMIN',
            },
        };
        next();
    },
}));

// Mock the upload middleware
jest.mock('../src/middleware/uploadMiddleware', () => ({
    handleUpload: () => (req: any, res: any, next: any) => {
        req.file = {
            buffer: Buffer.from('mock file content'),
            mimetype: 'image/jpeg',
            size: 1024 * 10, // 10KB
        };
        next();
    },
}));

jest.mock('../src/repositories/photoRepository', () => {
    // Create a mock implementation of the PhotoRepository class
    return {
        PhotoRepository: jest.fn().mockImplementation(() => {
            return {
                getEventPhotos: jest.fn().mockImplementation(eventId => {
                    return Promise.resolve([
                        {
                            id: 'photo-1',
                            PK: 'PHOTO#photo-1',
                            SK: 'ENTITY',
                            eventId: eventId,
                            url: 'https://presigned-url.example.com/photo1.jpg',
                            uploadedBy: 'test-user-id',
                            createdAt: '2023-01-01T00:00:00.000Z',
                            updatedAt: '2023-01-01T00:00:00.000Z',
                            GSI2PK: `EVENT#${eventId}`,
                            GSI2SK: 'PHOTO#photo-1',
                            metadata: {
                                title: 'Test Photo 1',
                                description: 'Test Photo Description 1',
                                s3Key: `photos/${eventId}/photo-1.jpg`,
                            },
                        },
                        {
                            id: 'photo-2',
                            PK: 'PHOTO#photo-2',
                            SK: 'ENTITY',
                            eventId: eventId,
                            url: 'https://presigned-url.example.com/photo2.jpg',
                            uploadedBy: 'test-user-id',
                            createdAt: '2023-01-01T00:00:00.000Z',
                            updatedAt: '2023-01-01T00:00:00.000Z',
                            GSI2PK: `EVENT#${eventId}`,
                            GSI2SK: 'PHOTO#photo-2',
                            metadata: {
                                title: 'Test Photo 2',
                                description: 'Test Photo Description 2',
                                s3Key: `photos/${eventId}/photo-2.jpg`,
                            },
                        },
                    ]);
                }),
                getPhotoById: jest.fn().mockImplementation(photoId => {
                    return Promise.resolve({
                        id: photoId,
                        PK: `PHOTO#${photoId}`,
                        SK: 'ENTITY',
                        eventId: 'test-event-id',
                        url: 'https://presigned-url.example.com/photo.jpg',
                        uploadedBy: 'test-user-id',
                        createdAt: '2023-01-01T00:00:00.000Z',
                        updatedAt: '2023-01-01T00:00:00.000Z',
                        metadata: {
                            title: 'Test Photo',
                            description: 'Test Photo Description',
                            s3Key: `photos/test-event-id/${photoId}.jpg`,
                        },
                        GSI2PK: `EVENT#test-event-id`,
                        GSI2SK: `PHOTO#${photoId}`,
                    });
                }),
                createPhoto: jest.fn().mockImplementation(photo => {
                    return Promise.resolve(photo);
                }),
                deletePhoto: jest.fn().mockImplementation(() => {
                    return Promise.resolve();
                }),
            };
        }),
    };
});

// Mock the PhotoService to avoid actual implementation calls
jest.mock('../src/services/photoService', () => {
    return {
        PhotoService: jest.fn().mockImplementation(() => {
            return {
                uploadPhoto: jest
                    .fn()
                    .mockImplementation((photoId, eventId, buffer, mimetype, userId, metadata) => {
                        return Promise.resolve({
                            id: photoId,
                            eventId: eventId,
                            url: 'https://presigned-url.example.com/photo.jpg',
                            uploadedBy: userId,
                            metadata: {
                                ...metadata,
                                s3Key: `photos/${eventId}/${photoId}.jpg`,
                            },
                        });
                    }),
                getEventPhotos: jest.fn().mockImplementation(eventId => {
                    return Promise.resolve([
                        {
                            id: 'photo-1',
                            eventId: eventId,
                            url: 'https://presigned-url.example.com/photo1.jpg',
                            metadata: { title: 'Test Photo 1' },
                        },
                        {
                            id: 'photo-2',
                            eventId: eventId,
                            url: 'https://presigned-url.example.com/photo2.jpg',
                            metadata: { title: 'Test Photo 2' },
                        },
                    ]);
                }),
                validateUserEventAccess: jest.fn().mockResolvedValue(true),
                getPhotoDownloadUrl: jest
                    .fn()
                    .mockResolvedValue('https://download-url.example.com/photo.jpg'),
                deletePhoto: jest.fn().mockResolvedValue(undefined),
            };
        }),
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { dynamoDb } from '../src/config/db';
import { photoRouter } from '../src/controllers/photoController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

// Cast mocks for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Photo Controller Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testUserId = 'test-user-id';

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
        app.use(express.urlencoded({ extended: true }));

        // Set up middleware to properly populate res.locals with user info
        app.use((req, res, next) => {
            // Properly set up res.locals user object with nested info property
            res.locals.user = {
                id: testUserId,
                email: 'test@example.com',
                role: 'ADMIN',
                info: {
                    id: testUserId,
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'ADMIN',
                },
            };
            next();
        });

        // Mount the routes
        app.use('/organizations/:id/events/:eventId/photos', photoRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    // Increase the timeout for all tests
    jest.setTimeout(10000);

    describe('POST /:id/events/:eventId/photos', () => {
        it('should upload a photo successfully', async () => {
            // Mock DynamoDB responses for the entire flow
            mockDynamoSend.mockResolvedValueOnce({});

            const response = await request(app)
                .post(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .field('title', 'Test Photo')
                .field('description', 'Test Photo Description')
                .attach('photo', Buffer.from('mock file content'), 'test-photo.jpg')
                .expect(201);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photo).toBeDefined();
        });
    });

    describe('GET /:id/events/:eventId/photos', () => {
        it('should retrieve photos for an event successfully', async () => {
            const response = await request(app)
                .get(`/organizations/${testOrgId}/events/${testEventId}/photos`)
                .expect(200);

            // Verify response
            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);
        });
    });

    describe('DELETE /:id/events/:eventId/photos/:photoId', () => {
        const testPhotoId = 'test-photo-id';

        it('should delete a photo successfully', async () => {
            // Reset mocks to ensure a clean state
            mockDynamoSend.mockReset();

            mockDynamoSend.mockResolvedValueOnce({});

            const response = await request(app).delete(
                `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}`
            );

            // Verify response
            expect(response.statusCode).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Photo deleted successfully');
        });
    });
});
