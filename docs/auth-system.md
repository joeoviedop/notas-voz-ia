# Authentication System Documentation

## Overview

This system implements a robust JWT-based authentication with RS256 signatures, secure refresh tokens via httpOnly cookies, and comprehensive rate limiting with account lockout functionality.

## Architecture

### Components

1. **JWT Service** (`src/services/jwt.ts`)
   - RS256 token generation and verification
   - Separate access (15m) and refresh (7d) tokens
   - Secure token generation for password resets

2. **Password Service** (`src/services/password.ts`)
   - bcrypt hashing (12 salt rounds)
   - Password strength validation
   - Secure random password generation

3. **User Service** (`src/services/user.ts`)
   - User creation and authentication
   - Token refresh and invalidation
   - Password reset flows
   - Audit event logging

4. **Rate Limiting Service** (`src/services/rateLimit.ts`)
   - IP and email-based rate limiting
   - Account lockout after failed attempts
   - Configurable limits and durations

5. **Email Service** (`src/services/email.ts`)
   - Password reset email templates
   - Development console logging
   - Production SMTP support

6. **Authentication Middleware** (`src/middleware/auth.ts`)
   - `requireAuth` - Protects routes requiring authentication
   - `optionalAuth` - Extracts user if token provided
   - User context attachment to requests

## API Endpoints

### Authentication Routes (`/auth`)

#### `POST /auth/register`
Creates a new user account with optional auto-login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "tokens": {
    "accessToken": "eyJ..."
  }
}
```

#### `POST /auth/login`
Authenticates user and returns tokens.

**Request:**
```json
{
  "email": "user@example.com", 
  "password": "password123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ..."
}
```

**Rate Limiting:** 5 attempts per email, 5-minute lockout

#### `POST /auth/refresh`
Generates new access token using refresh cookie.

**Response (200):**
```json
{
  "accessToken": "eyJ..."
}
```

#### `POST /auth/logout`
Invalidates refresh tokens and clears cookies.

**Response:** 204 No Content

#### `POST /auth/reset/request`
Requests password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, we have sent a password reset link"
}
```

#### `POST /auth/reset/confirm`
Resets password using token from email.

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

## Security Features

### JWT Implementation
- **Algorithm:** RS256 (RSA Signature with SHA-256)
- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- **Issuer/Audience:** Validated on verification
- **Token Version:** Enables global token invalidation

### Refresh Token Security
- **Storage:** httpOnly, SameSite=Lax cookies
- **Name:** `__Host-refresh` (secure prefix)
- **Rotation:** Token version increment invalidates all tokens
- **Cross-Device:** Logout invalidates across all devices

### Rate Limiting
- **General Auth:** 20 requests/minute per IP
- **Login Attempts:** 5 attempts per email/IP, 5-minute lockout
- **Progressive Headers:** X-RateLimit-Limit, X-RateLimit-Remaining
- **Cleanup:** Automatic cleanup of old entries

### Password Security
- **Hashing:** bcrypt with 12 salt rounds
- **Validation:** Minimum 6 chars, letters + numbers
- **Reset Tokens:** 64-byte secure random, SHA-256 hashed
- **Reset Expiry:** 1 hour from generation

### Error Handling
- **Generic Messages:** Prevents user enumeration
- **Structured Errors:** Consistent error code format
- **Audit Logging:** Security events tracked
- **Correlation IDs:** Request tracking for debugging

## Environment Variables

```env
# JWT RS256 Keys (PEM format)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Token Configuration
REFRESH_COOKIE_NAME=__Host-refresh
REFRESH_TTL_DAYS=7
ACCESS_TTL_MIN=15

# Cookie Security
COOKIE_SECRET=your-cookie-secret-change-in-production

# Auth Behavior
AUTO_LOGIN_AFTER_REGISTER=true
FRONTEND_URL=http://localhost:3000

# Email (Development)
EMAIL_PROVIDER=mock

# Email (Production)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

## Usage Examples

### Protected Route Usage
```typescript
import { requireAuth, getUserId } from '../middleware/auth.js';

