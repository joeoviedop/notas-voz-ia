import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import type { User } from '@prisma/client';
import type { 
  LoginRequest, 
  RegisterRequest, 
  ResetRequest, 
  ResetConfirmRequest,
  AuthResponse,
  TokenResponse 
} from '@notas-voz/schemas';

const prisma = new PrismaClient();

// JWT RS256 Key Generation (use proper keys in production)
const generateKeyPair = () => {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
};

// In production, store these securely in environment variables or key management service
const keys = process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY 
  ? {
      privateKey: process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
    }
  : generateKeyPair();

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  jti: string; // JWT ID for refresh token tracking
}

export class AuthService {
  
  /**
   * Generate access token (15 minutes)
   */
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: nanoid()
    };

    return this.signJWT(payload);
  }

  /**
   * Generate refresh token (7 days)
   */
  generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      jti: nanoid()
    };

    return this.signJWT(payload);
  }

  /**
   * Sign JWT with RS256
   */
  private signJWT(payload: JWTPayload): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), {
      key: keys.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    }).toString('base64url');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Verify and decode JWT
   */
  verifyJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const signatureInput = `${header}.${payload}`;
      
      // Verify signature
      const isValid = crypto.verify(
        'RSA-SHA256', 
        Buffer.from(signatureInput), 
        {
          key: keys.publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING
        },
        Buffer.from(signature, 'base64url')
      );

      if (!isValid) return null;

      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // Check expiration
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decodedPayload as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('AUTH_USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
      }
    });

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        type: 'user_created',
        userId: user.id,
        correlationId: nanoid(),
      }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken
      }
    };
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        type: 'user_login',
        userId: user.id,
        correlationId: nanoid(),
      }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const payload = this.verifyJWT(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      throw new Error('AUTH_TOKEN_EXPIRED');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      throw new Error('AUTH_TOKEN_EXPIRED');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(user);

    return { accessToken };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: ResetRequest): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      }
    });

    // TODO: Send email with reset link
    // For now, just log it (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Password reset token for ${data.email}: ${token}`);
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: ResetConfirmRequest): Promise<void> {
    const resetEntry = await prisma.passwordReset.findUnique({
      where: { token: data.token },
      include: { user: true }
    });

    if (!resetEntry || resetEntry.usedAt || resetEntry.expiresAt < new Date()) {
      throw new Error('RESET_TOKEN_INVALID');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);

    // Update password and mark reset token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetEntry.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordReset.update({
        where: { id: resetEntry.id },
        data: { usedAt: new Date() }
      })
    ]);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * Validate access token and return user
   */
  async validateAccessToken(token: string): Promise<User | null> {
    const payload = this.verifyJWT(token);
    
    if (!payload || payload.type !== 'access') {
      return null;
    }

    return this.getUserById(payload.userId);
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const payload = this.verifyJWT(refreshToken);
      if (payload) {
        await prisma.auditEvent.create({
          data: {
            type: 'user_logout',
            userId: payload.userId,
            correlationId: nanoid(),
          }
        });
      }
    }
    
    // In a production system, you might maintain a blacklist of JTIs
    // or use a more sophisticated token invalidation strategy
  }

  /**
   * Get public key for token verification by other services
   */
  getPublicKey(): string {
    return keys.publicKey;
  }
}

// Export singleton instance
export const authService = new AuthService();