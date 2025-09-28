import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/notas_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
process.env.STORAGE_BUCKET = 'test-bucket';
process.env.STORAGE_ACCESS_KEY = 'testkey';
process.env.STORAGE_SECRET_KEY = 'testsecret';
process.env.STT_PROVIDER = 'mock';
process.env.LLM_PROVIDER = 'mock';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ASSEMBLYAI_API_KEY = 'test-assemblyai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies that should not be called in tests
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    emit: jest.fn(),
  };
  
  return {
    default: jest.fn(() => mockRedis),
  };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJobs: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ 
      $metadata: { httpStatusCode: 200 },
      ETag: '"mock-etag"',
    }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com/file'),
}));

jest.mock('openai', () => ({
  default: jest.fn(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'Mock transcription from OpenAI Whisper',
        }),
      },
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                summary: {
                  tldr: 'Mock TL;DR from OpenAI GPT',
                  bullets: ['Mock bullet point 1', 'Mock bullet point 2'],
                },
                actions: [
                  {
                    text: 'Mock action item',
                    due_suggested: '2024-01-15',
                  }
                ],
              }),
            },
          }],
        }),
      },
    },
  })),
}));

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          text: JSON.stringify({
            summary: {
              tldr: 'Mock TL;DR from Anthropic Claude',
              bullets: ['Mock bullet point 1', 'Mock bullet point 2'],
            },
            actions: [
              {
                text: 'Mock action item from Claude',
                due_suggested: '2024-01-15',
              }
            ],
          }),
        }],
      }),
    },
  })),
}));

jest.mock('assemblyai', () => ({
  AssemblyAI: jest.fn(() => ({
    transcripts: {
      transcribe: jest.fn().mockResolvedValue({
        id: 'mock-transcript-id',
        text: 'Mock transcription from AssemblyAI',
        status: 'completed',
        confidence: 0.95,
      }),
    },
  })),
}));

// Mock nodemailer for password reset emails
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
      accepted: ['test@example.com'],
    }),
  })),
}));

// Mock prisma client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    note: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    media: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transcript: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    summary: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    action: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export common test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: '$2b$10$mockhashedpassword',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockNote = {
  id: 'test-note-id',
  userId: 'test-user-id',
  title: 'Test Note',
  status: 'idle' as const,
  tags: ['test', 'mock'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockJwtPayload = {
  userId: 'test-user-id',
  email: 'test@example.com',
  type: 'access' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};

export const mockRefreshToken = {
  id: 'test-refresh-token-id',
  userId: 'test-user-id',
  token: 'mock-refresh-token-hash',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  createdAt: new Date('2024-01-01T00:00:00Z'),
};