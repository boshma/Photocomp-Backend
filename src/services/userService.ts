import { UserRepository } from '../repositories/userRepository';
import { User, RegisterRequest, createUserFromRegister, AuthRequest, PasswordChangeRequest } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findUserByEmail(email);
    }

    async register(
        registerRequest: RegisterRequest
    ): Promise<{ user: Omit<User, 'password'>; token: string }> {
        try {
            // Check if user with this email already exists
            const existingUser = await this.getUserByEmail(registerRequest.email);

            if (existingUser) {
                throw new AppError('Email already in use', 409);
            }

            // Create a new user object
            const user = createUserFromRegister(registerRequest);

            // Hash the password before storing
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);

            try {
                // Save the user to the database
                const createdUser = await this.userRepository.createUser(user);

                // Generate JWT token
                const token = this.generateToken(createdUser);

                // Return user (without password) and token
                const { password, ...userWithoutPassword } = createdUser;

                return {
                    user: userWithoutPassword as Omit<User, 'password'>,
                    token,
                };
            } catch (error) {
                // This will specifically catch the database error from createUser
                throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
        }
    }

    async login(
        authRequest: AuthRequest
    ): Promise<{ user: Omit<User, 'password'>; token: string }> {
        try {
            // Find user by email
            const user = await this.getUserByEmail(authRequest.email);

            // If user doesn't exist
            if (!user) {
                throw new AppError('Invalid email or password', 401);
            }

            // Check if the password is correct
            const isPasswordValid = await bcrypt.compare(authRequest.password, user.password);

            if (!isPasswordValid) {
                throw new AppError('Invalid email or password', 401);
            }

            // Generate JWT token
            const token = this.generateToken(user);

            // Return user (without password) and token
            const { password, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword as Omit<User, 'password'>,
                token,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Login failed: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Change user password
     * @param passwordChangeRequest Request with user ID, current password and new password
     * @returns Boolean indicating success
     */
    async changePassword(passwordChangeRequest: PasswordChangeRequest): Promise<boolean> {
        const { userId, currentPassword, newPassword } = passwordChangeRequest;

        try {
            // Get the user to make sure they exist
            const user = await this.userRepository.getUserById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new AppError('Current password is incorrect', 401);
            }

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, salt);

            // Update the password in the database
            const updated = await this.userRepository.updateUserPassword(userId, hashedNewPassword);

            return updated;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to change password: ${(error as Error).message}`, 500);
        }
    }

    private generateToken(user: User): string {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );
    }

    /**
     * Get a user by ID
     * @param userId The ID of the user to retrieve
     * @returns The user or null if not found
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            return await this.userRepository.getUserById(userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get user by ID: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Deletes a user and all their membership records and event attendance records
     * @param userId The ID of the user to delete
     * @returns Boolean indicating success
     */
    async deleteUser(userId: string): Promise<boolean> {
        try {
            // First get the user to make sure they exist
            const user = await this.userRepository.getUserById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Delete all event attendance records
            const deletedEventAttendance =
                await this.userRepository.deleteUserEventAttendance(userId);

            // Delete all organization memberships
            const deletedMemberships =
                await this.userRepository.deleteUserOrganizationMemberships(userId);

            // Delete the user entity
            const deletedUser = await this.userRepository.deleteUser(userId);

            return deletedUser && deletedMemberships && deletedEventAttendance;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to delete user: ${(error as Error).message}`, 500);
        }
    }
}