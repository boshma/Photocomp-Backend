import { UserRole } from '../../src/models/User';
import {
    Organization,
    OrganizationCreateRequest,
    UserOrganizationRelationship,
    OrganizationUpdateRequest,
} from '../../src/models/Organizations';
import { AuthRequest } from '../../src/models/User';

export const nonExistingOrg: null = null;

export const userId: string = `81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70`;

export let org: OrganizationCreateRequest = {
    name: `Jollibee`,
    logoUrl: `https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8`,
};

export let user: AuthRequest = {
    email: `sample1@example.com`,
    password: `test1234`,
};

export const updateOrg: OrganizationUpdateRequest = {
    name: 'Jollibee',
    description: 'Butter Burgers',
    contactEmail: 'culvers@culvers.com',
    website: 'https://www.culvers.com/',
    logoUrl: 'https://styleguide.culvers.com/brand-styles/logo-usage',
};

export const updatedOrganization: Organization = {
    PK: 'ORG#JOLLIBEE',
    SK: 'ENTITY',
    id: '6a39ef9c-f036-44ad-866c-16f4b7e81622',
    name: 'Jollibee',
    description: 'Butter Burgers',
    createdBy: '5e5bdb97-6bfa-44c0-b998-2e64568798ef',
    createdAt: '2025-04-01T21:49:53.186Z',
    updatedAt: '2025-04-02T21:36:06.111Z',
    type: 'ORGANIZATION',
    isPublic: true,
    logoUrl: 'https://styleguide.culvers.com/brand-styles/logo-usage',
    website: 'https://www.culvers.com/',
    contactEmail: 'culvers@culvers.com',
    GSI1PK: 'ORG',
    GSI1SK: 'ORG#JOLLIBEE',
};

export const existingOrg: Organization = {
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    createdAt: '2025-04-01T13:28:12.857Z',
    GSI1SK: 'ORG#PIZZA',
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    name: 'Pizza',
    GSI1PK: 'ORG',
    updatedAt: '2025-04-01T13:28:12.857Z',
    SK: 'ENTITY',
    isPublic: true,
    PK: 'ORG#PIZZA',
    id: '4353a165-adbf-43e8-8922-1da90a62a12a',
    type: 'ORGANIZATION',
};

export const createdOrg: Organization = {
    PK: 'ORG#JOLLIBEE',
    SK: 'ENTITY',
    id: 'b58bfbd2-7055-4134-aa74-304ae42bf8a8',
    name: 'Jollibee',
    description: undefined,
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    createdAt: '2025-04-01T17:26:48.302Z',
    updatedAt: '2025-04-01T17:26:48.302Z',
    type: 'ORGANIZATION',
    isPublic: true,
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    website: undefined,
    contactEmail: undefined,
    GSI1PK: 'ORG',
    GSI1SK: 'ORG#JOLLIBEE',
};

export let createdUserAdmin: UserOrganizationRelationship = {
    PK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    SK: 'ORG#JOLLIBEE',
    userId: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    organizationName: 'Jollibee',
    role: UserRole.ADMIN,
    joinedAt: '2025-04-01T17:26:48.364Z',
    type: 'USER_ORG',
    email: 'sample@email.com',
    GSI1PK: 'ORG#JOLLIBEE',
    GSI1SK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
};

export const existingOrgsUser: UserOrganizationRelationship[] = [
    {
        GSI1PK: 'ORG#CULVERS',
        joinedAt: '2025-04-01T21:49:53.238Z',
        role: UserRole.ADMIN,
        userId: '1dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        SK: 'ORG#CULVERS',
        organizationName: 'Culvers',
        GSI1SK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        PK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        type: 'USER_ORG',
        email: 'sample@email.com',
    },
    {
        GSI1PK: 'ORG#TACO BELL',
        joinedAt: '2025-04-01T21:53:45.566Z',
        role: UserRole.ADMIN,
        userId: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        SK: 'ORG#TACO BELL',
        organizationName: 'Taco Bell',
        GSI1SK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        PK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        type: 'USER_ORG',
        email: 'sample2@email.com',
    },
];

export const publicOrgsArray: Organization[] = [
    {
        PK: 'ORG#JOLLIBEE',
        SK: 'ENTITY',
        id: 'b58bfbd2-7055-4134-aa74-304ae42bf8a8',
        name: 'Jollibee',
        description: undefined,
        createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        createdAt: '2025-04-01T17:26:48.302Z',
        updatedAt: '2025-04-01T17:26:48.302Z',
        type: 'ORGANIZATION',
        isPublic: true,
        logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
        website: undefined,
        contactEmail: undefined,
        GSI1PK: 'ORG',
        GSI1SK: 'ORG#JOLLIBEE',
    },
    {
        PK: 'ORG#PIZZAHUT',
        SK: 'ENTITY',
        id: 'b58bfbd2-7055-4134-aa74-304ae42bf8a8',
        name: 'Pizza Hut',
        description: undefined,
        createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
        createdAt: '2025-04-01T17:26:48.302Z',
        updatedAt: '2025-04-01T17:26:48.302Z',
        type: 'ORGANIZATION',
        isPublic: true,
        logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
        website: undefined,
        contactEmail: undefined,
        GSI1PK: 'ORG',
        GSI1SK: 'ORG#PIZZAHUT',
    },
];
