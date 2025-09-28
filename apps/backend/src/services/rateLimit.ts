import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitStore {
  [key: string]: {
    attempts: number;
    lockedUntil?: number;
    lastAttempt: number;
  };
}

export class RateLimitService {
  private store: RateLimitStore = {};
  private readonly maxAttempts: number;
  private readonly lockDuration: number; // in minutes
  private readonly cleanupInterval: number = 60 * 60 * 1000; // 1 hour

  constructor(maxAttempts: number = 5, lockDuration: number = 5) {
    this.maxAttempts = maxAttempts;
    this.lockDuration = lockDuration * 60 * 1000; // convert to milliseconds

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Get rate limit key from request
   */
  private getKey(request: FastifyRequest, keyType: 'ip' | 'email' = 'ip'): string {
    if (keyType === 'email') {
      const body = request.body as any;
      return body?.email || request.ip;
    }
    return request.ip;
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(request: FastifyRequest, keyType: 'ip' | 'email' = 'ip'): {
    limited: boolean;
    remaining?: number;
    resetTime?: number;
  } {
    const key = this.getKey(request, keyType);
    const now = Date.now();
    const entry = this.store[key];

    if (!entry) {
      return { limited: false };
    }

    // Check if account is locked
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return {
        limited: true,
        resetTime: entry.lockedUntil,
      };
    }

    // Reset if lock has expired
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      delete this.store[key];
      return { limited: false };
    }

    // Check if within rate limit
    const remaining = this.maxAttempts - entry.attempts;
    if (remaining <= 0) {
      // Lock account
      entry.lockedUntil = now + this.lockDuration;
      return {
        limited: true,
        resetTime: entry.lockedUntil,
      };
    }

    return {
      limited: false,
      remaining,
    };
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(request: FastifyRequest, keyType: 'ip' | 'email' = 'ip'): void {
    const key = this.getKey(request, keyType);
    const now = Date.now();

    if (!this.store[key]) {
      this.store[key] = {
        attempts: 1,
        lastAttempt: now,
      };
    } else {
      this.store[key].attempts += 1;
      this.store[key].lastAttempt = now;
    }
  }

  /**
   * Clear attempts for successful login
   */
  clearAttempts(request: FastifyRequest, keyType: 'ip' | 'email' = 'ip'): void {
    const key = this.getKey(request, keyType);
    delete this.store[key];
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(request: FastifyRequest, keyType: 'ip' | 'email' = 'ip'): number {
    const key = this.getKey(request, keyType);
    const entry = this.store[key];
    
    if (!entry) return this.maxAttempts;
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) return 0;
    
    return Math.max(0, this.maxAttempts - entry.attempts);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      
      // Remove entries that are old and not locked
      if (!entry.lockedUntil && entry.lastAttempt < cutoff) {
        delete this.store[key];
      }
      
      // Remove entries where lock has expired
      if (entry.lockedUntil && now >= entry.lockedUntil) {
        delete this.store[key];
      }
    });
  }
}

// Create instances for different types of rate limiting
export const loginRateLimit = new RateLimitService(5, 5); // 5 attempts, 5 min lockout
export const generalAuthRateLimit = new RateLimitService(20, 1); // 20 attempts, 1 min lockout

/**
 * Middleware factory for auth rate limiting
 */
export function authRateLimit(
  rateLimiter: RateLimitService,
  keyType: 'ip' | 'email' = 'ip'
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const limitResult = rateLimiter.isRateLimited(request, keyType);

    if (limitResult.limited) {
      const remainingTime = limitResult.resetTime 
        ? Math.ceil((limitResult.resetTime - Date.now()) / 1000) 
        : 0;

      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many attempts. Try again in ${Math.ceil(remainingTime / 60)} minutes.`,
        },
        retryAfter: remainingTime,
      });
    }

    // Set rate limit headers
    const remaining = rateLimiter.getRemainingAttempts(request, keyType);
    reply.header('X-RateLimit-Limit', rateLimiter['maxAttempts']);
    reply.header('X-RateLimit-Remaining', remaining);
  };
}