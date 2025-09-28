import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';

import { healthRoutes } from './routes/health.js';
import { notesRoutes } from './routes/notes.js';
import { authRoutes } from './routes/auth.js';
import { actionsRoutes } from './routes/actions.js';
import { adminRoutes } from './routes/admin.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Security plugins
await fastify.register(helmet, {
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
});

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      /\.vercel\.app$/,
    ];

await fastify.register(cors, {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Rate limiting
const rateWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
const maxRequests = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || 
  (process.env.NODE_ENV === 'development' ? '1000' : '100')
);

await fastify.register(rateLimit, {
  max: maxRequests,
  timeWindow: rateWindowMs,
  errorResponseBuilder: (request, context) => {
    return {
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Limit: ${context.max} requests per ${Math.round(context.timeWindow / 1000)} seconds.`
      }
    };
  }
});

// Multipart file upload support
await fastify.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 1,
    fieldSize: 1024 * 1024, // 1MB
  }
});

// Cookie support for refresh tokens
await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'default-cookie-secret-change-in-production',
});

// API Routes with /api/v1 prefix
const apiPrefix = '/api/v1';
await fastify.register(healthRoutes, { prefix: `${apiPrefix}/health` });
await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
await fastify.register(notesRoutes, { prefix: `${apiPrefix}/notes` });
await fastify.register(actionsRoutes, { prefix: `${apiPrefix}/actions` });
await fastify.register(adminRoutes, { prefix: `${apiPrefix}/admin` });

// Middleware de correlation ID
fastify.addHook('onRequest', async (request, reply) => {
  const correlationId = request.headers['x-correlation-id'] || 
                       `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  request.headers['x-correlation-id'] = correlationId;
  reply.header('x-correlation-id', correlationId);
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  const correlationId = request.headers['x-correlation-id'];
  
  fastify.log.error(
    {
      error: error.message,
      stack: error.stack,
      correlationId,
      url: request.url,
      method: request.method,
    },
    'Request error'
  );

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  reply.status(statusCode).send({
    error: {
      code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message,
    },
    correlationId,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(
      `🚀 Server started on http://${host}:${port}`
    );
    
    fastify.log.info('Available routes:');
    fastify.log.info(`  GET ${apiPrefix}/health - Health check`);
    fastify.log.info(`  GET ${apiPrefix}/health/detailed - Detailed health check`);
    fastify.log.info(`  GET ${apiPrefix}/health/ready - Readiness probe`);
    fastify.log.info(`  GET ${apiPrefix}/health/live - Liveness probe`);
    fastify.log.info(`  ${apiPrefix}/auth/* - Authentication endpoints`);
    fastify.log.info(`  ${apiPrefix}/notes/* - Notes management`);
    fastify.log.info(`  ${apiPrefix}/actions/* - Actions management`);
    fastify.log.info(`  ${apiPrefix}/admin/* - Admin endpoints`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
