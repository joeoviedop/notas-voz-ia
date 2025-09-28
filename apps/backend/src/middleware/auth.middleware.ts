import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { ApiError } from '@notas-voz/schemas';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}

/**
 * Authentication middleware
 * Extracts JWT token from Authorization header and validates it
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token is required',
        }
      } as ApiError);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token is required',
        }
      } as ApiError);
    }

    // Validate token and get user
    const user = await authService.validateAccessToken(token);
    
    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Invalid or expired access token',
        }
      } as ApiError);
    }

    // Attach user to request
    request.user = user;

  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : error,
      correlationId: request.headers['x-correlation-id']
    }, 'Authentication middleware error');

    return reply.status(401).send({
      error: {
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Authentication failed',
      }
    } as ApiError);
  }
}

/**
 * Optional authentication middleware
 * Like authMiddleware but doesn't fail if no token provided
 */
export async function optionalAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return;
    }

    // Validate token and get user
    const user = await authService.validateAccessToken(token);
    
    if (user) {
      request.user = user;
    }

  } catch (error) {
    // Log error but don't fail the request
    request.log.warn({
      error: error instanceof Error ? error.message : error,
      correlationId: request.headers['x-correlation-id']
    }, 'Optional authentication failed');
  }
}

/**
 * Role-based authorization middleware factory
 * Note: This is prepared for future role-based features
 */
export function requireRole(roles: string[]) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication required',
        }
      } as ApiError);
    }

    // In the future, check user roles here
    // For now, all authenticated users have access
    
    return;
  };
}

/**
 * Rate limiting based on user ID
 */
export function userRateLimit(maxRequests: number, windowMs: number) {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

  return async function(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.id;
    
    if (!userId) {
      return; // Skip rate limiting for non-authenticated requests
    }

    const now = Date.now();
    const userKey = userId;
    const userData = userRequestCounts.get(userKey);

    if (!userData || now > userData.resetTime) {
      // Reset counter
      userRequestCounts.set(userKey, {
        count: 1,
        resetTime: now + windowMs
      });
      return;
    }

    if (userData.count >= maxRequests) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Try again in ${Math.ceil((userData.resetTime - now) / 1000)} seconds.`,
        }
      } as ApiError);
    }

    userData.count++;
    userRequestCounts.set(userKey, userData);
  };
}

/**
 * Extract user ID from request (with validation)
 */
export function getUserId(request: FastifyRequest): string {
  if (!request.user?.id) {
    throw new Error('User not authenticated');
  }
  return request.user.id;
}

/**
 * Check if user owns resource
 */
export function checkResourceOwnership(resourceUserId: string, request: FastifyRequest): boolean {
  const currentUserId = request.user?.id;
  return currentUserId === resourceUserId;
}

/**
 * Middleware to ensure user can only access their own resources
 */
export async function requireResourceOwnership(
  getResourceUserId: (request: FastifyRequest) => Promise<string | null>
) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication required',
        }
      } as ApiError);
    }

    const resourceUserId = await getResourceUserId(request);
    
    if (!resourceUserId) {
      return reply.status(404).send({
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Resource not found',
        }
      } as ApiError);
    }

    if (!checkResourceOwnership(resourceUserId, request)) {
      return reply.status(403).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Access denied',
        }
      } as ApiError);
    }
  };
}