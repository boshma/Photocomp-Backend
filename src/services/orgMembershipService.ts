// src/services/orgMembershipService.ts

import { EventService } from './eventService';
import { OrgService } from './orgService';
import { UserService } from './userService';
import { OrgMembershipRepository } from '../repositories/orgMembershipRepository';
import {
    OrganizationMembershipRequest,
    UserOrganizationRelationship,
    createOrganizationMembershipRequest,
    addOrganizationAdmin,
} from '../models/Organizations';
import { User, UserRole } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export class OrgMembershipService {
    private orgMembershipRepository: OrgMembershipRepository;
    private eventService: EventService;
    private orgService: OrgService;
    private userService: UserService;

    constructor(
        orgMembershipRepository: OrgMembershipRepository = new OrgMembershipRepository(),
        eventService: EventService = new EventService(),
        orgService: OrgService = new OrgService(),
        userService: UserService = new UserService()
    ) {
        this.orgMembershipRepository = orgMembershipRepository;
        this.eventService = eventService;
        this.orgService = orgService;
        this.userService = userService;
    }

    /**
     * Submits a request to join an organization
     * @param organizationName The name of the organization to join
     * @param userId The ID of the user requesting to join
     * @param message Optional message from the user
     * @returns The created membership request
     */
    async applyToOrganization(
        organizationName: string,
        userId: string,
        message?: string
    ): Promise<OrganizationMembershipRequest> {
        const organization = await this.orgService.findOrgByName(organizationName);
        if (!organization) {
            throw new AppError('Organization not found', 404);
        }

        const member = await this.orgService.isMemberOfOrg(organizationName, userId);
        if (member) {
            throw new AppError('You are already a part of this organization', 400);
        }

        const events = await this.eventService.getAllOrganizationEvents(organizationName);
        if (!events || events.length === 0) {
            throw new AppError('Cannot apply to an organization without any events', 400);
        }

        const request = createOrganizationMembershipRequest(organizationName, userId, message);

        return await this.orgMembershipRepository.createMembershipRequest(request);
    }

    /**
     * Get all pending membership requests for an organization
     * @param organizationName The name of the organization
     * @returns List of pending membership requests
     */
    async getPendingRequests(organizationName: string): Promise<OrganizationMembershipRequest[]> {
        return await this.orgMembershipRepository.getPendingRequestsByOrganization(
            organizationName
        );
    }

    /**
     * Approve a membership request
     * @param organizationName The name of the organization
     * @param userId The ID of the user whose request is being approved
     * @returns The new user-org relationship
     */
    async approveRequest(
        organizationName: string,
        userId: string
    ): Promise<UserOrganizationRelationship | null> {
        const events = await this.eventService.getAllOrganizationEvents(organizationName);
        if (!events || events.length === 0) {
            throw new AppError(
                'Cannot approve new members for an organization without events',
                400
            );
        }

        // Check if request exists
        // We don't need to check the status since we're going to delete it regardless
        const requests = await this.getPendingRequests(organizationName);
        const userRequest = requests.find(req => req.userId === userId);

        if (!userRequest) {
            throw new AppError('Membership request not found', 404);
        }

        const user: User = (await this.userService.getUserById(userId)) as User;

        const userOrgRelationship = {
            ...addOrganizationAdmin(organizationName, userId, user.email),
            role: UserRole.MEMBER,
        };

        const membership =
            await this.orgService.createUserOrganizationRelationship(userOrgRelationship);

        await this.orgMembershipRepository.deleteMembershipRequest(organizationName, userId);

        return membership;
    }

    /**
     * Deny a membership request
     * @param organizationName The name of the organization
     * @param userId The ID of the user whose request is being denied
     * @returns Boolean indicating success
     */
    async denyRequest(organizationName: string, userId: string): Promise<boolean> {
        const requests = await this.getPendingRequests(organizationName);
        const userRequest = requests.find(req => req.userId === userId);

        if (!userRequest) {
            throw new AppError('Membership request not found', 404);
        }

        return await this.orgMembershipRepository.deleteMembershipRequest(organizationName, userId);
    }
}
