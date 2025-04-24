import { Request, Response, Router, NextFunction } from 'express';
import { OrgService } from '../services/orgService';
import { AppError } from '../middleware/errorHandler';
import { EventService } from '../services/eventService';
import { S3Service } from '../services/s3Service';
import { logger } from '../util/logger';

const orgService = new OrgService();
const eventService = new EventService();
const s3Service = new S3Service();

export const guestRouter = Router();

/*
 * Should be able to view all the public organizations, and their public
 * events.
 *
 * Limits the total organizations to 9 per request (via orgRepo);
 * */
guestRouter.get(`/`, async (req: Request, res: Response, next: NextFunction) => {
    try {
        let lastEvaluatedKey = undefined;

        if (req.query.lastEvaluatedKey && req.query.lastEvaluatedKey !== 'undefined') {
            try {
                const decodedKey = decodeURIComponent(req.query.lastEvaluatedKey as string);
                if (decodedKey) {
                    lastEvaluatedKey = JSON.parse(decodedKey);
                }
            } catch (parseError) {
                console.error("Error parsing lastEvaluatedKey:", parseError);
            }
        }

        const { orgs, newLastEvaluatedKey } = await orgService.findAllPublicOrgs(
            lastEvaluatedKey as Record<string, any>
        );

        if (!orgs || orgs.length === 0) {
            throw new AppError(`No organizations found!`, 204);
        }

        // Refresh all logo pre-signed URLs for the frontend
        for (const org of orgs) {
            if (org.logoS3Key) {
                try {
                    // Generate a new pre-signed URL for the logo
                    org.logoUrl = await s3Service.getLogoPreSignedUrl(org.logoS3Key);
                    logger.debug(`Refreshed logo URL for organization ${org.name} in guest route`);
                } catch (error) {
                    // Log the error but continue processing other organizations
                    logger.error(`Error refreshing logo URL for org ${org.name || org.id}:`, error);
                    // If we can't generate a new URL, at least keep the existing one
                }
            }
        }

        return res.status(200).json({
            message: `Here are all organizations!`,
            data: {
                organizations: orgs,
            },
            lastEvaluatedKey: newLastEvaluatedKey,
        });
    } catch (error) {
        next(error);
    }
});

/*
 * Returning the public events from a specific organizations
 *
 * Limits the total events to 9 per request (via eventRepo);
 * */
guestRouter.get(
    '/organizations/:id/events',
    async (req: Request, res: Response, next: NextFunction) => {
        const orgID: string = req.params.id;

        try {
            const { events, newLastEvaluatedKey } =
                await eventService.getAllPublicOrganizationEvents(orgID);

            if (!events || events.length === 0) {
                throw new AppError(`No public events found!`, 204);
            }

            return res.status(200).json({
                status: 'success',
                data: {
                    events: events,
                },
                lastEvaluatedKey: newLastEvaluatedKey,
            });
        } catch (error) {
            next(error);
        }
    }
);