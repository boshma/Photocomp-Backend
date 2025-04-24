import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './controllers/authController';
import { orgRouter } from './controllers/orgController';
import { errorHandler } from './middleware/errorHandler';
import { emailSender } from './middleware/emailSender';
import { loggerMethodMiddleware } from './middleware/loggerMiddleware';
import { eventRouter } from './controllers/eventController';
import { guestRouter } from './controllers/guestController';
import { photoRouter } from './controllers/photoController';
import { authenticate } from './middleware/authMiddleware';
import { orgMemberRouter } from './controllers/orgMemberController';
import { orgMembershipRouter } from './controllers/orgMemberShipController';
import { checkOrgMember, checkOrgAdmin, validateUserID } from './middleware/OrgMiddleware';
import { orgPhotosRouter } from './controllers/orgPhotoController';
import { photoTagsRouter } from './controllers/photoTagsController';
import { userRouter } from './controllers/userController';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for photo uploads

// Super middleware
app.use(loggerMethodMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use('/guests', guestRouter);
app.use('/users', userRouter);

// Organizations base router that requires authentication
const organizationsRouter = express.Router();
app.use('/organizations', authenticate, validateUserID, organizationsRouter);

// Routes that all authenticated users can access
organizationsRouter.use('/', orgRouter);
organizationsRouter.use('/', orgMembershipRouter);

// Routes that all authenticated users can access where emailSender is used
organizationsRouter.use('/:id/requests/:userId', checkOrgAdmin, orgMembershipRouter, emailSender);

// Create a router specifically for protected org routes
const orgProtectedRouter = express.Router({ mergeParams: true });
// Add organization-level photos route
orgProtectedRouter.use('/photos', orgPhotosRouter);

organizationsRouter.use('/:orgId', checkOrgMember, orgProtectedRouter);

// Mount member-only routes
orgProtectedRouter.use('/events', eventRouter, emailSender);
orgProtectedRouter.use('/members', orgMemberRouter);
orgProtectedRouter.use(
    '/events/:eventId/photos',
    (req, res, next) => {
        // This ensures parameters are properly passed down to the photo controller
        next();
    },
    photoRouter
);

orgProtectedRouter.use(
    '/events/:eventId/photos/:photoId/tags',
    (req, res, next) => {
        // This ensures parameters are properly passed down to the photo tags controller
        next();
    },
    photoTagsRouter
);

// Default route
app.get('/', (req, res) => {
    res.send('PhotoComp API is running');
});

app.all(/(.*)/, (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

// Error handling and Email sending middleware must be used after all routes
//app.use(emailSender);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
