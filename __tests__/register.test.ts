// Now import dependencies after mocks are set up
import request from 'supertest';
import express from 'express';
import { UserRole } from '../src/models/User';
import jwt from 'jsonwebtoken';
import { dynamoDb } from '../src/config/db';
import bcrypt from 'bcryptjs';
import { setupTestEnvironment, createTestApp } from './utils/test-utils';

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

    describe('POST /api/auth/register', () => {
        const validRegistration = {
            email: 'newuser@example.com',
            password: 'Password123',
            firstName: 'New',
            lastName: 'User',
        };

        it('should register a new user successfully', async () => {
            // Mock dynamoDb.send for findUserByEmail (no user found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [],
                });
            });

            // Mock dynamoDb.send for createUser
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistration)
                .expect(201);

            // Verify response structure
            expect(response.body.status).toBe('success');
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.token).toBeDefined();

            // Verify user data is correct
            expect(response.body.data.user.email).toBe(validRegistration.email);
            expect(response.body.data.user.firstName).toBe(validRegistration.firstName);
            expect(response.body.data.user.lastName).toBe(validRegistration.lastName);
            expect(response.body.data.user.role).toBe(UserRole.USER);

            // Verify password is not returned
            expect(response.body.data.user.password).toBeUndefined();

            // Verify DynamoDB was called correctly
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });

        it('should return 409 when email is already in use', async () => {
            // Mock dynamoDb.send for findUserByEmail (user found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [
                        {
                            PK: 'USER#123',
                            SK: 'ENTITY',
                            id: '123',
                            email: validRegistration.email,
                            firstName: 'Existing',
                            lastName: 'User',
                            role: UserRole.USER,
                        },
                    ],
                });
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistration)
                .expect(409);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Email already in use');

            // Verify DynamoDB was called only once (for findUserByEmail)
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteRegistration = {
                // Missing password and lastName
                email: 'newuser@example.com',
                firstName: 'New',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(incompleteRegistration)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('required');

            // Verify DynamoDB was not called
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid email format', async () => {
            const invalidEmailRegistration = {
                ...validRegistration,
                email: 'invalid-email', // Invalid email format
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidEmailRegistration)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('Invalid email format');

            // Verify DynamoDB was not called
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should return 400 for password too short', async () => {
            const weakPasswordRegistration = {
                ...validRegistration,
                password: 'weak', // Less than 8 characters
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(weakPasswordRegistration)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('at least 8 characters');

            // Verify DynamoDB was not called
            expect(mockDynamoSend).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Mock dynamoDb.send for findUserByEmail (no user found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [],
                });
            });

            // Mock dynamoDb.send for createUser to throw an error
            mockDynamoSend.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistration)
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toContain('failed');

            // Verify DynamoDB was called
            expect(mockDynamoSend).toHaveBeenCalledTimes(2);
        });
    });

    describe('JWT Token Verification', () => {
        it('should generate a valid JWT token with correct payload', async () => {
            const validRegistration = {
                email: 'newuser@example.com',
                password: 'Password123',
                firstName: 'New',
                lastName: 'User',
            };

            // Mock dynamoDb.send for findUserByEmail (no user found)
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({
                    Items: [],
                });
            });

            // Mock dynamoDb.send for createUser
            mockDynamoSend.mockImplementationOnce(() => {
                return Promise.resolve({});
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(validRegistration)
                .expect(201);

            const token = response.body.data.token;
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as any;

            // Verify token contains correct user information
            expect(decodedToken.email).toBe(validRegistration.email);
            expect(decodedToken.role).toBe(UserRole.USER);
            expect(decodedToken.id).toBeDefined();
            expect(decodedToken.iat).toBeDefined(); // Issued at time
            expect(decodedToken.exp).toBeDefined(); // Expiration time
        });
    });
});
