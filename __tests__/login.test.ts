// Mock the modules before any imports
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn(),
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
    UpdateCommand: jest.fn(),
}));

// Mock the config/db module with correct path
jest.mock('../src/config/db', () => ({
    dynamoDb: {
        send: jest.fn(),
    },
    TABLE_NAME: 'test-table',
}));

// Now import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { UserRole } from '../src/models/User';
import jwt from 'jsonwebtoken';
import { dynamoDb } from '../src/config/db';
import bcrypt from 'bcryptjs';
import { setupTestEnvironment, createTestApp } from './utils/test-utils';

// Cast the mock for type safety
const mockDynamoSend = dynamoDb.send as jest.Mock;

describe('Auth Integration Tests', () => {
    let app: express.Application;

    beforeAll(() => {
        // Set up environment variables
        setupTestEnvironment();
    });

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a fresh Express app for each test
        app = createTestApp();
    });

    describe('POST /api/auth/login', () => {
        const validLogin = {
            email: 'test@example.com',
            password: 'Password123',
        };

        const existingUser = {
            PK: 'USER#123',
            SK: 'ENTITY',
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            password: 'hashedPassword123',
            role: UserRole.USER,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            type: 'USER',
            GSI1PK: 'EMAIL#test@example.com',
            GSI1SK: 'USER#123',
        };

        it('should login successfully with valid credentials', async () => {
            // Mock dynamoDb.send for findUserByEmail (return existing user)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [existingUser],
                });
            });

            // Mock password comparison
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const response = await request(app)
                .post('/api/auth/login')
                .send(validLogin)
                .expect(200);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.token).toBeDefined();

            // Verify user data is correct
            expect(response.body.data.user.email).toBe(validLogin.email);
            expect(response.body.data.user.firstName).toBe(existingUser.firstName);
            expect(response.body.data.user.lastName).toBe(existingUser.lastName);

            // Verify password is not returned
            expect(response.body.data.user.password).toBeUndefined();

            // Verify DynamoDB was called correctly
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should return 401 when user does not exist', async () => {
            // Mock dynamoDb.send for findUserByEmail (no user found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [],
                });
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send(validLogin)
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid email or password');

            // Verify DynamoDB was called
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should return 401 when password is incorrect', async () => {
            // Mock dynamoDb.send for findUserByEmail (return existing user)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [existingUser],
                });
            });

            // Mock password comparison to return false
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

            const response = await request(app)
                .post('/api/auth/login')
                .send(validLogin)
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid email or password');

            // Verify bcrypt.compare was called
            expect(bcrypt.compare).toHaveBeenCalledWith(validLogin.password, existingUser.password);
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteLogin = {
                // Missing password
                email: 'test@example.com',
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(incompleteLogin)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('required');

            // Verify DynamoDB was not called
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Mock dynamoDb.send to throw an error
            mockDynamoSend.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send(validLogin)
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Database connection failed');

            // Verify DynamoDB was called
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });
    });

    describe('JWT Token Verification for Login', () => {
        it('should generate a valid JWT token with correct payload', async () => {
            const existingUser = {
                PK: 'USER#123',
                SK: 'ENTITY',
                id: '123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                password: 'hashedPassword123',
                role: UserRole.USER,
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                type: 'USER',
                GSI1PK: 'EMAIL#test@example.com',
                GSI1SK: 'USER#123',
            };

            // Mock dynamoDb.send for findUserByEmail
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [existingUser],
                });
            });

            // Mock password comparison
            (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

            const validLogin = {
                email: 'test@example.com',
                password: 'Password123',
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(validLogin)
                .expect(200);

            const token = response.body.data.token;
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as any;

            // Verify token contains correct user information
            expect(decodedToken.email).toBe(validLogin.email);
            expect(decodedToken.role).toBe(UserRole.USER);
            expect(decodedToken.id).toBe('123');
            expect(decodedToken.iat).toBeDefined(); // Issued at time
            expect(decodedToken.exp).toBeDefined(); // Expiration time
        });
    });
});
