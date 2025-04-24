import { Request, Response, Router, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { OrgService } from '../services/orgService';
import {
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    UserOrganizationRelationship,
} from '../models/Organizations';
import { AppError } from '../middleware/errorHandler';
import { checkOrgAdmin, validateUserID } from '../middleware/OrgMiddleware';
import { handleLogoUpload } from '../middleware/orgLogoUploadMiddleware';

const orgService = new OrgService();
export const orgRouter = Router();

/*
 * Get all orgs that a User is a part of
 * GET /organizations
 * */
orgRouter.get(`/`, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = res.locals.user.info;

        const org = await orgService.findOrgsByUser(user.id);

        if (!org) {
            throw new AppError(`No organizations found!`, 204);
        }

        res.status(200).json({ message: `Here are your organizations!`, org: org });
    } catch (error) {
        next(error);
    }
});

/*
 * Create a new organization, and make the creator an Admin
 * POST /organizations
 * */
orgRouter.post(`/`,
    handleLogoUpload('logo'), // Add middleware for logo file upload
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, description, website, contactEmail } = req.body;
            const user = res.locals.user.info;

            // Check if logo file was uploaded
            if (!req.file) {
                throw new AppError('Logo file is required', 400);
            }

            // Prepare organization request without logoUrl (will be generated from file)
            const organizationRequest: Omit<OrganizationCreateRequest, 'logoUrl'> = {
                name,
                description,
                website,
                contactEmail
            };

            // Use the new method that handles file uploads
            const org = await orgService.createOrgWithFileUpload(
                organizationRequest,
                user.id,
                req.file.buffer,
                req.file.mimetype
            );

            if (org) {
                try {
                    const userAdmin = await orgService.createUserAdmin(name, user.id, user.email);

                    if (userAdmin) {
                        res.status(201).json({
                            status: 'Created organization!',
                            data: {
                                user: userAdmin.userId,
                                org: org.name,
                                logoUrl: org.logoUrl, // Return the pre-signed URL
                                logoS3Key: org.logoS3Key, // Return the S3 key for reference
                            },
                        });
                    }
                } catch (error: any) {
                    throw new AppError(`User Organization not created`, 400);
                }
            } else {
                throw new AppError(`Organization not created`, 400);
            }
        } catch (error) {
            next(error);
        }
    });

/*
 * Update an organization's information
 * PATCH /organizations
 * remove admin
 * */
orgRouter.patch(`/:id`,
    handleLogoUpload('logo'),  // Add middleware for logo file upload (optional)
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { description, website, contactEmail } = req.body;
            const user = res.locals.user.info;
            const orgName: string = req.params.orgId || req.params.id;

            // Validate URLs if provided
            await orgService.validateUrl(website);

            const existingOrg = await orgService.findOrgByName(orgName);

            if (!existingOrg) {
                throw new AppError(`No Organizations found!`, 400);
            }
            console.log(`found org`);
            let logoUrl = existingOrg.logoUrl;
            let logoS3Key = existingOrg.logoS3Key;

            // Handle logo file upload if provided
            if (req.file) {
                const logoData = await orgService.updateOrgLogoWithFile(
                    orgName,
                    req.file.buffer,
                    req.file.mimetype
                );
                logoUrl = logoData.logoUrl;
                logoS3Key = logoData.logoS3Key;
            }
            console.log(`after logo file`);
            const org: OrganizationUpdateRequest = {
                name: orgName,
                logoUrl,
                description,
                website,
                contactEmail,
            };

            const updatedOrg = await orgService.updateOrgByName(org);
            console.log(`after update`);
            if (!updatedOrg) {
                throw new AppError(`Failed to update Organization`, 400);
            }
            console.log(`before res`)
            res.status(200).json({
                status: 'Updated organization!',
                data: {
                    org: updatedOrg,
                },
            });
        } catch (error) {
            next(error);
        }
    });
