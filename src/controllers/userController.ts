import { Request, Response, NextFunction, Router } from 'express';
import { getUserTaggedPhotos } from './photoTagsController';
import { getUserEvents } from './eventController';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authMiddleware';
import { OrgService } from '../services/orgService'

export const userRouter = Router();

// Apply authentication middleware to all user routes
userRouter.use(authenticate);

/**
 * Get all photos a user is tagged in
 * GET /users/:userId/tagged-photos
 */
userRouter.get('/:userId/tagged-photos', getUserTaggedPhotos);

/**
 * Get all events users is or has attended
 * @route GET /users/:userId/events
 */
userRouter.get('/:userId/events', getUserEvents);


/*
  * Check if the member is a part of the organization.
  * */
userRouter.get('/:userId/members/:orgId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(req.params);
    const userId = req.params.userId;
    const orgId = req.params.orgId;
    const requestingUserId = res.locals.user.id;

    if (userId !== requestingUserId) {
      throw new AppError('You can only view your own membership information', 403);
    }

    const orgService = new OrgService();
    const userOrg = await orgService.findSpecificOrgByUser(orgId, userId);

    if (!userOrg) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        membership: userOrg,
      },
    });
  } catch (error) {
    next(error);
  }
});
