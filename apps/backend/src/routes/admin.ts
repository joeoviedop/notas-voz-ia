import { FastifyPluginAsync } from 'fastify';
import { getQueueService } from '../services/queue.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const queueService = getQueueService();

export const adminRoutes: FastifyPluginAsync = async (fastify) => {

  // Get queue statistics
  fastify.get('/queues', {
    preHandler: [authMiddleware] // In production, add admin role check
  }, async (request, reply) => {
    try {
      const [transcribeStats, summarizeStats] = await Promise.all([
        queueService.getQueueStats('transcribe'),
        queueService.getQueueStats('summarize')
      ]);

      return reply.status(200).send({
        transcribe: transcribeStats,
        summarize: summarizeStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get queue statistics'
        }
      });
    }
  });

  // Get specific queue statistics
  fastify.get('/queues/:queueName', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { queueName } = request.params as { queueName: string };

      if (!['transcribe', 'summarize'].includes(queueName)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid queue name. Must be transcribe or summarize.'
          }
        });
      }

      const stats = await queueService.getQueueStats(queueName as 'transcribe' | 'summarize');

      return reply.status(200).send({
        queue: queueName,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get queue statistics'
        }
      });
    }
  });

  // Pause a queue
  fastify.post('/queues/:queueName/pause', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { queueName } = request.params as { queueName: string };

      if (!['transcribe', 'summarize'].includes(queueName)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid queue name. Must be transcribe or summarize.'
          }
        });
      }

      await queueService.pauseQueue(queueName as 'transcribe' | 'summarize');

      return reply.status(200).send({
        message: `Queue ${queueName} paused successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to pause queue'
        }
      });
    }
  });

  // Resume a queue
  fastify.post('/queues/:queueName/resume', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { queueName } = request.params as { queueName: string };

      if (!['transcribe', 'summarize'].includes(queueName)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid queue name. Must be transcribe or summarize.'
          }
        });
      }

      await queueService.resumeQueue(queueName as 'transcribe' | 'summarize');

      return reply.status(200).send({
        message: `Queue ${queueName} resumed successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resume queue'
        }
      });
    }
  });

  // Clean old jobs
  fastify.post('/queues/:queueName/clean', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      const { queueName } = request.params as { queueName: string };

      if (!['transcribe', 'summarize'].includes(queueName)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid queue name. Must be transcribe or summarize.'
          }
        });
      }

      await queueService.cleanOldJobs(queueName as 'transcribe' | 'summarize');

      return reply.status(200).send({
        message: `Old jobs in queue ${queueName} cleaned successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clean queue'
        }
      });
    }
  });

};