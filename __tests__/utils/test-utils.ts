import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { authRouter } from '../../src/controllers/authController';
import { authenticate } from '../../src/middleware/authMiddleware';

// Set up environment variables for tests if not already set
export function setupTestEnvironment() {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.TABLE_NAME = process.env.TABLE_NAME || 'test-table';
    process.env.BUCKET_NAME = process.env.BUCKET_NAME || 'test-bucket';
}

// Create a test express app with the auth router
export function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
    return app;
}

export { authenticate };
