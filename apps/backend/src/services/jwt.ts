import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export class JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessTtlMinutes: number;
  private readonly refreshTtlDays: number;

  constructor() {
    this.privateKey = this.loadPrivateKey();
    this.publicKey = this.loadPublicKey();
    this.accessTtlMinutes = parseInt(process.env.ACCESS_TTL_MIN || '15', 10);
    this.refreshTtlDays = parseInt(process.env.REFRESH_TTL_DAYS || '7', 10);
  }

  private loadPrivateKey(): string {
    const key = process.env.JWT_PRIVATE_KEY;
    if (!key) {
      throw new Error('JWT_PRIVATE_KEY environment variable is required');
    }
    return key.replace(/\\n/g, '\n');
  }

  private loadPublicKey(): string {
    const key = process.env.JWT_PUBLIC_KEY;
    if (!key) {
      throw new Error('JWT_PUBLIC_KEY environment variable is required');
    }
    return key.replace(/\\n/g, '\n');
  }

  /**
   * Generate an access token
   */
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: `${this.accessTtlMinutes}m`,
      issuer: 'notas-voz-api',
      audience: 'notas-voz-app',
    });
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: `${this.refreshTtlDays}d`,
      issuer: 'notas-voz-api',
      audience: 'notas-voz-app',
    });
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'notas-voz-api',
        audience: 'notas-voz-app',
      }) as AccessTokenPayload;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'notas-voz-api',
        audience: 'notas-voz-app',
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(userId: string, email: string, tokenVersion: number): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.generateAccessToken({
      sub: userId,
      email,
    });

    const refreshToken = this.generateRefreshToken({
      sub: userId,
      tokenVersion,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate a secure random token (for password reset)
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token (for storing password reset tokens)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// Singleton instance
export const jwtService = new JwtService();