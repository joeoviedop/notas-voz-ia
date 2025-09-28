import { User, EventType } from '@prisma/client';
import { db } from './database.js';
import { passwordService } from './password.js';
import { jwtService } from './jwt.js';

export interface CreateUserData {
  email: string;
  password: string;
}

export interface AuthenticateUserData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserData, metadata?: Record<string, any>): Promise<UserProfile> {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await db.client.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password
    const passwordValidation = passwordService.validate(password);
    if (!passwordValidation.valid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const hashedPassword = await passwordService.hash(password);

    // Create user in a transaction
    const user = await db.transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          tokenVersion: 0,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      // Log audit event
      await prisma.auditEvent.create({
        data: {
          type: EventType.user_registered,
          userId: newUser.id,
          metadata,
        },
      });

      return newUser;
    });

    return user;
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(
    data: AuthenticateUserData,
    metadata?: Record<string, any>
  ): Promise<{
    user: UserProfile;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const { email, password } = data;

    // Find user
    const user = await db.client.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Log failed login attempt
      await this.logFailedLogin(email, 'User not found', metadata);
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await passwordService.compare(password, user.password);
    if (!isValidPassword) {
      // Log failed login attempt
      await this.logFailedLogin(email, 'Invalid password', metadata);
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = jwtService.generateTokenPair(
      user.id,
      user.email,
      user.tokenVersion
    );

    // Log successful login
    await db.client.auditEvent.create({
      data: {
        type: EventType.user_login,
        userId: user.id,
        metadata: {
          ...metadata,
          loginTime: new Date().toISOString(),
        },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    const user = await db.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const user = await db.client.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Invalidate all refresh tokens for a user (logout all devices)
   */
  async invalidateAllTokens(userId: string, metadata?: Record<string, any>): Promise<void> {
    await db.transaction(async (prisma) => {
      // Increment token version to invalidate all refresh tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: {
            increment: 1,
          },
        },
      });

      // Log logout event
      await prisma.auditEvent.create({
        data: {
          type: EventType.user_logout,
          userId,
          metadata,
        },
      });
    });
  }

  /**
   * Refresh user tokens
   */
  async refreshUserTokens(refreshToken: string): Promise<{
    accessToken: string;
  }> {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Get user and verify token version
    const user = await db.client.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(email: string): Promise<string> {
    const user = await db.client.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists, but still log the attempt
      await this.logPasswordResetAttempt(email, 'User not found');
      return ''; // Return empty string but don't throw
    }

    // Generate secure token
    const token = jwtService.generateSecureToken();
    const hashedToken = jwtService.hashToken(token);

    // Store password reset token (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.transaction(async (prisma) => {
      // Remove any existing password reset tokens for this user
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id },
      });

      // Create new password reset token
      await prisma.passwordReset.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt,
        },
      });

      // Log password reset request
      await prisma.auditEvent.create({
        data: {
          type: EventType.password_reset_requested,
          userId: user.id,
        },
      });
    });

    return token; // Return unhashed token for email
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const hashedToken = jwtService.hashToken(token);

    // Find valid password reset token
    const passwordReset = await db.client.passwordReset.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!passwordReset) {
      throw new Error('Invalid or expired password reset token');
    }

    // Validate new password
    const passwordValidation = passwordService.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await passwordService.hash(newPassword);

    await db.transaction(async (prisma) => {
      // Update user password and increment token version (to invalidate all tokens)
      await prisma.user.update({
        where: { id: passwordReset.userId },
        data: {
          password: hashedPassword,
          tokenVersion: {
            increment: 1,
          },
        },
      });

      // Mark password reset token as used
      await prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: {
          usedAt: new Date(),
        },
      });

      // Log password reset completion
      await prisma.auditEvent.create({
        data: {
          type: EventType.password_reset_completed,
          userId: passwordReset.userId,
          metadata,
        },
      });
    });
  }

  /**
   * Log failed login attempt
   */
  private async logFailedLogin(
    email: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.client.auditEvent.create({
      data: {
        type: EventType.user_login_failed,
        metadata: {
          email: email.toLowerCase(),
          reason,
          ...metadata,
        },
      },
    });
  }

  /**
   * Log password reset attempt
   */
  private async logPasswordResetAttempt(email: string, reason: string): Promise<void> {
    await db.client.auditEvent.create({
      data: {
        type: EventType.password_reset_requested,
        metadata: {
          email: email.toLowerCase(),
          reason,
        },
      },
    });
  }
}

// Singleton instance
export const userService = new UserService();