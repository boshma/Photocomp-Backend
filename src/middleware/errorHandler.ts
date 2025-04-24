import { logger } from '../util/logger';
import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class
 * Extends Error with a status code for HTTP responses
 */
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        // Capture stack trace for better debugging
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handling middleware
 * Processes all errors passed to next() throughout the application
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log error for debugging purposes
    logger.error('Error:', err);

    // Handle AppError instances
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
        return;
    }

    // Handle specific errors from libraries
    if (err.name === 'ValidationError') {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed: ' + err.message,
        });
        return;
    }

    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            status: 'error',
            message: 'Invalid token. Please log in again.',
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            status: 'error',
            message: 'Your token has expired. Please log in again.',
        });
        return;
    }

    // Default error response for unexpected errors
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        status: 'error',
        message:
            process.env.NODE_ENV === 'production'
                ? 'Something went wrong'
                : err.message || 'Internal server error',
    });
};
