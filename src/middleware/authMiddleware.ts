import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
    };
}

/**
 * Middleware to authenticate API requests
 * Verifies JWT token from Authorization header and adds decoded user to res.locals
 * Improved error handling to gracefully handle deleted users
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('Authentication required', 401));
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Authentication token missing', 401));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
                id: string;
                email: string;
                role: UserRole;
            };

            // Store user info in res.locals for consistency
            res.locals.user = decoded;

            next();
        } catch (error) {
            // Handle JWT verification errors specifically
            if (error instanceof jwt.JsonWebTokenError) {
                return next(new AppError('Invalid token. Please log in again.', 401));
            } else if (error instanceof jwt.TokenExpiredError) {
                return next(new AppError('Your token has expired. Please log in again.', 401));
            }

            // Other unexpected errors
            return next(new AppError(`Authentication failed: ${(error as Error).message}`, 401));
        }
    } catch (error) {
        return next(new AppError(`Authentication failed: ${(error as Error).message}`, 401));
    }
};

/**
 * Middleware to verify admin role permissions
 * Must be used after authenticate middleware
 */
export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user || user.role !== UserRole.ADMIN) {
        return next(new AppError('Access denied. Admin privileges required.', 403));
    }

    next();
};
