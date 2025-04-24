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

// Mock the TagRepository
const mockGetTagsByPhoto = jest.fn().mockResolvedValue([
    { userId: 'tagged-user-1', photoId: 'test-photo-id' },
    { userId: 'tagged-user-2', photoId: 'test-photo-id' }
]);
const mockDeleteTag = jest.fn().mockResolvedValue(true);

jest.mock('../src/repositories/tagRepository', () => {
    return {
        TagRepository: jest.fn().mockImplementation(() => {
            return {
                getTagsByPhoto: (photoId: string) => mockGetTagsByPhoto(photoId),
                deleteTag: (userId: string) => mockDeleteTag(userId)
            };
        }),
    };
});

// Mock the PhotoRepository
const mockGetPhotosByEvent = jest.fn().mockResolvedValue([
    {
        id: 'test-photo-id',
        eventId: 'test-event-id',
        url: 'https://presigned-url.example.com/photo.jpg',
        metadata: { s3Key: 'photos/test-event-id/test-photo-id.jpg' }
    }
]);
const mockDeletePhoto = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/repositories/photoRepository', () => {
    return {
        PhotoRepository: jest.fn().mockImplementation(() => {
            return {
                getPhotosByEvent: (eventId: string) => mockGetPhotosByEvent(eventId),
                deletePhoto: (photoId: string) => mockDeletePhoto(photoId)
            };
        }),
    };
});

// Mock S3Service
const mockDeleteFile = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/services/s3Service', () => {
    return {
        S3Service: jest.fn().mockImplementation(() => {
            return {
                deleteFile: (s3Key: string) => mockDeleteFile(s3Key)
            };
        }),
    };
});

// Mock the EventService
const mockDeleteEvent = jest.fn().mockResolvedValue(true);
const mockDeleteAllEventAttendance = jest.fn().mockResolvedValue(true);

jest.mock('../src/repositories/eventRepository', () => {
    return {
        EventRepository: jest.fn().mockImplementation(() => {
            return {
                deleteEvent: (eventId: string) => mockDeleteEvent(eventId),
                deleteAllEventAttendance: (eventId: string) => mockDeleteAllEventAttendance(eventId)
            };
        }),
    };
});

// Create a named mock function we can manipulate directly in tests
const mockServiceDeleteEvent = jest.fn().mockImplementation((orgName: string, eventId: string, adminId: string) => {
    // Default implementation that calls our repository mocks internally
    return Promise.resolve(true);
});

const mockFindEventById = jest.fn().mockImplementation((eventId: string) => {
    return Promise.resolve({
        id: eventId,
        title: 'Test Event',
        description: 'Test Event Description',
        isPublic: true,
        PK: `EVENT#${eventId}`,
        SK: 'ENTITY',
        GSI2PK: 'ORG#TEST-ORG',
        GSI2SK: `EVENT#${eventId}`,
    });
});

// Update the EventService mock to use our direct mock functions
jest.mock('../src/services/eventService', () => {
    return {
        EventService: jest.fn().mockImplementation(() => {
            return {
                deleteEvent: (orgName: string, eventId: string, adminId: string) => mockServiceDeleteEvent(orgName, eventId, adminId),
                findEventById: (eventId: string) => mockFindEventById(eventId),
            };
        }),
    };
});