export const protectedRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply to all routes in this plugin
  fastify.addHook('preHandler', requireAuth);
  
  fastify.get('/profile', async (request, reply) => {
    const userId = getUserId(request); // Guaranteed to exist
    // ... fetch user profile
  });
};
```

### Optional Authentication
```typescript
import { optionalAuth, getUser } from '../middleware/auth.js';

fastify.get('/public-data', { preHandler: optionalAuth }, async (request, reply) => {
  const user = getUser(request); // May be undefined
  
  if (user) {
    // Return personalized data
  } else {
    // Return public data
  }
});
```

### Frontend Integration
```typescript
// Using generated SDK
import { client } from './api-client';

// Login
const response = await client.loginUser({
  email: 'user@example.com',
  password: 'password123'
});

// Access token automatically stored by SDK
localStorage.setItem('accessToken', response.accessToken);

// Refresh token in httpOnly cookie, handled automatically
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  token_version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Password Resets Table
```sql
CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Audit Events Table
```sql
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT,
  metadata JSON,
  ip_address TEXT,
  user_agent TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Testing

### Unit Tests
- JWT token generation/verification
- Password hashing/validation
- Rate limiting logic
- Error handling scenarios

### Integration Tests (require test database)
- User registration flow
- Login/logout flow
- Token refresh flow
- Password reset flow
- Rate limiting behavior

### Security Tests
- Token tampering attempts
- Brute force protection
- CORS and cookie security
- SQL injection prevention

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm test -- --coverage
```

## Monitoring and Observability

### Audit Events
- `user_registered` - New user created
- `user_login` - Successful login
- `user_login_failed` - Failed login attempt
- `user_logout` - User logout
- `password_reset_requested` - Password reset requested
- `password_reset_completed` - Password successfully reset

### Metrics to Monitor
- Failed login attempts per minute
- Token refresh failures
- Password reset requests
- Account lockouts
- API response times

### Health Checks
```
GET /health/detailed
```

Returns status of:
- Database connectivity
- JWT service functionality
- Email service status
- Overall system health

## Production Deployment

### Key Rotation
1. Generate new RSA key pair
2. Update `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`
3. Deploy with rolling restart
4. Old tokens will fail verification (users re-login)

### Security Checklist
- [ ] Use strong RSA keys (2048+ bits)
- [ ] Set secure cookie secret
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS for secure cookies
- [ ] Set up proper SMTP for emails
- [ ] Monitor rate limiting metrics
- [ ] Set up alerts for security events
- [ ] Regular security updates
- [ ] Database backup strategy

### Performance Considerations
- JWT verification is CPU-intensive (consider caching)
- Rate limiting uses in-memory store (consider Redis for multiple instances)
- Database indexing on user email and audit events
- Connection pooling for database
- CDN for static assets

## Troubleshooting

### Common Issues

**"Invalid or expired token"**
- Check JWT key configuration
- Verify token not tampered
- Check system clock synchronization

**"Too many attempts"**
- Rate limiting triggered
- Check IP-based vs email-based limits
- Clear rate limit store if needed

**"Refresh token not found"**
- Cookie not set/sent
- Check CORS credentials
- Verify cookie security settings

**"Email not sent"**
- Check SMTP configuration
- Verify email provider settings
- Check development vs production mode

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging of:
- JWT operations
- Database queries
- Rate limiting decisions
- Email sending attempts

## Future Enhancements

### Planned Features
- [ ] Multi-factor authentication (TOTP)
- [ ] OAuth2 provider integration
- [ ] Session management dashboard
- [ ] Advanced rate limiting (Redis-based)
- [ ] Token blacklisting
- [ ] Device tracking
- [ ] Suspicious activity alerts

### Scalability Improvements
- [ ] Redis for distributed rate limiting
- [ ] JWT caching layer
- [ ] Async audit logging
- [ ] Database read replicas
- [ ] Microservice decomposition