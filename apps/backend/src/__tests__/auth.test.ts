import { jwtService } from '../services/jwt';
import { passwordService } from '../services/password';
import { userService } from '../services/user';
import { loginRateLimit, generalAuthRateLimit } from '../services/rateLimit';

describe('Auth System Tests', () => {
  
  describe('JWT Service', () => {
    test('should generate and verify access tokens', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = jwtService.generateAccessToken(payload);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      const decoded = jwtService.verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });

    test('should generate and verify refresh tokens', () => {
      const payload = { sub: 'user-123', tokenVersion: 1 };
      const token = jwtService.generateRefreshToken(payload);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      const decoded = jwtService.verifyRefreshToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.tokenVersion).toBe(payload.tokenVersion);
    });

    test('should fail on invalid tokens', () => {
      expect(() => jwtService.verifyAccessToken('invalid-token')).toThrow();
      expect(() => jwtService.verifyRefreshToken('invalid-token')).toThrow();
    });

    test('should generate token pairs', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 0);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      
      const accessDecoded = jwtService.verifyAccessToken(tokens.accessToken);
      const refreshDecoded = jwtService.verifyRefreshToken(tokens.refreshToken);
      
      expect(accessDecoded.sub).toBe('user-123');
      expect(refreshDecoded.sub).toBe('user-123');
    });

    test('should generate and hash secure tokens', () => {
      const token = jwtService.generateSecureToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      
      const hash = jwtService.hashToken(token);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 = 64 hex chars
    });
  });

  describe('Password Service', () => {
    test('should hash and verify passwords', async () => {
      const password = 'testPassword123';
      const hash = await passwordService.hash(password);
      
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      
      const isValid = await passwordService.compare(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await passwordService.compare('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    test('should validate password requirements', () => {
      // Valid passwords
      expect(passwordService.validate('password123').valid).toBe(true);
      expect(passwordService.validate('MyPass1').valid).toBe(true);
      
      // Invalid passwords
      expect(passwordService.validate('').valid).toBe(false);
      expect(passwordService.validate('short').valid).toBe(false);
      expect(passwordService.validate('onlyletters').valid).toBe(false);
      expect(passwordService.validate('12345678').valid).toBe(false);
      
      // Check error messages
      const result = passwordService.validate('abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters long');
      expect(result.errors).toContain('Password must contain at least one letter and one number');
    });

    test('should generate random passwords', () => {
      const password = passwordService.generateRandom();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(12);
      expect(passwordService.validate(password).valid).toBe(true);
      
      const longPassword = passwordService.generateRandom(20);
      expect(longPassword.length).toBe(20);
    });
  });

  describe('Rate Limiting Service', () => {
    // Mock request object
    const mockRequest = {
      ip: '127.0.0.1',
      body: { email: 'test@example.com' }
    } as any;

    beforeEach(() => {
      // Clear rate limit store before each test
      (loginRateLimit as any).store = {};
      (generalAuthRateLimit as any).store = {};
    });

    test('should allow requests within limits', () => {
      const result = loginRateLimit.isRateLimited(mockRequest, 'ip');
      expect(result.limited).toBe(false);
    });

    test('should record failed attempts', () => {
      loginRateLimit.recordFailedAttempt(mockRequest, 'ip');
      const remaining = loginRateLimit.getRemainingAttempts(mockRequest, 'ip');
      expect(remaining).toBe(4); // Started with 5, now 4
    });

    test('should lock account after max attempts', () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        loginRateLimit.recordFailedAttempt(mockRequest, 'ip');
      }
      
      const result = loginRateLimit.isRateLimited(mockRequest, 'ip');
      expect(result.limited).toBe(true);
      expect(result.resetTime).toBeDefined();
    });

    test('should clear attempts on successful action', () => {
      loginRateLimit.recordFailedAttempt(mockRequest, 'ip');
      loginRateLimit.recordFailedAttempt(mockRequest, 'ip');
      expect(loginRateLimit.getRemainingAttempts(mockRequest, 'ip')).toBe(3);
      
      loginRateLimit.clearAttempts(mockRequest, 'ip');
      expect(loginRateLimit.getRemainingAttempts(mockRequest, 'ip')).toBe(5);
    });

    test('should handle email-based rate limiting', () => {
      loginRateLimit.recordFailedAttempt(mockRequest, 'email');
      const remaining = loginRateLimit.getRemainingAttempts(mockRequest, 'email');
      expect(remaining).toBe(4);
    });
  });

  // Note: Database-dependent tests would require test database setup
  // These are examples of tests that would be run in a full test suite
  describe('User Service (Integration Tests)', () => {
    // These tests would require a test database
    test.skip('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };
      
      const user = await userService.createUser(userData);
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    test.skip('should authenticate valid user', async () => {
      // First create user
      const userData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };
      
      await userService.createUser(userData);
      
      // Then authenticate
      const result = await userService.authenticateUser(userData);
      expect(result.user.email).toBe(userData.email.toLowerCase());
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test.skip('should fail authentication with invalid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };
      
      await expect(userService.authenticateUser(userData))
        .rejects.toThrow('Invalid credentials');
    });

    test.skip('should refresh tokens successfully', async () => {
      // Create and authenticate user
      const userData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };
      
      await userService.createUser(userData);
      const authResult = await userService.authenticateUser(userData);
      
      // Refresh tokens
      const refreshResult = await userService.refreshUserTokens(authResult.tokens.refreshToken);
      expect(refreshResult.accessToken).toBeDefined();
      
      // Verify new access token works
      const decoded = jwtService.verifyAccessToken(refreshResult.accessToken);
      expect(decoded.email).toBe(userData.email.toLowerCase());
    });

    test.skip('should invalidate tokens on logout', async () => {
      // Create and authenticate user
      const userData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };
      
      const user = await userService.createUser(userData);
      const authResult = await userService.authenticateUser(userData);
      
      // Logout (invalidate tokens)
      await userService.invalidateAllTokens(user.id);
      
      // Try to refresh with old token (should fail)
      await expect(userService.refreshUserTokens(authResult.tokens.refreshToken))
        .rejects.toThrow('Invalid refresh token');
    });

    test.skip('should handle password reset flow', async () => {
      // Create user
      const userData = {
        email: 'test@example.com',
        password: 'testPassword123'
      };
      
      const user = await userService.createUser(userData);
      
      // Request password reset
      const resetToken = await userService.createPasswordResetToken(userData.email);
      expect(typeof resetToken).toBe('string');
      expect(resetToken.length).toBeGreaterThan(0);
      
      // Reset password
      const newPassword = 'newPassword456';
      await userService.resetPassword(resetToken, newPassword);
      
      // Try to login with new password
      const authResult = await userService.authenticateUser({
        email: userData.email,
        password: newPassword
      });
      expect(authResult.user.email).toBe(userData.email.toLowerCase());
      
      // Old password should not work
      await expect(userService.authenticateUser({
        email: userData.email,
        password: userData.password
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JWT tokens gracefully', () => {
      expect(() => jwtService.verifyAccessToken('')).toThrow();
      expect(() => jwtService.verifyAccessToken('not.a.jwt')).toThrow();
      expect(() => jwtService.verifyAccessToken('not-a-jwt-at-all')).toThrow();
    });

    test('should validate email formats', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user space@domain.com'
      ];

      invalidEmails.forEach(email => {
        expect(() => {
          const schema = require('zod').z.string().email();
          schema.parse(email);
        }).toThrow();
      });
    });
  });

  describe('Security Features', () => {
    test('should use different tokens for access and refresh', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 0);
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
      
      // Access token should not be verifiable as refresh token
      expect(() => jwtService.verifyRefreshToken(tokens.accessToken)).toThrow();
      expect(() => jwtService.verifyAccessToken(tokens.refreshToken)).toThrow();
    });

    test('should generate unique secure tokens', () => {
      const token1 = jwtService.generateSecureToken();
      const token2 = jwtService.generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    test('should create consistent hashes', () => {
      const token = 'test-token';
      const hash1 = jwtService.hashToken(token);
      const hash2 = jwtService.hashToken(token);
      expect(hash1).toBe(hash2);
    });
  });
});

// Export for potential use in other test files
export const authTestUtils = {
  createMockRequest: (ip: string = '127.0.0.1', email?: string) => ({
    ip,
    body: email ? { email } : {},
    headers: { 'x-correlation-id': 'test-correlation-id' }
  }),
  
  createValidUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'testPassword123'
  })
};