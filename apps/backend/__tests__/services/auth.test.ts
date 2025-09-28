import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authService } from '../../src/services/auth.js';
import { mockUser, mockRefreshToken } from '../setup.js';

// Mock the database
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
} as any;

jest.mock('../../src/services/db.js', () => ({
  db: mockPrisma,
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const mockHash = '$2b$10$hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      const result = await authService.hashPassword('password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toBe(mockHash);
    });

    it('should handle hashing errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

      await expect(authService.hashPassword('password123')).rejects.toThrow('Hash error');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyPassword('password123', '$2b$10$hashedpassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$hashedpassword');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.verifyPassword('wrongpassword', '$2b$10$hashedpassword');

      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare error'));

      await expect(
        authService.verifyPassword('password123', '$2b$10$hashedpassword')
      ).rejects.toThrow('Compare error');
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authService.generateTokens(mockUser.id, mockUser.email);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          type: 'access',
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', async () => {
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authService.verifyToken('valid-token', 'access');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_ACCESS_SECRET);
      expect(result).toEqual(mockPayload);
    });

    it('should verify valid refresh token', async () => {
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authService.verifyToken('valid-refresh-token', 'refresh');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', process.env.JWT_REFRESH_SECRET);
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token', 'access')).rejects.toThrow('Invalid token');
    });

    it('should throw error for wrong token type', async () => {
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'refresh', // Wrong type
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      await expect(authService.verifyToken('token-with-wrong-type', 'access')).rejects.toThrow(
        'Invalid token type'
      );
    });
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token in database', async () => {
      const hashedToken = '$2b$10$hashedrefreshtoken';
      const createdToken = { ...mockRefreshToken, token: hashedToken };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedToken);
      mockPrisma.refreshToken.create.mockResolvedValue(createdToken);

      const result = await authService.storeRefreshToken(mockUser.id, 'raw-refresh-token');

      expect(bcrypt.hash).toHaveBeenCalledWith('raw-refresh-token', 10);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: hashedToken,
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toEqual(createdToken);
    });

    it('should handle storage errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

      await expect(
        authService.storeRefreshToken(mockUser.id, 'raw-refresh-token')
      ).rejects.toThrow('Hash error');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const hashedToken = '$2b$10$hashedrefreshtoken';
      const storedToken = { ...mockRefreshToken, token: hashedToken };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyRefreshToken(mockUser.id, 'raw-refresh-token');

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('raw-refresh-token', hashedToken);
      expect(result).toEqual(storedToken);
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await authService.verifyRefreshToken(mockUser.id, 'non-existent-token');

      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      const hashedToken = '$2b$10$hashedrefreshtoken';
      const storedToken = { ...mockRefreshToken, token: hashedToken };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.verifyRefreshToken(mockUser.id, 'wrong-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const hashedToken = '$2b$10$hashedrefreshtoken';
      const expiredToken = {
        ...mockRefreshToken,
        token: hashedToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyRefreshToken(mockUser.id, 'expired-token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token for user', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await authService.revokeRefreshToken(mockUser.id);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
        },
      });
    });

    it('should handle revocation errors', async () => {
      mockPrisma.refreshToken.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(authService.revokeRefreshToken(mockUser.id)).rejects.toThrow('Database error');
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create password reset token', async () => {
      const mockResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        token: 'mock-reset-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        createdAt: new Date(),
      };

      mockPrisma.passwordResetToken.create.mockResolvedValue(mockResetToken);

      const result = await authService.createPasswordResetToken(mockUser.id);

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockResetToken);
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify valid reset token', async () => {
      const mockResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        token: 'valid-reset-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        createdAt: new Date(),
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);

      const result = await authService.verifyPasswordResetToken('valid-reset-token');

      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: {
          token: 'valid-reset-token',
        },
      });
      expect(result).toEqual(mockResetToken);
    });

    it('should return null for expired token', async () => {
      const expiredResetToken = {
        id: 'reset-token-id',
        userId: mockUser.id,
        token: 'expired-reset-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(expiredResetToken);

      const result = await authService.verifyPasswordResetToken('expired-reset-token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await authService.verifyPasswordResetToken('non-existent-token');

      expect(result).toBeNull();
    });
  });

  describe('deletePasswordResetToken', () => {
    it('should delete password reset token', async () => {
      mockPrisma.passwordResetToken.delete.mockResolvedValue({
        id: 'reset-token-id',
      });

      await authService.deletePasswordResetToken('valid-reset-token');

      expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({
        where: {
          token: 'valid-reset-token',
        },
      });
    });

    it('should handle deletion errors gracefully', async () => {
      mockPrisma.passwordResetToken.delete.mockRejectedValue(new Error('Token not found'));

      // Should not throw - deletion errors are handled gracefully
      await expect(
        authService.deletePasswordResetToken('non-existent-token')
      ).resolves.not.toThrow();
    });
  });
});