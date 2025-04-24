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
                        role: 'MEMBER',
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
                id: 'test-user-id',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'MEMBER',
            },
        };
        next();
    },
}));

// Mock the PhotoService
jest.mock('../src/services/photoService', () => {
    return {
        PhotoService: jest.fn().mockImplementation(() => {
            return {
                getAllOrganizationPhotos: jest.fn().mockImplementation(() => {
                    const eventMap = new Map();
                    eventMap.set('event1', {
                        id: 'event1',
                        title: 'Test Event 1',
                        date: '2025-04-01T00:00:00.000Z',
                    });
                    eventMap.set('event2', {
                        id: 'event2',
                        title: 'Test Event 2',
                        date: '2025-04-02T00:00:00.000Z',
                    });

                    return Promise.resolve({
                        photos: [
                            {
                                id: 'photo1',
                                eventId: 'event1',
                                url: 'https://presigned-url.example.com/photo1.jpg',
                                uploadedBy: 'test-user-id',
                                createdAt: '2025-04-01T00:00:00.000Z',
                                metadata: { title: 'Photo 1' },
                            },
                            {
                                id: 'photo2',
                                eventId: 'event2',
                                url: 'https://presigned-url.example.com/photo2.jpg',
                                uploadedBy: 'test-user-id',
                                createdAt: '2025-04-02T00:00:00.000Z',
                                metadata: { title: 'Photo 2' },
                            },
                        ],
                        events: eventMap,
                    });
                }),
            };
        }),
    };
});

// Mock OrgService to validate organization membership
jest.mock('../src/services/orgService', () => {
    return {
        OrgService: jest.fn().mockImplementation(() => {
            return {
                findSpecificOrgByUser: jest.fn().mockResolvedValue({
                    userId: 'test-user-id',
                    organizationName: 'test-org',
                    role: 'MEMBER',
                }),
            };
        }),
    };
});

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';
import { orgPhotosRouter } from '../src/controllers/orgPhotoController';

describe('Organization Photos Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
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

        // Set up middleware to properly populate res.locals with user info
        app.use((req, res, next) => {
            res.locals.user = {
                id: testUserId,
                email: 'test@example.com',
                role: 'MEMBER',
                info: {
                    id: testUserId,
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'MEMBER',
                },
            };
            next();
        });

        // Mount the routes
        app.use('/organizations/:orgId/photos', orgPhotosRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    describe('GET /organizations/:orgId/photos', () => {
        it('should retrieve all photos for an organization', async () => {
            const response = await request(app)
                .get(`/organizations/${testOrgId}/photos`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.photos).toBeDefined();
            expect(response.body.data.photos.length).toBe(2);

            // Verify photos have event information
            expect(response.body.data.photos[0].event).toBeDefined();
            expect(response.body.data.photos[0].event.title).toBe('Test Event 1');
            expect(response.body.data.photos[1].event).toBeDefined();
            expect(response.body.data.photos[1].event.title).toBe('Test Event 2');

            // Verify count is included
            expect(response.body.data.count).toBe(2);
        });
    });
});
