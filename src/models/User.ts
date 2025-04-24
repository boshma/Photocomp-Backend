import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
    USER = 'USER', // Default role for registered users
    MEMBER = 'MEMBER', // User who is part of an organization
    ADMIN = 'ADMIN', // User with admin privileges in an organization
}

export interface User {
    PK: string; // USER#<id>
    SK: 'ENTITY';
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    type: 'USER';
    // GSI attributes
    GSI1PK?: string; // EMAIL#<email>
    GSI1SK?: 'ENTITY'; // ENTITY
}

export interface AuthRequest {
    email: string;
    password: string;
}

export interface RegisterRequest extends AuthRequest {
    firstName: string;
    lastName: string;
}

export interface PasswordChangeRequest {
    userId: string;
    currentPassword: string;
    newPassword: string;
}

export const createUserFromRegister = (registerRequest: RegisterRequest): User => {
    const id = uuidv4();
    const now = new Date().toISOString();

    return {
        PK: `USER#${id}`,
        SK: `ENTITY`,
        id,
        email: registerRequest.email,
        firstName: registerRequest.firstName,
        lastName: registerRequest.lastName,
        password: registerRequest.password,
        role: UserRole.USER, // Default role is USER
        createdAt: now,
        updatedAt: now,
        type: 'USER',
        // GSI for email lookups
        GSI1PK: `EMAIL#${registerRequest.email}`,
        GSI1SK: `ENTITY`,
    };
};