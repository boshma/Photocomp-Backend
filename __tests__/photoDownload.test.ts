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
    getSignedUrl: jest.fn().mockImplementation((client, command) => {
        // Check if this is a download URL request (has ResponseContentDisposition)
        if (command && command.input && command.input.ResponseContentDisposition) {
            return Promise.resolve('https://download-url.example.com/photo.jpg');
        }
        // Regular view URL
        return Promise.resolve('https://presigned-url.example.com/photo.jpg');
    }),
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
    getSignedUrl: jest.fn().mockImplementation((client, command) => {
        // Check if this is a download URL request (has ResponseContentDisposition)
        if (command && command.input && command.input.ResponseContentDisposition) {
            return Promise.resolve('https://download-url.example.com/photo.jpg');
        }
        // Regular view URL
        return Promise.resolve('https://presigned-url.example.com/photo.jpg');
    }),
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

// Create a flexible mock for the EventRepository's findEventUserbyUser method
// This will allow us to test different access scenarios
let mockFindEventUserbyUser = jest.fn().mockResolvedValue({
    PK: 'USER#test-user-id',
    SK: 'EVENT#test-event-id',
    GSI2PK: 'EVENT#test-event-id',
    GSI2SK: 'USER#test-user-id',
});

// Mock the EventRepository
jest.mock('../src/repositories/eventRepository', () => {
    return {
        EventRepository: jest.fn().mockImplementation(() => {
            return {
                findEventUserbyUser: (...args: any[]) => mockFindEventUserbyUser(...args),
            };
        }),
    };
});

// Create a flexible mock for the PhotoRepository's getPhotoById method
let mockGetPhotoById = jest.fn().mockImplementation(photoId => {
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
});

// Mock the PhotoRepository
jest.mock('../src/repositories/photoRepository', () => {
    return {
        PhotoRepository: jest.fn().mockImplementation(() => {
            return {
                getPhotoById: (...args: any[]) => mockGetPhotoById(...args),
            };
        }),
    };
});

// Create a flexible mock for the validateUserEventAccess method
// This allows us to directly control its behavior in tests
const mockValidateUserEventAccess = jest.fn().mockResolvedValue(true);
const mockGetPhotoDownloadUrl = jest
    .fn()
    .mockResolvedValue('https://download-url.example.com/photo.jpg');

// Mock the PhotoService - using our flexible mocks
jest.mock('../src/services/photoService', () => {
    return {
        PhotoService: jest.fn().mockImplementation(() => {
            return {
                validateUserEventAccess: mockValidateUserEventAccess,
                getPhotoDownloadUrl: mockGetPhotoDownloadUrl,
            };
        }),
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { photoRouter } from '../src/controllers/photoController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Photo Download Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testPhotoId = 'test-photo-id';
    const testUserId = 'test-user-id';

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset flexible mocks to default values
        mockValidateUserEventAccess.mockClear().mockResolvedValue(true);
        mockGetPhotoDownloadUrl
            .mockClear()
            .mockResolvedValue('https://download-url.example.com/photo.jpg');

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

        // Mount the routes - use the correct path that matches how routes are defined in your app
        app.use('/organizations/:id/events/:eventId/photos', photoRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    // Increase the timeout for all tests
    jest.setTimeout(10000);

    describe('GET /:id/events/:eventId/photos/:photoId/download', () => {
        it('should return a download URL when user has access to the event', async () => {
            // Default mock behavior is already set to return true for access

            const response = await request(app)
                .get(
                    `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`
                )
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.downloadUrl).toBeDefined();
            expect(response.body.data.downloadUrl).toBe(
                'https://download-url.example.com/photo.jpg'
            );

            // Verify our mock was called
            expect(mockValidateUserEventAccess).toHaveBeenCalledWith(testEventId, testUserId);
        });

        it('should return 403 when user does not have access to the event', async () => {
            // Set our mock to return false for this test
            mockValidateUserEventAccess.mockResolvedValue(false);

            const response = await request(app)
                .get(
                    `/organizations/${testOrgId}/events/${testEventId}/photos/${testPhotoId}/download`
                )
                .expect(403);

            // Verify error response
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('You do not have access to photos from this event');

            // Verify our mock was called
            expect(mockValidateUserEventAccess).toHaveBeenCalledWith(testEventId, testUserId);

            // The download URL function should not be called
            expect(mockGetPhotoDownloadUrl).not.toHaveBeenCalled();
        });
    });
});
