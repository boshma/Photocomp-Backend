import { sendMail } from '../util/mailService';
import { Status } from '../models/Response';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { logger } from '../util/logger';

dotenv.config();

export const emailSender = (status: Status | Error, req: Request, res: Response, next: NextFunction) => {
    // Handle case where status is an Error (pass it to next error handler)
    if (status instanceof Error) {
        return next(status);
    }
    
    // Ensure status has a valid statusCode
    if (!status || typeof status.statusCode !== 'number') {
        logger.error('Invalid status object or statusCode:', status);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error: Invalid status code'
        });
    }

    // Check if emailInfo exists
    if (!res.locals.user || !res.locals.user.emailInfo) {
        // If no email info is present, just return the status
        return res.status(status.statusCode).json({
            status: status.status,
            message: status.message || '',
            data: {
                tags: status.data
            }
        });
    }

    const { to, subject, message, header } = res.locals.user.emailInfo;
    
    // Validate all required email fields
    if (!to || !subject || !message || !header) {
        // If any required email field is missing, just return the status
        return res.status(status.statusCode).json({
            status: status.status,
            message: status.message || '',
            data: {
                tags: status.data
            }
        });
    }

    try {
        sendMail(to, subject, message, header);

        return res.status(status.statusCode).json({
            status: `${status.status} and email has been sent!`,
            message: status.message || '',
            data: {
                tags: status.data
            }
        });
    } catch (error) {
        next(error);
    }
};