import { Request, Response, NextFunction } from 'express';
import { logger } from '../util/logger';

const loggerMethodMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    logger.info(`Incoming ${req.method} : ${req.url}`);
    next();
};

export { loggerMethodMiddleware };
