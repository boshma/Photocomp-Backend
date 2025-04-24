// tests/services/orgMembershipService.test.ts
import { OrgMembershipService } from '../src/services/orgMembershipService';
import { OrgMembershipRepository } from '../src/repositories/orgMembershipRepository';
import { EventService } from '../src/services/eventService';
import { OrgService } from '../src/services/orgService';
import { AppError } from '../src/middleware/errorHandler';
import { OrganizationMembershipRequest } from '../src/models/Organizations';
import { UserService } from '@/services/userService';
import { User, UserRole } from '@/models/User';

jest.mock('../src/repositories/orgMembershipRepository');
jest.mock('../src/services/eventService');
jest.mock('../src/services/orgService');
jest.mock('../src/services/userService');
jest.mock('../src/models/Organizations', () => {
    const original = jest.requireActual('../src/models/Organizations');
    return {
        ...original,
        addOrganizationAdmin: jest.fn().mockImplementation((orgName, userId, email) => ({
            userId,
            organizationName: orgName,
            email,
            role: 'ADMIN',
        })),
    };
});

describe('OrgMembershipService', () => {
    let orgMembershipService: OrgMembershipService;
    let mockOrgMembershipRepository: jest.Mocked<OrgMembershipRepository>;
    let mockEventService: jest.Mocked<EventService>;
    let mockUserService: jest.Mocked<UserService>;
    let mockOrgService: jest.Mocked<OrgService>;

    const mockOrganizationName = 'testOrg';
    const mockUserId = 'user123';
    const mockMessage = 'Please let me join your organization';
    const mockEmail = 'sample@email.com';

    beforeEach(() => {
        jest.clearAllMocks();

        mockOrgMembershipRepository =
            new OrgMembershipRepository() as jest.Mocked<OrgMembershipRepository>;
        mockEventService = new EventService() as jest.Mocked<EventService>;
        mockOrgService = new OrgService() as jest.Mocked<OrgService>;
        mockUserService = new UserService() as jest.Mocked<UserService>;

        orgMembershipService = new OrgMembershipService(
            mockOrgMembershipRepository,
            mockEventService,
            mockOrgService,
            mockUserService
        );
    });

    describe('applyToOrganization', () => {
        it('should successfully create a membership request ', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const mockRequest = {
                organizationName: mockOrganizationName,
                userId: mockUserId,
                message: mockMessage,
                status: 'PENDING',
                PK: `ORG#${mockOrganizationName.toUpperCase()}`,
                SK: `REQUEST#${mockUserId}`,
            } as unknown as OrganizationMembershipRequest;

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgService.isMemberOfOrg.mockResolvedValue(false);
            mockOrgMembershipRepository.createMembershipRequest.mockResolvedValue(mockRequest);

            const result = await orgMembershipService.applyToOrganization(
                mockOrganizationName,
                mockUserId,
                mockMessage
            );

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
            expect(result).toEqual(mockRequest);
        });

        it('should throw an error if the organization does not exist', async () => {
            mockOrgService.findOrgByName.mockResolvedValue(null);

            await expect(
                orgMembershipService.applyToOrganization(
                    mockOrganizationName,
                    mockUserId,
                    mockMessage
                )
            ).rejects.toThrow(new AppError('Organization not found', 404));

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).not.toHaveBeenCalled();
            expect(mockOrgMembershipRepository.createMembershipRequest).not.toHaveBeenCalled();
        });

        it('should throw an error if the organization has no events', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockOrgService.isMemberOfOrg.mockResolvedValue(false);
            mockEventService.getAllOrganizationEvents.mockResolvedValue([]);

            await expect(
                orgMembershipService.applyToOrganization(
                    mockOrganizationName,
                    mockUserId,
                    mockMessage
                )
            ).rejects.toThrow(
                new AppError('Cannot apply to an organization without any events', 400)
            );

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(mockOrgMembershipRepository.createMembershipRequest).not.toHaveBeenCalled();
        });

        it('should throw errors if the member is a part of the organization', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const preExistingUserError = new AppError(
                'You are already a part of this organization',
                400
            );

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockOrgService.isMemberOfOrg.mockResolvedValue(true);

            await expect(
                orgMembershipService.applyToOrganization(
                    mockOrganizationName,
                    mockUserId,
                    mockMessage
                )
            ).rejects.toThrow(preExistingUserError);

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgService.isMemberOfOrg).toHaveBeenCalledWith(
                mockOrganizationName,
                mockUserId
            );
            expect(mockEventService.getAllOrganizationEvents).not.toHaveBeenCalled();
            expect(mockOrgMembershipRepository.createMembershipRequest).not.toHaveBeenCalled();
        });

        it('should throw errors from the repository', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const repositoryError = new AppError('Database error', 500);

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgMembershipRepository.createMembershipRequest.mockRejectedValue(repositoryError);

            await expect(
                orgMembershipService.applyToOrganization(
                    mockOrganizationName,
                    mockUserId,
                    mockMessage
                )
            ).rejects.toThrow(repositoryError);

            expect(mockOrgService.findOrgByName).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
        });

        it('should create a request without a message when none is provided', async () => {
            const mockOrg = { name: mockOrganizationName, isPublic: true } as any;
            const mockEvents = [{ id: 'event1', title: 'Test Event' }] as any[];
            const mockRequest = {
                organizationName: mockOrganizationName,
                userId: mockUserId,
                message: undefined,
                status: 'PENDING',
                PK: `ORG#${mockOrganizationName.toUpperCase()}`,
                SK: `REQUEST#${mockUserId}`,
            } as unknown as OrganizationMembershipRequest;

            mockOrgService.findOrgByName.mockResolvedValue(mockOrg);
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents);
            mockOrgMembershipRepository.createMembershipRequest.mockResolvedValue(mockRequest);

            const result = await orgMembershipService.applyToOrganization(
                mockOrganizationName,
                mockUserId
            );

            expect(mockOrgMembershipRepository.createMembershipRequest).toHaveBeenCalled();
            expect(result).toEqual(mockRequest);
        });
    });

    describe('getPendingRequests', () => {
        it('should get the pending requests with valid organization name', async () => {
            const mockRequests = [
                { organizationName: mockOrganizationName, userId: 'user1', status: 'PENDING' },
                { organizationName: mockOrganizationName, userId: 'user2', status: 'PENDING' },
            ] as OrganizationMembershipRequest[];

            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );

            const result = await orgMembershipService.getPendingRequests(mockOrganizationName);

            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(result).toEqual(mockRequests);
            expect(result.length).toBe(2);
        });

        it('should return empty array when no pending requests exist', async () => {
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue([]);

            const result = await orgMembershipService.getPendingRequests(mockOrganizationName);

            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(result).toEqual([]);
        });

        it('should throw errors from the repository', async () => {
            const mockError = new AppError('Database error', 500);
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockRejectedValue(
                mockError
            );

            await expect(
                orgMembershipService.getPendingRequests(mockOrganizationName)
            ).rejects.toThrow(mockError);

            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
        });
    });

    describe('approveRequest', () => {
        const mockEvents = [{ id: 'event1' }];
        const mockRequests = [
            { organizationName: mockOrganizationName, userId: mockUserId, status: 'PENDING' },
        ] as OrganizationMembershipRequest[];
        const mockMembership = {
            userId: mockUserId,
            organizationName: mockOrganizationName,
            role: 'MEMBER',
            email: mockEmail,
        };
        const mockedUser: User = {
            PK: 'USER#123',
            SK: 'ENTITY',
            id: '123',
            email: mockEmail,
            firstName: 'Existing',
            lastName: 'User',
            role: UserRole.USER,
            createdAt: '2025-04-01T17:26:48.302Z',
            updatedAt: '2025-04-01T17:26:48.302Z',
            password: `password`,
            type: 'USER',
        };

        it('should approve the correct organization request', async () => {
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents as any);
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );
            mockOrgService.createUserOrganizationRelationship.mockResolvedValue(
                mockMembership as any
            );
            mockUserService.getUserById.mockResolvedValue(mockedUser);
            mockOrgMembershipRepository.deleteMembershipRequest.mockResolvedValue(true);

            const result = await orgMembershipService.approveRequest(
                mockOrganizationName,
                mockUserId
            );

            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgService.createUserOrganizationRelationship).toHaveBeenCalled();
            expect(mockUserService.getUserById).toHaveBeenCalled();
            expect(mockOrgMembershipRepository.deleteMembershipRequest).toHaveBeenCalledWith(
                mockOrganizationName,
                mockUserId
            );
            expect(result).toEqual(mockMembership);
        });

        it('should create membership with MEMBER role', async () => {
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents as any);
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );
            mockOrgService.createUserOrganizationRelationship.mockResolvedValue(
                mockMembership as any
            );
            mockUserService.getUserById.mockResolvedValue(mockedUser);
            mockOrgMembershipRepository.deleteMembershipRequest.mockResolvedValue(true);

            // Spy on the addOrganizationAdmin function to check role override
            const addOrganizationAdminSpy = jest.spyOn(
                require('../src/models/Organizations'),
                'addOrganizationAdmin'
            );

            await orgMembershipService.approveRequest(mockOrganizationName, mockUserId);

            expect(mockOrgService.createUserOrganizationRelationship).toHaveBeenCalled();
            expect(mockUserService.getUserById).toHaveBeenCalled();
            const passedArg = mockOrgService.createUserOrganizationRelationship.mock.calls[0][0];
            expect(passedArg.role).toBe('MEMBER');
        });

        it("should not approve a request when organization doesn't have any events", async () => {
            mockEventService.getAllOrganizationEvents.mockResolvedValue([]);

            await expect(
                orgMembershipService.approveRequest(mockOrganizationName, mockUserId)
            ).rejects.toThrow(
                new AppError('Cannot approve new members for an organization without events', 400)
            );

            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(mockOrgService.createUserOrganizationRelationship).not.toHaveBeenCalled();
            expect(mockOrgMembershipRepository.deleteMembershipRequest).not.toHaveBeenCalled();
        });

        it('should not approve a request that does not exist', async () => {
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents as any);
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue([]);

            await expect(
                orgMembershipService.approveRequest(mockOrganizationName, mockUserId)
            ).rejects.toThrow(new AppError('Membership request not found', 404));

            expect(mockEventService.getAllOrganizationEvents).toHaveBeenCalledWith(
                mockOrganizationName
            );
            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgService.createUserOrganizationRelationship).not.toHaveBeenCalled();
            expect(mockOrgMembershipRepository.deleteMembershipRequest).not.toHaveBeenCalled();
        });

        it('should propagate database errors during approval', async () => {
            mockEventService.getAllOrganizationEvents.mockResolvedValue(mockEvents as any);
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );

            const mockError = new AppError('Database error', 500);
            mockOrgService.createUserOrganizationRelationship.mockRejectedValue(mockError);
            mockUserService.getUserById.mockResolvedValue(mockedUser);

            await expect(
                orgMembershipService.approveRequest(mockOrganizationName, mockUserId)
            ).rejects.toThrow(mockError);

            expect(mockOrgService.createUserOrganizationRelationship).toHaveBeenCalled();
            expect(mockUserService.getUserById).toHaveBeenCalled();
            expect(mockOrgMembershipRepository.deleteMembershipRequest).not.toHaveBeenCalled();
        });
    });

    describe('denyRequest', () => {
        const mockRequests = [
            { organizationName: mockOrganizationName, userId: mockUserId, status: 'PENDING' },
        ] as OrganizationMembershipRequest[];

        it('should deny the correct organization request', async () => {
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );
            mockOrgMembershipRepository.deleteMembershipRequest.mockResolvedValue(true);

            const result = await orgMembershipService.denyRequest(mockOrganizationName, mockUserId);

            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgMembershipRepository.deleteMembershipRequest).toHaveBeenCalledWith(
                mockOrganizationName,
                mockUserId
            );
            expect(result).toBe(true);
        });

        it("should not deny a request that doesn't exist", async () => {
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue([]);

            await expect(
                orgMembershipService.denyRequest(mockOrganizationName, mockUserId)
            ).rejects.toThrow(new AppError('Membership request not found', 404));

            expect(
                mockOrgMembershipRepository.getPendingRequestsByOrganization
            ).toHaveBeenCalledWith(mockOrganizationName);
            expect(mockOrgMembershipRepository.deleteMembershipRequest).not.toHaveBeenCalled();
        });

        it('should propagate database errors during denial', async () => {
            mockOrgMembershipRepository.getPendingRequestsByOrganization.mockResolvedValue(
                mockRequests
            );

            const mockError = new AppError('Database error', 500);
            mockOrgMembershipRepository.deleteMembershipRequest.mockRejectedValue(mockError);

            await expect(
                orgMembershipService.denyRequest(mockOrganizationName, mockUserId)
            ).rejects.toThrow(mockError);

            expect(mockOrgMembershipRepository.deleteMembershipRequest).toHaveBeenCalled();
        });
    });
});
