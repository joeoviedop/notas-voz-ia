import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestApp, expectErrorResponse, expectSuccessResponse, createTestUser } from '../utils/testHelpers.js';
import { mockUser } from '../setup.js';

// Mock the services
const mockAuthService = {
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  generateTokens: jest.fn(),
  verifyToken: jest.fn(),
  storeRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  createPasswordResetToken: jest.fn(),
  verifyPasswordResetToken: jest.fn(),
  deletePasswordResetToken: jest.fn(),
};

const mockAuditService = {
  logEvent: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock the services
jest.mock('../../src/services/auth.js', () => ({
  authService: mockAuthService,
}));

jest.mock('../../src/services/audit.js', () => ({
  auditService: mockAuditService,
}));

jest.mock('../../src/services/db.js', () => ({
  db: mockPrisma,
}));

describe('Auth Routes', () => {
  let app: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
    
    // Register auth routes
    await app.register(import('../../src/routes/auth.js'));
    
    // Setup default mocks
    mockAuditService.logEvent.mockResolvedValue(undefined);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = createTestUser({
        id: 'new-user-id',
        email: 'newuser@example.com',
      });

      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockAuthService.hashPassword.mockResolvedValue('$2b$10$hashedpassword');
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      mockAuthService.storeRefreshToken.mockResolvedValue({
        id: 'refresh-token-id',
        userId: newUser.id,
        token: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'password123',
        },
      });

      expectSuccessResponse(response, {
        user: {
          id: newUser.id,
          email: newUser.email,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        accessToken: 'access-token',
      }, 201);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          passwordHash: '$2b$10$hashedpassword',
        },
      });
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: newUser.id,
        action: 'USER_REGISTERED',
        resourceType: 'USER',
        resourceId: newUser.id,
        correlationId: expect.any(String),
      });

      // Check that refresh token cookie is set
      expect(response.cookies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'refreshToken',
            value: 'refresh-token',
            httpOnly: true,
            secure: false, // Test environment
            sameSite: 'Lax',
          }),
        ])
      );
    });

    it('should reject registration with existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expectErrorResponse(response, 'EMAIL_ALREADY_EXISTS', 409);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          // Missing password
        },
      });

      expectErrorResponse(response, 'VALIDATION_ERROR', 400);
    });

    it('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expectErrorResponse(response, 'VALIDATION_ERROR', 400);
    });

    it('should validate password length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          password: '123', // Too short
        },
      });

      expectErrorResponse(response, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      mockAuthService.storeRefreshToken.mockResolvedValue({
        id: 'refresh-token-id',
        userId: mockUser.id,
        token: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expectSuccessResponse(response, {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        accessToken: 'access-token',
      });

      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'password123',
        mockUser.passwordHash
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'USER_LOGGED_IN',
        resourceType: 'USER',
        resourceId: mockUser.id,
        correlationId: expect.any(String),
      });
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
    });

    it('should reject wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const mockRefreshTokenData = {
        id: 'refresh-token-id',
        userId: mockUser.id,
        token: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.verifyRefreshToken.mockResolvedValue(mockRefreshTokenData);
      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      mockAuthService.storeRefreshToken.mockResolvedValue(mockRefreshTokenData);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: {
          refreshToken: 'refresh-token',
        },
      });

      expectSuccessResponse(response, {
        accessToken: 'new-access-token',
      });

      expect(mockAuthService.verifyRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'refresh-token'
      );
    });

    it('should reject invalid refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.verifyRefreshToken.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: {
          refreshToken: 'invalid-token',
        },
      });

      expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
    });

    it('should reject missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
      });

      expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.revokeRefreshToken.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: 'Bearer valid-access-token',
        },
        cookies: {
          refreshToken: 'refresh-token',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(mockAuthService.revokeRefreshToken).toHaveBeenCalledWith(mockUser.id);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'USER_LOGGED_OUT',
        resourceType: 'USER',
        resourceId: mockUser.id,
        correlationId: expect.any(String),
      });

      // Check that refresh token cookie is cleared
      expect(response.cookies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'refreshToken',
            value: '',
            maxAge: 0,
          }),
        ])
      );
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expectErrorResponse(response, 'AUTH_TOKEN_EXPIRED', 401);
    });
  });

  describe('POST /auth/reset/request', () => {
    it('should create password reset request', async () => {
      const mockResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        token: 'reset-token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.createPasswordResetToken.mockResolvedValue(mockResetToken);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset/request',
        payload: {
          email: 'test@example.com',
        },
      });

      expectSuccessResponse(response, {
        message: 'Password reset email sent',
      });

      expect(mockAuthService.createPasswordResetToken).toHaveBeenCalledWith(mockUser.id);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'USER',
        resourceId: mockUser.id,
        correlationId: expect.any(String),
      });
    });

    it('should handle non-existent email gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset/request',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      // Should still return success for security reasons
      expectSuccessResponse(response, {
        message: 'Password reset email sent',
      });

      expect(mockAuthService.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset/confirm', () => {
    it('should reset password successfully', async () => {
      const mockResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        token: 'valid-reset-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockAuthService.verifyPasswordResetToken.mockResolvedValue(mockResetToken);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockAuthService.hashPassword.mockResolvedValue('$2b$10$newhashedpassword');
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: '$2b$10$newhashedpassword' });
      mockAuthService.deletePasswordResetToken.mockResolvedValue(undefined);
      mockAuthService.revokeRefreshToken.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset/confirm',
        payload: {
          token: 'valid-reset-token',
          newPassword: 'newpassword123',
        },
      });

      expectSuccessResponse(response, {
        message: 'Password reset successful',
      });

      expect(mockAuthService.verifyPasswordResetToken).toHaveBeenCalledWith('valid-reset-token');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { passwordHash: '$2b$10$newhashedpassword' },
      });
      expect(mockAuthService.deletePasswordResetToken).toHaveBeenCalledWith('valid-reset-token');
      expect(mockAuthService.revokeRefreshToken).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject invalid reset token', async () => {
      mockAuthService.verifyPasswordResetToken.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset/confirm',
        payload: {
          token: 'invalid-token',
          newPassword: 'newpassword123',
        },
      });

      expectErrorResponse(response, 'INVALID_RESET_TOKEN', 400);
    });

    it('should validate new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset/confirm',
        payload: {
          token: 'valid-token',
          newPassword: '123', // Too short
        },
      });

      expectErrorResponse(response, 'VALIDATION_ERROR', 400);
    });
  });
});