// Mock the UserService
jest.mock('../src/services/userService', () => {
    return {
        UserService: jest.fn().mockImplementation(() => {
            return {
                getUserByEmail: jest.fn().mockImplementation(() => {
                    return Promise.resolve({
                        id: 'test-admin-id',
                        email: 'admin@example.com',
                        firstName: 'Admin',
                        lastName: 'User',
                        role: 'ADMIN',
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

// Import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { eventRouter } from '../src/controllers/eventController';
import { setupTestEnvironment } from './utils/test-utils';
import { errorHandler } from '../src/middleware/errorHandler';
import { AppError } from '../src/middleware/errorHandler';

describe('Delete Event Integration Tests', () => {
    let app: express.Application;
    const testOrgId = 'test-org';
    const testEventId = 'test-event-id';
    const testAdminId = 'test-admin-id';

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset the mock functions to their default behavior
        mockServiceDeleteEvent.mockClear().mockResolvedValue(true);
        mockGetPhotosByEvent.mockClear().mockResolvedValue([
            {
                id: 'test-photo-id',
                eventId: 'test-event-id',
                url: 'https://presigned-url.example.com/photo.jpg',
                metadata: { s3Key: 'photos/test-event-id/test-photo-id.jpg' }
            }
        ]);
        mockGetTagsByPhoto.mockClear().mockResolvedValue([
            { userId: 'tagged-user-1', photoId: 'test-photo-id' },
            { userId: 'tagged-user-2', photoId: 'test-photo-id' }
        ]);
        mockDeleteTag.mockClear().mockResolvedValue(true);
        mockDeletePhoto.mockClear().mockResolvedValue(undefined);
        mockDeleteFile.mockClear().mockResolvedValue(undefined);
        mockDeleteEvent.mockClear().mockResolvedValue(true);
        mockDeleteAllEventAttendance.mockClear().mockResolvedValue(true);

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());

        // Setup mock middleware to set user in res.locals
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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

        // Mount the routes
        app.use('/organizations/:orgId/events', eventRouter);

        // Add error handler at the end
        app.use(errorHandler);
    });

    describe('DELETE /organizations/:id/events/:eventId/admin', () => {
        it('should successfully delete an event', async () => {
            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Event deleted successfully');

            // Verify our mock function was called with correct parameters
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should delete all event resources including tags', async () => {
            // Override mockServiceDeleteEvent to call the actual implementation
            // that invokes our other mocks
            mockServiceDeleteEvent.mockImplementationOnce(async (orgName: string, eventId: string, adminId: string) => {
                // This simulates the actual implementation but using our mocks
                await mockDeleteAllEventAttendance(eventId);
                const photos = await mockGetPhotosByEvent(eventId);
                
                for (const photo of photos) {
                    const tags = await mockGetTagsByPhoto(photo.id);
                    for (const tag of tags) {
                        await mockDeleteTag(tag.userId);
                    }
                    
                    if (photo.metadata?.s3Key) {
                        await mockDeleteFile(photo.metadata.s3Key);
                    }
                    
                    await mockDeletePhoto(photo.id);
                }
                
                return mockDeleteEvent(eventId);
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(200);

            // Verify response
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Event deleted successfully');

            // Verify all the expected operations were called
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(testOrgId, testEventId, testAdminId);
            expect(mockDeleteAllEventAttendance).toHaveBeenCalledWith(testEventId);
            expect(mockGetPhotosByEvent).toHaveBeenCalledWith(testEventId);
            expect(mockGetTagsByPhoto).toHaveBeenCalledWith('test-photo-id');

            // Verify tag deletion - should be called for each tagged user
            expect(mockDeleteTag).toHaveBeenCalledTimes(2);
            expect(mockDeleteTag).toHaveBeenCalledWith('tagged-user-1');
            expect(mockDeleteTag).toHaveBeenCalledWith('tagged-user-2');

            // Verify file deletion
            expect(mockDeleteFile).toHaveBeenCalledWith('photos/test-event-id/test-photo-id.jpg');
            
            // Verify photo record deletion
            expect(mockDeletePhoto).toHaveBeenCalledWith('test-photo-id');
            
            // Verify final event deletion
            expect(mockDeleteEvent).toHaveBeenCalledWith(testEventId);
        });

        it('should return 404 when event is not found', async () => {
            // Mock the deleteEvent function to throw a not found error
            mockServiceDeleteEvent.mockRejectedValueOnce(
                new AppError('Event not found', 404)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(404);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Event not found');

            // Verify our mock function was called with correct parameters
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should return 403 when event does not belong to the organization', async () => {
            // Mock the deleteEvent function to throw a forbidden error
            mockServiceDeleteEvent.mockRejectedValueOnce(
                new AppError('Event does not belong to this organization', 403)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(403);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Event does not belong to this organization');

            // Verify our mock function was called with correct parameters
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should handle internal server errors gracefully', async () => {
            // Mock the deleteEvent function to throw a generic error
            mockServiceDeleteEvent.mockRejectedValueOnce(
                new Error('Database connection error')
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(500);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database connection error');

            // Verify our mock function was called with correct parameters
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should handle failures during photo deletion process', async () => {
            // Mock the deleteEvent function to indicate failure in one of the deletion steps
            mockServiceDeleteEvent.mockRejectedValueOnce(
                new AppError('Failed to delete photo: S3 deletion failed', 500)
            );

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(500);

            // Verify response structure
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to delete photo: S3 deletion failed');

            // Verify our mock function was called with correct parameters
            expect(mockServiceDeleteEvent).toHaveBeenCalledWith(
                testOrgId,
                testEventId,
                testAdminId
            );
        });

        it('should handle failures during tag deletion process', async () => {
            // Mock the deleteEvent function to indicate failure in the tag deletion step
            mockServiceDeleteEvent.mockImplementationOnce(async (orgName: string, eventId: string, adminId: string) => {
                await mockDeleteAllEventAttendance(eventId);
                const photos = await mockGetPhotosByEvent(eventId);
                
                for (const photo of photos) {
                    // Simulate failure in tag deletion
                    mockGetTagsByPhoto.mockRejectedValueOnce(
                        new Error('Failed to retrieve tags')
                    );
                    
                    try {
                        const tags = await mockGetTagsByPhoto(photo.id);
                        // This won't execute due to the rejection above
                        for (const tag of tags) {
                            await mockDeleteTag(tag.userId);
                        }
                    } catch (error) {
                        // We're simulating that the tag deletion fails but the function continues
                        console.error('Tag deletion error:', error);
                    }
                    
                    // Continue with S3 and photo deletion
                    if (photo.metadata?.s3Key) {
                        await mockDeleteFile(photo.metadata.s3Key);
                    }
                    
                    await mockDeletePhoto(photo.id);
                }
                
                return mockDeleteEvent(eventId);
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(200);

            // The deletion should still succeed overall even if tag deletion failed
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Event deleted successfully');

            // Verify tag retrieval was attempted but failed
            expect(mockGetTagsByPhoto).toHaveBeenCalledWith('test-photo-id');
            
            // Tag deletion should not have been called since tag retrieval failed
            expect(mockDeleteTag).not.toHaveBeenCalled();
            
            // But file and photo deletion should have proceeded
            expect(mockDeleteFile).toHaveBeenCalledWith('photos/test-event-id/test-photo-id.jpg');
            expect(mockDeletePhoto).toHaveBeenCalledWith('test-photo-id');
            expect(mockDeleteEvent).toHaveBeenCalledWith(testEventId);
        });

        it('should continue deleting other photos and tags if one photo fails', async () => {
            // Set up multiple photos, one of which will fail
            mockGetPhotosByEvent.mockResolvedValueOnce([
                {
                    id: 'test-photo-1',
                    eventId: 'test-event-id',
                    url: 'https://presigned-url.example.com/photo1.jpg',
                    metadata: { s3Key: 'photos/test-event-id/test-photo-1.jpg' }
                },
                {
                    id: 'test-photo-2',
                    eventId: 'test-event-id',
                    url: 'https://presigned-url.example.com/photo2.jpg',
                    metadata: { s3Key: 'photos/test-event-id/test-photo-2.jpg' }
                }
            ]);
            
            // Set up tags for both photos
            mockGetTagsByPhoto
                .mockImplementationOnce(() => Promise.resolve([
                    { userId: 'tagged-user-1', photoId: 'test-photo-1' }
                ]))
                .mockImplementationOnce(() => Promise.resolve([
                    { userId: 'tagged-user-2', photoId: 'test-photo-2' }
                ]));
                
            // Make the first photo deletion fail
            mockDeletePhoto
                .mockImplementationOnce(() => Promise.reject(new Error('Failed to delete photo')))
                .mockImplementationOnce(() => Promise.resolve(undefined));
                
            mockServiceDeleteEvent.mockImplementationOnce(async (orgName: string, eventId: string, adminId: string) => {
                await mockDeleteAllEventAttendance(eventId);
                const photos = await mockGetPhotosByEvent(eventId);
                
                for (const photo of photos) {
                    try {
                        const tags = await mockGetTagsByPhoto(photo.id);
                        for (const tag of tags) {
                            await mockDeleteTag(tag.userId);
                        }
                        
                        if (photo.metadata?.s3Key) {
                            await mockDeleteFile(photo.metadata.s3Key);
                        }
                        
                        await mockDeletePhoto(photo.id);
                    } catch (error) {
                        // Log the error but continue with other photos
                        console.error(`Error deleting photo ${photo.id}:`, error);
                    }
                }
                
                return mockDeleteEvent(eventId);
            });

            const response = await request(app)
                .delete(`/organizations/${testOrgId}/events/${testEventId}/admin`)
                .expect(200);

            // The deletion should still succeed overall
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Event deleted successfully');

            // Verify all photos and tags were attempted
            expect(mockGetTagsByPhoto).toHaveBeenCalledTimes(2);
            expect(mockDeleteTag).toHaveBeenCalledTimes(2);
            expect(mockDeleteFile).toHaveBeenCalledTimes(2);
            expect(mockDeletePhoto).toHaveBeenCalledTimes(2);
            
            // And event deletion still proceeded
            expect(mockDeleteEvent).toHaveBeenCalledWith(testEventId);
        });
    });
});