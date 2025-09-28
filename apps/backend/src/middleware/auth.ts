import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../services/jwt.js';
import { db } from '../services/database.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }
}

/**
 * Middleware that requires authentication
 * Throws 401 if no valid token is provided
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);

    // Verify user still exists
    const user = await db.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'User not found',
        },
      });
    }

    // Attach user to request
    request.user = {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    return reply.status(401).send({
      error: {
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Invalid or expired token',
      },
    });
  }
}

/**
 * Middleware that optionally extracts user info if token is provided
 * Does not throw if no token is provided - just continues without user
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user
      return;
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);

    // Verify user still exists
    const user = await db.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (user) {
      // Attach user to request
      request.user = {
        id: user.id,
        email: user.email,
      };
    }
  } catch (error) {
    // Invalid token, but we don't throw - just continue without user
    // This allows the request to proceed but user will be undefined
  }
}

/**
 * Helper to extract user ID from request (for use in route handlers)
 */
export function getUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new Error('User not authenticated');
  }
  return request.user.id;
}

/**
 * Helper to get user from request (returns undefined if not authenticated)
 */
export function getUser(request: FastifyRequest): { id: string; email: string } | undefined {
  return request.user;
}