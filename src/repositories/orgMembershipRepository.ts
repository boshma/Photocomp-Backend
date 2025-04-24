// Create a new repository file for handling organization membership requests
// src/repositories/orgMembershipRepository.ts

import { dynamoDb, TABLE_NAME } from '../config/db';
import { OrganizationMembershipRequest } from '../models/Organizations';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '../middleware/errorHandler';

export class OrgMembershipRepository {
    /**
     * Creates a new membership request in the database
     * @param request The membership request to create
     * @returns The created membership request
     */
    async createMembershipRequest(
        request: OrganizationMembershipRequest
    ): Promise<OrganizationMembershipRequest> {
        try {
            await dynamoDb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: request,
                    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
                })
            );
            return request;
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new AppError(
                    'You have already submitted a request to join this organization',
                    409
                );
            }
            throw new AppError(`Failed to create membership request: ${error.message}`, 500);
        }
    }

    /**
     * Gets all pending membership requests for an organization
     * @param organizationName The name of the organization
     * @returns List of pending membership requests
     */
    async getPendingRequestsByOrganization(
        organizationName: string
    ): Promise<OrganizationMembershipRequest[]> {
        try {
            const result = await dynamoDb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: 'PK = :orgKey AND begins_with(SK, :requestPrefix)',
                    ExpressionAttributeValues: {
                        ':orgKey': `ORG#${organizationName.toUpperCase()}`,
                        ':requestPrefix': 'REQUEST#',
                    },
                })
            );

            return (result.Items || []) as OrganizationMembershipRequest[];
        } catch (error: any) {
            throw new AppError(`Failed to fetch membership requests: ${error.message}`, 500);
        }
    }

    /**
     * Deletes a membership request from the database
     * @param organizationName The name of the organization
     * @param userId The ID of the user whose request is being deleted
     * @returns True if successful, false otherwise
     */
    async deleteMembershipRequest(organizationName: string, userId: string): Promise<boolean> {
        try {
            await dynamoDb.send(
                new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `ORG#${organizationName.toUpperCase()}`,
                        SK: `REQUEST#${userId}`,
                    },
                })
            );
            return true;
        } catch (error: any) {
            throw new AppError(`Failed to delete membership request: ${error.message}`, 500);
        }
    }
}
