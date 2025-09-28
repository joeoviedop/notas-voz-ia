import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storage.service.js';
import { getQueueService } from '../services/queue.service.js';
import { sttProvider } from '../services/stt/index.js';
import { llmProvider } from '../services/llm/index.js';

const prisma = new PrismaClient();
const queueService = getQueueService();

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Basic health check
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

  // Detailed health check
  fastify.get('/detailed', async (request, reply) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    const memoryUsage = process.memoryUsage();
    const startTime = Date.now();
    
    // Check database connection
    let databaseHealth;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;
      databaseHealth = { 
        status: 'ok', 
        responseTime: `${dbResponseTime}ms`,
        provider: 'postgresql'
      };
    } catch (error) {
      databaseHealth = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'postgresql'
      };
    }

    // Check storage connection
    let storageHealth;
    try {
      const storageStart = Date.now();
      // Try to check if a test key exists (non-destructive)
      await storageService.fileExists('health-check-test');
      const storageResponseTime = Date.now() - storageStart;
      storageHealth = { 
        status: 'ok', 
        responseTime: `${storageResponseTime}ms`,
        provider: 's3-compatible'
      };
    } catch (error) {
      storageHealth = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 's3-compatible'
      };
    }

    // Check queue system
    let queueHealth;
    try {
      const queueHealthCheck = await queueService.healthCheck();
      queueHealth = {
        status: queueHealthCheck.status,
        responseTime: queueHealthCheck.responseTime ? `${queueHealthCheck.responseTime}ms` : undefined,
        provider: 'redis'
      };
    } catch (error) {
      queueHealth = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'redis'
      };
    }

    // Get queue statistics
    let queueStats;
    try {
      const [transcribeStats, summarizeStats] = await Promise.all([
        queueService.getQueueStats('transcribe'),
        queueService.getQueueStats('summarize')
      ]);
      queueStats = {
        transcribe: transcribeStats,
        summarize: summarizeStats
      };
    } catch (error) {
      queueStats = { error: 'Failed to get queue statistics' };
    }

    // Check AI providers
    const aiProviders = {
      stt: {
        name: sttProvider.name,
        status: 'available',
        supportedFormats: sttProvider.getSupportedFormats(),
        maxFileSize: `${Math.round(sttProvider.getMaxFileSize() / 1024 / 1024)}MB`
      },
      llm: {
        name: llmProvider.name,
        status: 'available',
        supportedModels: llmProvider.getSupportedModels(),
        maxTokens: llmProvider.getMaxTokens()
      }
    };

    const totalResponseTime = Date.now() - startTime;
    const overallStatus = (
      databaseHealth.status === 'ok' && 
      storageHealth.status === 'ok' && 
      queueHealth.status === 'ok'
    ) ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${totalResponseTime}ms`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      services: {
        database: databaseHealth,
        storage: storageHealth,
        queues: queueHealth
      },
      aiProviders,
      queueStats,
      correlationId: request.headers['x-correlation-id'],
    };
  });

  // Readiness probe (for Kubernetes)
  fastify.get('/ready', async (request, reply) => {
    try {
      // Quick database check
      await prisma.$queryRaw`SELECT 1`;
      
      // Quick queue check
      const queueHealthCheck = await queueService.healthCheck();
      if (queueHealthCheck.status !== 'ok') {
        throw new Error('Queue not ready');
      }
      
      return { status: 'ready' };
    } catch (error) {
      return reply.status(503).send({ 
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Liveness probe (for Kubernetes)
  fastify.get('/live', async (request, reply) => {
    // Simple liveness check - just return OK if the process is running
    return { status: 'alive' };
  });

};