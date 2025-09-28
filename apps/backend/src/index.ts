import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { healthRoutes } from './routes/health.js';
import { notesRoutes } from './routes/notes.js';
import { authRoutes } from './routes/auth.js';

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

// Plugins de seguridad
await fastify.register(helmet, {
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
});

await fastify.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    /\.vercel\.app$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

await fastify.register(rateLimit, {
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  timeWindow: '1 minute',
});

// Plugin para multipart (archivos)
await fastify.register(multipart);

// Rutas
await fastify.register(healthRoutes, { prefix: '/health' });
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(notesRoutes, { prefix: '/notes' });

// Middleware de correlation ID
fastify.addHook('onRequest', async (request, reply) => {
  const correlationId = request.headers['x-correlation-id'] || 
                       `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  request.headers['x-correlation-id'] = correlationId;
  reply.header('x-correlation-id', correlationId);
});

// Error handler global
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
  const message = statusCode === 500 ? 'Error interno del servidor' : error.message;

  reply.status(statusCode).send({
    error: message,
    correlationId,
    timestamp: new Date().toISOString(),
  });
});

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(
      `🚀 Servidor iniciado en http://${host}:${port}`
    );
    
    fastify.log.info('Rutas disponibles:');
    fastify.log.info('  GET /health - Health check');
    fastify.log.info('  POST /auth/login - Login (mock)');
    fastify.log.info('  POST /notes - Crear nota (mock)');
    fastify.log.info('  GET /notes - Listar notas (mock)');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();