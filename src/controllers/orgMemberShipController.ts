import { Request, Response, Router, NextFunction } from 'express';
import { OrgMembershipService } from '../services/orgMembershipService';
import { checkOrgAdmin, validateUserID } from '../middleware/OrgMiddleware';
import {
    OrganizationMembershipRequest,
    UserOrganizationRelationship,
} from '../models/Organizations';
import { Status } from '../models/Response';
import { UserService } from '../services/userService';

const orgMembershipService = new OrgMembershipService();
const userService = new UserService();
export const orgMembershipRouter = Router();

/**
 * Apply to join an organization
 * @route POST /organizations/:id
 */
orgMembershipRouter.post('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orgName: string = req.params.id;
        const user = res.locals.user;
        const { message } = req.body;

        const request = await orgMembershipService.applyToOrganization(orgName, user.id, message);

        return res.status(201).json({
            status: 'success',
            message: 'Application submitted successfully',
            data: {
                request,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get pending membership requests for an organization
 * @route GET /organizations/:id/requests
 */
orgMembershipRouter.get(
    '/:id/requests',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const requests: OrganizationMembershipRequest[] =
                await orgMembershipService.getPendingRequests(orgName);
            // If there are requests, get user details for each
            const requestsWithUserDetails = await Promise.all(
                requests.map(async request => {
                    const user = await userService.getUserById(request.userId);
                    return {
                        ...request,
                        userDetails: user
                            ? {
                                  id: user.id,
                                  email: user.email,
                                  firstName: user.firstName,
                                  lastName: user.lastName,
                              }
                            : null,
                    };
                })
            );

            return res.status(200).json({
                status: 'success',
                data: {
                    requests: requestsWithUserDetails,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Approve a membership request
 * @route PUT /organizations/:id/requests/:userId
 */
orgMembershipRouter.put(
    '/:id/requests/:userId',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log(`put method`);
            const orgName: string = req.params.id;
            const userId: string = req.params.userId; // member userid
            //console.log(`member ${userId}`)
            const result = await orgMembershipService.approveRequest(orgName, userId);
            console.log(`member ${result}`);
            //gets member's email
            const member = await userService.getUserById(userId);
            console.log(`member ${userId}`);
            // Prepare success response with combined data
            const status: Status = {
                statusCode: 200,
                status: 'success',
                data: [
                    `Membership request approved` as any,
                    result as UserOrganizationRelationship,
                ],
            };
            console.log(member);
            // Add email notification if members exist
            if (member) {
                // Creates the email data.
                const to: string = member.email;
                const subject: string = `An update from PhotoComp!`;
                const message: string = `You will now get updates about about ${orgName}.
                    Know more by checking out the website!`;
                const header: string = `Your membership application for ${orgName} has been approved!`;

                res.locals.user.emailInfo = { to, message, header, subject };
            }

            next(status);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Deny a membership request
 * @route POST /organizations/:id/requests/:userId
 */
orgMembershipRouter.delete(
    '/:id/requests/:userId',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgName: string = req.params.id;
            const userId: string = req.params.userId;

            const result = await orgMembershipService.denyRequest(orgName, userId);
            //gets member's email
            const member = await userService.getUserById(userId);

            // Prepare success response with combined data
            const status: Status = {
                statusCode: 200,
                status: 'success',
                data: [`Membership request denied` as any, result],
            };

            // Add email notification if members exist
            if (member) {
                // Creates the email data.
                const to: string = member.email;
                const subject: string = `An update from PhotoComp!`;
                const message: string = `Please contact ${orgName}'s admin for more info.
                    In the meantime... You can check other organizations to apply to.`;
                const header: string = `Your membership application for ${orgName} has been denied!`;

                res.locals.user.emailInfo = { to, message, header, subject };
            }

            next(status);
        } catch (error) {
            next(error);
        }
    }
);
