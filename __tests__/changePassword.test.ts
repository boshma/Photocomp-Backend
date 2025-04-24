// Mock the modules before any imports
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedNewPassword'),
    compare: jest.fn(),
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

// Create a manual mock for the userService to control changePassword behavior
jest.mock('../src/services/userService', () => {
    const mockUserService = {
        getUserByEmail: jest.fn(),
        getUserById: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
        deleteUser: jest.fn(),
        changePassword: jest.fn(),
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
import bcrypt from 'bcryptjs';

describe('Change Password Integration Tests', () => {
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

    describe('PATCH /api/auth/password', () => {
        const validPasswordChange = {
            currentPassword: 'OldPassword123',
            newPassword: 'NewPassword456',
        };

        it('should successfully change password when valid credentials are provided', async () => {
            // Mock password verification to succeed
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
            
            // Mock user service changePassword to succeed
            mockUserService.changePassword.mockResolvedValueOnce(true);

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(validPasswordChange)
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Password changed successfully');
            
            // Verify the user service was called with correct parameters
            expect(mockUserService.changePassword).toHaveBeenCalledWith({
                userId: 'user123',
                currentPassword: validPasswordChange.currentPassword,
                newPassword: validPasswordChange.newPassword,
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch('/api/auth/password')
                // No Authorization header
                .send(validPasswordChange)
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Authentication required');
            expect(mockUserService.changePassword).not.toHaveBeenCalled();
        });

        it('should return 400 if current password is missing', async () => {
            const incompleteRequest = {
                newPassword: 'NewPassword456',
            };

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(incompleteRequest)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Current password and new password are required');
            expect(mockUserService.changePassword).not.toHaveBeenCalled();
        });

        it('should return 400 if new password is missing', async () => {
            const incompleteRequest = {
                currentPassword: 'OldPassword123',
            };

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(incompleteRequest)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Current password and new password are required');
            expect(mockUserService.changePassword).not.toHaveBeenCalled();
        });

        it('should return 400 if new password is too short', async () => {
            const weakPasswordRequest = {
                currentPassword: 'OldPassword123',
                newPassword: 'weak', // Less than 8 characters
            };

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(weakPasswordRequest)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('New password must be at least 8 characters long');
            expect(mockUserService.changePassword).not.toHaveBeenCalled();
        });

        it('should return 400 if new password is same as current password', async () => {
            const samePasswordRequest = {
                currentPassword: 'SamePassword123',
                newPassword: 'SamePassword123', // Same as current
            };

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(samePasswordRequest)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('New password must be different from current password');
            expect(mockUserService.changePassword).not.toHaveBeenCalled();
        });

        it('should return 401 when current password is incorrect', async () => {
            // Mock the user service to throw an "incorrect password" error
            mockUserService.changePassword.mockRejectedValueOnce(
                new AppError('Current password is incorrect', 401)
            );

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(validPasswordChange)
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Current password is incorrect');
            expect(mockUserService.changePassword).toHaveBeenCalled();
        });

        it('should return 404 when user not found', async () => {
            // Mock the user service to throw a "user not found" error
            mockUserService.changePassword.mockRejectedValueOnce(
                new AppError('User not found', 404)
            );

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(validPasswordChange)
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found');
            expect(mockUserService.changePassword).toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Mock the user service to throw a database error
            mockUserService.changePassword.mockRejectedValueOnce(
                new Error('Database connection failed')
            );

            const response = await request(app)
                .patch('/api/auth/password')
                .set('Authorization', 'Bearer valid-jwt-token')
                .send(validPasswordChange)
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Database connection failed');
            expect(mockUserService.changePassword).toHaveBeenCalled();
        });
    });
});