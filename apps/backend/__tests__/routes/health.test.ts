import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestApp, expectSuccessResponse } from '../utils/testHelpers.js';

// Mock services
const mockDb = {
  $queryRaw: jest.fn(),
};

const mockRedis = {
  ping: jest.fn(),
};

const mockStorageService = {
  fileExists: jest.fn(),
};

const mockQueue = {
  getJobs: jest.fn(),
};

const mockSTTProvider = {
  transcribe: jest.fn(),
};

const mockLLMProvider = {
  summarize: jest.fn(),
};

jest.mock('../../src/services/db.js', () => ({
  db: mockDb,
}));

jest.mock('../../src/services/storage.js', () => ({
  storageService: mockStorageService,
}));

describe('Health Routes', () => {
  let app: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
    
    // Register health routes
    await app.register(import('../../src/routes/health.js'));
    
    // Setup default healthy mocks
    mockDb.$queryRaw.mockResolvedValue([{ now: new Date() }]);
    mockRedis.ping.mockResolvedValue('PONG');
    mockStorageService.fileExists.mockResolvedValue(true);
    mockQueue.getJobs.mockResolvedValue([]);
    mockSTTProvider.transcribe.mockResolvedValue({ text: 'test', language: 'en', confidence: 0.9 });
    mockLLMProvider.summarize.mockResolvedValue({ summary: 'test summary' });
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are working', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expectSuccessResponse(response, {
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        services: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          redis: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          storage: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          queues: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          ai_providers: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
        },
      });

      expect(mockDb.$queryRaw).toHaveBeenCalled();
      expect(mockRedis.ping).toHaveBeenCalled();
      expect(mockStorageService.fileExists).toHaveBeenCalled();
    });

    it('should return degraded status when some services are failing', async () => {
      // Make Redis fail
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expectSuccessResponse(response, {
        status: 'degraded',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        services: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          redis: {
            status: 'unhealthy',
            error: 'Redis connection failed',
            responseTime: expect.any(Number),
          },
          storage: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          queues: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          ai_providers: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
        },
      });
    });

    it('should return unhealthy status when critical services are failing', async () => {
      // Make database fail
      mockDb.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(503);
      
      const data = response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when system is ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expectSuccessResponse(response, {
        status: 'ready',
        timestamp: expect.any(String),
        services: expect.any(Object),
      });
    });

    it('should return 503 when system is not ready', async () => {
      // Make database fail (critical for readiness)
      mockDb.$queryRaw.mockRejectedValue(new Error('Database not ready'));

      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        status: 'not_ready',
        timestamp: expect.any(String),
        services: expect.any(Object),
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when application is alive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expectSuccessResponse(response, {
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          free: expect.any(Number),
        },
        cpu: {
          usage: expect.any(Number),
        },
      });
    });

    it('should always return 200 for liveness probe', async () => {
      // Even if other services fail, the app should be considered alive
      mockDb.$queryRaw.mockRejectedValue(new Error('DB down'));
      mockRedis.ping.mockRejectedValue(new Error('Redis down'));

      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      // Liveness should still pass because the app process is running
      expectSuccessResponse(response, {
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        cpu: expect.any(Object),
      });
    });
  });

  describe('Performance and reliability', () => {
    it('should complete health check within reasonable time', async () => {
      const startTime = Date.now();
      
      await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Health check should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/health',
        })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.statusCode).toBeLessThan(400);
        expect(response.json().timestamp).toBeDefined();
      });
    });

    it('should not expose sensitive information in health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const data = response.json();
      
      // Should not contain sensitive data
      expect(JSON.stringify(data)).not.toMatch(/password|secret|key|token/i);
      expect(data.services).toBeDefined();
      expect(data.services.database).not.toHaveProperty('connectionString');
    });
  });
});