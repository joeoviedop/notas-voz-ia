import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Health check básico
  fastify.get('/', async (request, reply) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    
    return {
      status: 'ok',
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      correlationId: request.headers['x-correlation-id'],
    };
  });

  // Health check detallado
  fastify.get('/detailed', async (request, reply) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    const memoryUsage = process.memoryUsage();
    
    // Simular checks de servicios externos
    const externalServices = {
      database: { status: 'ok', responseTime: '12ms' },
      storage: { status: 'ok', responseTime: '8ms' },
      sttProvider: { status: 'mock', responseTime: '1ms' },
      llmProvider: { status: 'mock', responseTime: '1ms' },
    };

    return {
      status: 'ok',
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      services: externalServices,
      correlationId: request.headers['x-correlation-id'],
    };
  });

};