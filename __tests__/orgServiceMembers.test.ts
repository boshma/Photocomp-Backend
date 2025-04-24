import { OrgService } from '../src/services/orgService';
import { OrgRepository } from '../src/repositories/orgRepository';
import { UserRole } from '../src/models/User';
import { UserOrganizationRelationship } from '../src/models/Organizations';
import { AppError } from '../src/middleware/errorHandler';

// Mock the repository
jest.mock('../src/repositories/orgRepository');

describe('OrgService Member Tests', () => {
    let orgService: OrgService;
    let mockOrgRepository: jest.Mocked<OrgRepository>;

    const orgName = 'testOrg';
    const userId = 'user123';
    const adminId = 'admin456';
    const email = 'test@example.com';

    const mockMember: UserOrganizationRelationship = {
        PK: `USER#${userId}`,
        SK: `ORG#${orgName.toUpperCase()}`,
        email,
        userId: userId,
        organizationName: orgName,
        role: UserRole.MEMBER,
        joinedAt: '2023-01-01T00:00:00.000Z',
        type: 'USER_ORG',
        GSI1PK: `ORG#${orgName.toUpperCase()}`,
        GSI1SK: `USER#${userId}`,
    };

    const mockAdmin: UserOrganizationRelationship = {
        PK: `USER#${adminId}`,
        SK: `ORG#${orgName.toUpperCase()}`,
        email,
        userId: adminId,
        organizationName: orgName,
        role: UserRole.ADMIN,
        joinedAt: '2023-01-01T00:00:00.000Z',
        type: 'USER_ORG',
        GSI1PK: `ORG#${orgName.toUpperCase()}`,
        GSI1SK: `USER#${adminId}`,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockOrgRepository = new OrgRepository() as jest.Mocked<OrgRepository>;
        orgService = new OrgService(mockOrgRepository);
    });

    describe('getOrgMembers', () => {
        it('should retrieve all organization members', async () => {
            const mockMembers = [mockMember, mockAdmin];
            mockOrgRepository.getOrgMembers.mockResolvedValue(mockMembers);

            const result = await orgService.getOrgMembers(orgName);

            expect(result).toEqual(mockMembers);
            expect(mockOrgRepository.getOrgMembers).toHaveBeenCalledWith(orgName);
        });

        it('should throw an error when no members are found', async () => {
            mockOrgRepository.getOrgMembers.mockResolvedValue([]);

            await expect(orgService.getOrgMembers(orgName)).rejects.toThrow(
                new AppError('No members found for this organization', 404)
            );
        });

        it('should propagate repository errors', async () => {
            const error = new Error('Database error');
            mockOrgRepository.getOrgMembers.mockRejectedValue(error);

            await expect(orgService.getOrgMembers(orgName)).rejects.toThrow(
                'Failed to get organization members: Database error'
            );
        });
    });

    describe('removeMember', () => {
        it('should remove a member successfully', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockMember);
            mockOrgRepository.removeMember.mockResolvedValue(true);

            const result = await orgService.removeMember(orgName, userId);

            expect(result).toBe(true);
            expect(mockOrgRepository.findSpecificOrgByUser).toHaveBeenCalledWith(orgName, userId);
            expect(mockOrgRepository.removeMember).toHaveBeenCalledWith(orgName, userId);
        });

        it('should throw an error when member does not exist', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(null);

            await expect(orgService.removeMember(orgName, userId)).rejects.toThrow(
                new AppError('Member not found in this organization', 404)
            );

            expect(mockOrgRepository.removeMember).not.toHaveBeenCalled();
        });

        it('should propagate repository errors during member lookup', async () => {
            const error = new Error('Database error');
            mockOrgRepository.findSpecificOrgByUser.mockRejectedValue(error);

            await expect(orgService.removeMember(orgName, userId)).rejects.toThrow(
                'Failed to remove member: Database error'
            );
        });
    });

    describe('updateMemberRole', () => {
        it("should update a member's role successfully", async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockMember);
            const updatedMember = { ...mockMember, role: UserRole.ADMIN };
            mockOrgRepository.updateMemberRole.mockResolvedValue(updatedMember);

            const result = await orgService.updateMemberRole(orgName, userId, UserRole.ADMIN);

            expect(result).toEqual(updatedMember);
            expect(mockOrgRepository.findSpecificOrgByUser).toHaveBeenCalledWith(orgName, userId);
            expect(mockOrgRepository.updateMemberRole).toHaveBeenCalledWith(
                orgName,
                userId,
                UserRole.ADMIN
            );
        });

        it('should throw an error when member does not exist', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(null);

            await expect(
                orgService.updateMemberRole(orgName, userId, UserRole.ADMIN)
            ).rejects.toThrow(new AppError('Member not found in this organization', 404));

            expect(mockOrgRepository.updateMemberRole).not.toHaveBeenCalled();
        });

        it('should propagate repository errors during update', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockMember);
            const error = new Error('Database error');
            mockOrgRepository.updateMemberRole.mockRejectedValue(error);

            await expect(
                orgService.updateMemberRole(orgName, userId, UserRole.ADMIN)
            ).rejects.toThrow('Failed to update member role: Database error');
        });
    });

    describe('leaveOrganization', () => {
        it('should allow a regular member to leave an organization', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockMember);
            mockOrgRepository.removeMember.mockResolvedValue(true);

            const result = await orgService.leaveOrganization(orgName, userId);

            expect(result).toBe(true);
            expect(mockOrgRepository.findSpecificOrgByUser).toHaveBeenCalledWith(orgName, userId);
            expect(mockOrgRepository.removeMember).toHaveBeenCalledWith(orgName, userId);
        });

        it('should allow an admin to leave if other admins exist', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockAdmin);
            mockOrgRepository.getOrgMembers.mockResolvedValue([
                mockAdmin,
                { ...mockMember, role: UserRole.ADMIN },
            ]);
            mockOrgRepository.removeMember.mockResolvedValue(true);

            const result = await orgService.leaveOrganization(orgName, adminId);

            expect(result).toBe(true);
            expect(mockOrgRepository.findSpecificOrgByUser).toHaveBeenCalledWith(orgName, adminId);
            expect(mockOrgRepository.getOrgMembers).toHaveBeenCalledWith(orgName);
            expect(mockOrgRepository.removeMember).toHaveBeenCalledWith(orgName, adminId);
        });

        it('should not allow the last admin to leave', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockAdmin);
            mockOrgRepository.getOrgMembers.mockResolvedValue([mockAdmin, mockMember]);

            await expect(orgService.leaveOrganization(orgName, adminId)).rejects.toThrow(
                new AppError(
                    'Cannot leave organization: You are the only admin. Please assign another admin first.',
                    400
                )
            );

            expect(mockOrgRepository.findSpecificOrgByUser).toHaveBeenCalledWith(orgName, adminId);
            expect(mockOrgRepository.getOrgMembers).toHaveBeenCalledWith(orgName);
            expect(mockOrgRepository.removeMember).not.toHaveBeenCalled();
        });

        it('should not allow a user to make another member leave', async () => {
            const differentUser = { ...mockMember, userId: 'different-user-id' };
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(differentUser);

            await expect(orgService.leaveOrganization(orgName, userId)).rejects.toThrow(
                new AppError('You cannot make another member leave', 403)
            );

            expect(mockOrgRepository.removeMember).not.toHaveBeenCalled();
        });

        it('should throw an error when member does not exist', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(null);

            await expect(orgService.leaveOrganization(orgName, userId)).rejects.toThrow(
                new AppError('Member not found in this organization', 401)
            );

            expect(mockOrgRepository.removeMember).not.toHaveBeenCalled();
        });

        it('should propagate repository errors', async () => {
            mockOrgRepository.findSpecificOrgByUser.mockResolvedValue(mockMember);
            const error = new Error('Database error');
            mockOrgRepository.removeMember.mockRejectedValue(error);

            await expect(orgService.leaveOrganization(orgName, userId)).rejects.toThrow(
                'Failed to leave organization: Database error'
            );
        });
    });
});
