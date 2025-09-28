import { FastifyInstance } from 'fastify';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { mockUser, mockJwtPayload } from '../setup.js';

// Mock HTTP multipart file
export const createMockFile = (options: {
  filename?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
} = {}) => {
  const {
    filename = 'test-audio.mp3',
    mimetype = 'audio/mpeg',
    size = 1024,
    buffer = Buffer.from('mock audio data'),
  } = options;

  return {
    filename,
    mimetype,
    file: {
      pipe: jest.fn(),
      on: jest.fn(),
      resume: jest.fn(),
    },
    fields: {},
    fieldname: 'audio',
    encoding: '7bit',
    buffer,
    size,
    toBuffer: jest.fn().mockResolvedValue(buffer),
  };
};

// Generate test JWT tokens
export const createTestTokens = (payload = mockJwtPayload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!);
  const refreshPayload = { ...payload, type: 'refresh' };
  const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET!);
  
  return { accessToken, refreshToken };
};

// Create authorization header
export const createAuthHeader = (token?: string) => {
  if (!token) {
    const { accessToken } = createTestTokens();
    token = accessToken;
  }
  return { authorization: `Bearer ${token}` };
};

// Test route injection helper
export const injectWithAuth = async (
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    url: string;
    payload?: any;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    user?: typeof mockUser;
  }
) => {
  const { method, url, payload, headers = {}, query, user = mockUser } = options;
  
  // Create auth token for the user
  const testPayload = {
    userId: user.id,
    email: user.email,
    type: 'access' as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };
  
  const authHeaders = createAuthHeader(createTestTokens(testPayload).accessToken);
  
  return app.inject({
    method,
    url,
    payload,
    headers: {
      ...authHeaders,
      ...headers,
    },
    query,
  });
};

// Mock database transaction helper
export const mockTransaction = (operations: any[]) => {
  return Promise.resolve(operations[operations.length - 1]);
};

// Create mock Fastify app for testing
export const createTestApp = async (): Promise<FastifyInstance> => {
  const { default: Fastify } = await import('fastify');
  const app = Fastify({
    logger: false, // Disable logging in tests
  });
  
  // Register test-specific plugins
  await app.register(import('@fastify/jwt'), {
    secret: {
      private: process.env.JWT_ACCESS_SECRET!,
      public: process.env.JWT_ACCESS_SECRET!,
    },
  });
  
  await app.register(import('@fastify/cookie'));
  
  return app;
};

// Assert error response format
export const expectErrorResponse = (response: any, expectedCode: string, statusCode = 400) => {
  expect(response.statusCode).toBe(statusCode);
  expect(response.json()).toMatchObject({
    error: {
      code: expectedCode,
      message: expect.any(String),
    },
    correlationId: expect.any(String),
    timestamp: expect.any(String),
  });
};

// Assert success response format
export const expectSuccessResponse = (response: any, expectedData?: any, statusCode = 200) => {
  expect(response.statusCode).toBe(statusCode);
  const data = response.json();
  
  if (expectedData) {
    expect(data).toMatchObject(expectedData);
  }
  
  return data;
};

// Mock file buffer for audio uploads
export const createAudioBuffer = (sizeInBytes = 1024): Buffer => {
  return Buffer.alloc(sizeInBytes, 0);
};

// Mock CORS headers
export const mockCorsHeaders = {
  'access-control-allow-origin': 'http://localhost:3000',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,x-correlation-id',
  'access-control-allow-credentials': 'true',
};

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Redis operations
export const createMockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  ping: jest.fn().mockResolvedValue('PONG'),
  disconnect: jest.fn().mockResolvedValue(undefined),
});

// Mock queue operations
export const createMockQueue = () => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id', data: {} }),
  getJobs: jest.fn().mockResolvedValue([]),
  clean: jest.fn().mockResolvedValue([]),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
});

// Mock worker operations
export const createMockWorker = () => ({
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
});

// Test data factories
export const createTestUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});

export const createTestNote = (overrides = {}) => ({
  id: 'test-note-id',
  userId: 'test-user-id',
  title: 'Test Note',
  status: 'idle' as const,
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestMedia = (overrides = {}) => ({
  id: 'test-media-id',
  noteId: 'test-note-id',
  filename: 'test-audio.mp3',
  originalName: 'test-audio.mp3',
  mimetype: 'audio/mpeg',
  size: 1024,
  storageKey: 'uploads/test-media-id.mp3',
  createdAt: new Date(),
  ...overrides,
});

export const createTestTranscript = (overrides = {}) => ({
  id: 'test-transcript-id',
  noteId: 'test-note-id',
  text: 'Test transcription text',
  language: 'en',
  confidence: 0.95,
  provider: 'mock',
  createdAt: new Date(),
  ...overrides,
});

export const createTestSummary = (overrides = {}) => ({
  id: 'test-summary-id',
  noteId: 'test-note-id',
  tldr: 'Test summary',
  bullets: ['Bullet 1', 'Bullet 2'],
  provider: 'mock',
  createdAt: new Date(),
  ...overrides,
});

export const createTestAction = (overrides = {}) => ({
  id: 'test-action-id',
  noteId: 'test-note-id',
  text: 'Test action item',
  done: false,
  dueSuggested: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});