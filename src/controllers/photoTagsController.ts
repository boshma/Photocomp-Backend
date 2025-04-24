import { Request, Response, NextFunction, Router } from 'express';
import { TagService } from '../services/tagService';
import { OrgService } from '../services/orgService';
import { EventService } from '../services/eventService';
import { AppError } from '../middleware/errorHandler';
import { checkOrgAdmin, checkOrgMember } from '../middleware/OrgMiddleware';
import { emailSender } from '../middleware/emailSender';
import { TagRequest } from '../models/Tag';
import { Status } from '../models/Response';

const tagService = new TagService();
const orgService = new OrgService();
const eventService = new EventService();
export const photoTagsRouter = Router({ mergeParams: true });

/**
 * Get all users tagged in a photo
 * GET /organizations/:id/events/:eventId/photos/:photoId/tags
 */
photoTagsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const photoId = req.params.photoId;

        const tags = await tagService.getPhotoTags(photoId);

        return res.status(200).json({
            status: 'success',
            data: {
                tags,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Tag users in a photo
 * POST /organizations/:id/events/:eventId/photos/:photoId/tags
 */
photoTagsRouter.post(
    '/',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const eventId = req.params.eventId;
            const { userIds } = req.body;
            const admin = res.locals.user.info;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A list of user IDs is required'
                });
            }

            const tagRequest: TagRequest = {
                userIds,
                photoId,
                eventId,
            };

            const tags = await tagService.tagUsersInPhoto(tagRequest, admin.id);
            console.log(tags);
            
            // Get event details for email
            const event = await eventService.findEventById(eventId);

            // Check if we should try to send emails
            if (event) {
                try {
                    const members = await orgService.getOrgMembers(event.GSI2PK.slice(4));
                    let membersEmail: string[] = [];

                    // Add email notification if members are tagged
                    if (members && members.length > 0) {
                        for (const tag of tags) {
                            for (const member of members) {
                                if (member.userId === tag.userId) {
                                    membersEmail.push(member.email);
                                }
                            }
                        }

                        // Only set up email if there are members to email
                        if (membersEmail.length > 0) {
                            // Creates the email data
                            const to: string = membersEmail.toString();
                            const subject: string = `An update from PhotoComp!`;
                            const message: string = `You have been tagged to a photo in the event ${event.title} in org ${event.GSI2PK.slice(4)}.
                            Know more by checking out the website!`;
                            const header: string = `You have been tagged in a photo!`;

                            // Initialize emailInfo if not exists
                            res.locals.user.emailInfo = { to, message, header, subject };
                            
                            // Create status object for email sender
                            const status: Status = {
                                statusCode: 201,
                                status: 'success',
                                message: `Tagged ${tags.length} users in photo`,
                                data: tags
                            };
                            
                            // Pass to email sender middleware
                            return emailSender(status, req, res, next);
                        }
                    }
                } catch (error) {
                    // If there's an error getting members, just continue to the success response
                    console.error('Error getting members for email notifications:', error);
                }
            }
            
            // Default response without email sending
            return res.status(201).json({
                status: 'success',
                message: `Tagged ${tags.length} users in photo`,
                data: {
                    tags
                }
            });
            
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Remove a tag (untag a user from a photo)
 * DELETE /organizations/:id/events/:eventId/photos/:photoId/tags/:userId
 */
photoTagsRouter.delete(
    '/:userId',
    checkOrgAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const photoId = req.params.photoId;
            const userId = req.params.userId;

            await tagService.removeTag(userId, photoId);

            return res.status(200).json({
                status: 'success',
                message: 'User untagged from photo successfully',
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get all photos a user is tagged in
 * GET /users/:userId/tagged-photos
 */
export const getUserTaggedPhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;
        const requestingUserId = res.locals.user.id;

        // Users can only view their own tagged photos
        if (userId !== requestingUserId) {
            throw new AppError('You can only view your own tagged photos', 403);
        }

        const photos = await tagService.getUserTaggedPhotos(userId);

        return res.status(200).json({
            status: 'success',
            data: {
                photos,
                count: photos.length,
            },
        });
    } catch (error) {
        next(error);
    }
};