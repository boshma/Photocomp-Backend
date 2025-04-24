// __tests__/deleteUser.integration.test.ts

// Mock the modules before any imports
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockImplementation((token, secret) => {
        if (token === 'valid-jwt-token') {
            return { id: 'user123', email: 'test@example.com', role: 'USER' };
        } else if (token === 'admin-jwt-token') {
            return { id: 'admin456', email: 'admin@example.com', role: 'ADMIN' };
        }
        throw new Error('Invalid token');
    }),
}));

// Create a manual mock for the userService to control deleteUser behavior
jest.mock('../src/services/userService', () => {
    const mockUserService = {
        getUserByEmail: jest.fn(),
        getUserById: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
        deleteUser: jest.fn(),
    };

    return {
        UserService: jest.fn().mockImplementation(() => mockUserService),
    };
});

// Now import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { setupTestEnvironment } from './utils/test-utils';
import { authRouter } from '../src/controllers/authController';
import { errorHandler } from '../src/middleware/errorHandler';
import { UserService } from '../src/services/userService';
import { User, UserRole } from '../src/models/User';
import { AppError } from '../src/middleware/errorHandler';

describe('Delete User Integration Tests', () => {
    let app: express.Application;
    let mockUserService: any;

    const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
    };

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Get mockUserService for controlling test behavior
        mockUserService = new UserService() as jest.Mocked<UserService>;

        // Create a fresh Express app for each test with authentication middleware
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRouter);
        app.use(errorHandler);
    });

    describe('DELETE /api/auth/users/:id', () => {
        it('should allow a user to delete their own account', async () => {
            // Mock getUserByEmail to return the user for authentication
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            // Mock deleteUser to succeed
            mockUserService.deleteUser.mockResolvedValue(true);

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
            expect(mockUserService.deleteUser).toHaveBeenCalledWith('user123');
        });

        it("should not allow even an admin to delete another user's account", async () => {
            // Mock getUserByEmail to return the admin user
            mockUserService.getUserByEmail.mockResolvedValue({
                ...mockUser,
                id: 'admin456',
                role: UserRole.ADMIN,
            });

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer admin-jwt-token')
                .expect(403);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Not authorized to delete this user');
            expect(mockUserService.deleteUser).not.toHaveBeenCalled();
        });

        it("should not allow a user to delete another user's account", async () => {
            // Mock getUserByEmail to return the user
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            const response = await request(app)
                .delete(`/api/auth/users/otheruser456`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(403);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Not authorized to delete this user');
            expect(mockUserService.deleteUser).not.toHaveBeenCalled();
        });

        it('should return 404 when user not found', async () => {
            // Mock getUserByEmail to return the user for authentication
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            // Mock deleteUser to throw a user not found error with the proper AppError class and status code
            mockUserService.deleteUser.mockRejectedValue(new AppError('User not found', 404));

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found');
            expect(mockUserService.deleteUser).toHaveBeenCalledWith('user123');
        });

        it('should handle database errors gracefully', async () => {
            // Mock getUserByEmail to return the user for authentication
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            // Mock deleteUser to throw a database error
            mockUserService.deleteUser.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Database connection failed');
            expect(mockUserService.deleteUser).toHaveBeenCalledWith('user123');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                // No Authorization header
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Authentication required');
            expect(mockUserService.deleteUser).not.toHaveBeenCalled();
        });

        it('should delete event attendance records and memberships before deleting the user', async () => {
            // Mock getUserByEmail to return the user for authentication
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            // Mock deleteUser to succeed
            mockUserService.deleteUser.mockResolvedValue(true);

            const response = await request(app)
                .delete(`/api/auth/users/user123`)
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User deleted successfully');
            expect(mockUserService.deleteUser).toHaveBeenCalledWith('user123');
        });
    });
});
