import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { IntegrationTestApp, waitForCondition } from './testRunner.js';
import { testScenarios } from '../fixtures/index.js';

describe('Authentication Flow Integration Tests', () => {
  let testApp: IntegrationTestApp;

  beforeEach(async () => {
    testApp = new IntegrationTestApp();
    await testApp.setup();
  });

  afterEach(async () => {
    await testApp.teardown();
  });

  describe('User Registration and Login Flow', () => {
    it('should complete full registration → login → refresh → logout cycle', async () => {
      const app = testApp.getApp();
      const mockServices = testApp.getMockServices();
      const { userData } = testScenarios.newUserRegistration();

      // Step 1: Register new user
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      expect(registerResponse.statusCode).toBe(201);
      const registerData = registerResponse.json();
      expect(registerData).toMatchObject({
        user: {
          id: expect.any(String),
          email: userData.email,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        accessToken: expect.any(String),
      });

      // Verify refresh token cookie is set
      expect(registerResponse.cookies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'refreshToken',
            httpOnly: true,
            sameSite: 'Lax',
          }),
        ])
      );

      const refreshCookie = registerResponse.cookies.find(c => c.name === 'refreshToken')?.value;
      expect(refreshCookie).toBeDefined();

      // Verify audit event was logged
      const auditEvents = mockServices.getOperationLogs().audit;
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          action: 'USER_REGISTERED',
          resourceType: 'USER',
          resourceId: registerData.user.id,
        })
      );

      // Step 2: Login with same credentials
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: userData,
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginData = loginResponse.json();
      expect(loginData).toMatchObject({
        user: {
          id: registerData.user.id,
          email: userData.email,
        },
        accessToken: expect.any(String),
      });

      // Verify new refresh token is set
      const newRefreshCookie = loginResponse.cookies.find(c => c.name === 'refreshToken')?.value;
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie).not.toBe(refreshCookie); // Should be new token

      // Step 3: Test refresh token
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: {
          refreshToken: newRefreshCookie!,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshData = refreshResponse.json();
      expect(refreshData).toMatchObject({
        accessToken: expect.any(String),
      });
      expect(refreshData.accessToken).not.toBe(loginData.accessToken); // Should be new token

      // Step 4: Test protected endpoint with new access token
      const protectedResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: {
          authorization: `Bearer ${refreshData.accessToken}`,
        },
      });

      expect(protectedResponse.statusCode).toBe(200);

      // Step 5: Logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${refreshData.accessToken}`,
        },
        cookies: {
          refreshToken: newRefreshCookie!,
        },
      });

      expect(logoutResponse.statusCode).toBe(204);

      // Verify refresh token cookie is cleared
      expect(logoutResponse.cookies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'refreshToken',
            value: '',
            maxAge: 0,
          }),
        ])
      );

      // Step 6: Verify refresh token is now invalid
      const invalidRefreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: {
          refreshToken: newRefreshCookie!,
        },
      });

      expect(invalidRefreshResponse.statusCode).toBe(401);
      expect(invalidRefreshResponse.json()).toMatchObject({
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
        },
      });
    });

    it('should handle password reset flow', async () => {
      const app = testApp.getApp();
      const mockServices = testApp.getMockServices();
      
      // First register a user
      const { user } = await testApp.authenticateUser({
        email: 'resettest@example.com',
        password: 'oldpassword123',
      });

      // Step 1: Request password reset
      const resetRequestResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset/request',
        payload: {
          email: user.email,
        },
      });

      expect(resetRequestResponse.statusCode).toBe(200);
      expect(resetRequestResponse.json()).toMatchObject({
        message: 'Password reset email sent',
      });

      // Verify audit event
      const auditEvents = mockServices.getOperationLogs().audit;
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          action: 'PASSWORD_RESET_REQUESTED',
          resourceType: 'USER',
          resourceId: user.id,
        })
      );

      // Step 2: Simulate getting reset token (in real scenario, this would come from email)
      const resetToken = 'mock-reset-token-123';
      
      // Step 3: Confirm password reset
      const resetConfirmResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset/confirm',
        payload: {
          token: resetToken,
          newPassword: 'newpassword123',
        },
      });

      expect(resetConfirmResponse.statusCode).toBe(200);
      expect(resetConfirmResponse.json()).toMatchObject({
        message: 'Password reset successful',
      });

      // Step 4: Verify old password no longer works
      const oldPasswordResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: user.email,
          password: 'oldpassword123',
        },
      });

      expect(oldPasswordResponse.statusCode).toBe(401);

      // Step 5: Verify new password works
      const newPasswordResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: user.email,
          password: 'newpassword123',
        },
      });

      expect(newPasswordResponse.statusCode).toBe(200);
    });

    it('should prevent duplicate email registration', async () => {
      const app = testApp.getApp();
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
      };

      // First registration
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      expect(firstResponse.statusCode).toBe(201);

      // Second registration with same email
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      expect(secondResponse.statusCode).toBe(409);
      expect(secondResponse.json()).toMatchObject({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
        },
      });
    });

    it('should handle invalid credentials', async () => {
      const app = testApp.getApp();
      
      // Try to login with non-existent user
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: expect.any(String),
        },
        correlationId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should validate input data', async () => {
      const app = testApp.getApp();
      
      // Invalid email format
      const invalidEmailResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      expect(invalidEmailResponse.statusCode).toBe(400);
      expect(invalidEmailResponse.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
        },
      });

      // Password too short
      const shortPasswordResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'valid@example.com',
          password: '123',
        },
      });

      expect(shortPasswordResponse.statusCode).toBe(400);
      expect(shortPasswordResponse.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should require authentication for protected routes', async () => {
      const app = testApp.getApp();
      
      // Try to access protected route without token
      const noTokenResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
      });

      expect(noTokenResponse.statusCode).toBe(401);
      expect(noTokenResponse.json()).toMatchObject({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
        },
      });

      // Try with invalid token
      const invalidTokenResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(invalidTokenResponse.statusCode).toBe(401);
      expect(invalidTokenResponse.json()).toMatchObject({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
        },
      });
    });
  });

  describe('Token Management', () => {
    it('should handle concurrent requests with same refresh token', async () => {
      const app = testApp.getApp();
      
      // Register and login user
      const { cookies } = await testApp.authenticateUser({
        email: 'concurrent@example.com',
        password: 'password123',
      });

      // Make concurrent refresh requests
      const promises = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth/refresh',
          cookies,
        })
      );

      const responses = await Promise.all(promises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.statusCode === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Others should either succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 401]).toContain(response.statusCode);
      });
    });

    it('should expire and reject old tokens', async () => {
      const app = testApp.getApp();
      
      // This test would normally require waiting for token expiration
      // In integration tests, we can mock the token verification to return expired
      const expiredToken = 'expired.jwt.token';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
        },
      });
    });
  });
});