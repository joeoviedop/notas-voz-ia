import { FastifyPluginAsync } from 'fastify';
import { 
  LoginRequestSchema, 
  RegisterRequestSchema,
  ResetRequestSchema,
  ResetConfirmRequestSchema,
  TokenResponseSchema,
  AuthResponseSchema
} from '@notas-voz/schemas';
import { validateBody, handleApiError } from '../middleware/validation.middleware.js';
import { authService } from '../services/auth.service.js';
import { nanoid } from 'nanoid';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Register user
  fastify.post('/register', {
    preHandler: validateBody(RegisterRequestSchema)
  }, async (request, reply) => {
    try {
      const registerData = request.validatedBody;
      const authResponse = await authService.register(registerData);
      
      // Generate refresh token
      const user = {
        id: authResponse.user.id,
        email: authResponse.user.email,
        createdAt: new Date(authResponse.user.createdAt),
        updatedAt: new Date(),
        password: '' // Not needed for token generation
      };
      
      const refreshToken = authService.generateRefreshToken(user);
      
      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
      
      return reply.status(201).send(authResponse);
    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Login user
  fastify.post('/login', {
    preHandler: validateBody(LoginRequestSchema)
  }, async (request, reply) => {
    try {
      const loginData = request.validatedBody;
      const loginResult = await authService.login(loginData);
      
      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', loginResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
      
      return reply.status(200).send({
        accessToken: loginResult.accessToken
      });
    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Refresh access token
  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      if (!refreshToken) {
        throw new Error('AUTH_TOKEN_EXPIRED');
      }
      
      const tokenResponse = await authService.refreshToken(refreshToken);
      
      return reply.status(200).send(tokenResponse);
    } catch (error) {
      // Clear invalid refresh token cookie
      reply.clearCookie('refreshToken', {
        path: '/'
      });
      return handleApiError(error, request, reply);
    }
  });

  // Logout user
  fastify.post('/logout', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      await authService.logout(refreshToken);
      
      // Clear refresh token cookie
      reply.clearCookie('refreshToken', {
        path: '/'
      });
      
      return reply.status(204).send();
    } catch (error) {
      // Still clear the cookie even if logout fails
      reply.clearCookie('refreshToken', {
        path: '/'
      });
      return reply.status(204).send();
    }
  });

  // Request password reset
  fastify.post('/reset/request', {
    preHandler: validateBody(ResetRequestSchema)
  }, async (request, reply) => {
    try {
      const resetData = request.validatedBody;
      await authService.requestPasswordReset(resetData);
      
      return reply.status(200).send({
        message: 'Reset email sent'
      });
    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Confirm password reset
  fastify.post('/reset/confirm', {
    preHandler: validateBody(ResetConfirmRequestSchema)
  }, async (request, reply) => {
    try {
      const confirmData = request.validatedBody;
      await authService.confirmPasswordReset(confirmData);
      
      return reply.status(200).send({
        message: 'Password updated'
      });
    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

};