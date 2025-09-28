import { FastifyInstance } from 'fastify';
import { jest } from '@jest/globals';

/**
 * Integration test runner that sets up a complete test environment
 * with real database transactions and mocked external services
 */

// Mock database with transaction support
export class MockDatabase {
  private data: Record<string, any[]> = {
    users: [],
    notes: [],
    media: [],
    transcripts: [],
    summaries: [],
    actions: [],
    refreshTokens: [],
    passwordResetTokens: [],
    auditEvents: [],
  };

  private transactionData: Record<string, any[]> = {};
  private inTransaction = false;

  // Transaction methods
  async $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    this.inTransaction = true;
    this.transactionData = { ...this.data };
    
    try {
      const result = await callback(this.createTransactionClient());
      // Commit transaction
      this.data = { ...this.transactionData };
      return result;
    } catch (error) {
      // Rollback transaction
      this.transactionData = {};
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  private createTransactionClient() {
    const client: any = {};
    
    Object.keys(this.data).forEach(table => {
      const tableName = table.slice(0, -1); // Remove 's' from plural
      client[tableName] = this.createTableClient(table);
    });

    client.$transaction = this.$transaction.bind(this);
    return client;
  }

  private createTableClient(tableName: string) {
    const dataSource = this.inTransaction ? this.transactionData : this.data;
    
    return {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const records = dataSource[tableName] || [];
        const key = Object.keys(where)[0];
        const value = where[key];
        return Promise.resolve(records.find(record => record[key] === value) || null);
      }),

      findMany: jest.fn().mockImplementation((options = {}) => {
        let records = [...(dataSource[tableName] || [])];
        
        if (options.where) {
          Object.entries(options.where).forEach(([key, value]) => {
            records = records.filter(record => {
              if (typeof value === 'object' && value !== null) {
                // Handle complex queries like { contains: 'text' }
                if ('contains' in value) {
                  return record[key]?.toLowerCase().includes((value as any).contains.toLowerCase());
                }
                if ('in' in value) {
                  return (value as any).in.includes(record[key]);
                }
              }
              return record[key] === value;
            });
          });
        }

        if (options.orderBy) {
          const orderKey = Object.keys(options.orderBy)[0];
          const orderDir = options.orderBy[orderKey];
          records.sort((a, b) => {
            const aVal = a[orderKey];
            const bVal = b[orderKey];
            if (orderDir === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }

        if (options.take) {
          records = records.slice(0, options.take);
        }

        if (options.skip) {
          records = records.slice(options.skip);
        }

        return Promise.resolve(records);
      }),

      create: jest.fn().mockImplementation(({ data }) => {
        const record = {
          id: `mock-${tableName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        
        if (!dataSource[tableName]) {
          dataSource[tableName] = [];
        }
        dataSource[tableName].push(record);
        return Promise.resolve(record);
      }),

      update: jest.fn().mockImplementation(({ where, data }) => {
        const records = dataSource[tableName] || [];
        const key = Object.keys(where)[0];
        const value = where[key];
        const recordIndex = records.findIndex(record => record[key] === value);
        
        if (recordIndex === -1) {
          throw new Error(`Record not found`);
        }
        
        const updatedRecord = {
          ...records[recordIndex],
          ...data,
          updatedAt: new Date(),
        };
        
        records[recordIndex] = updatedRecord;
        return Promise.resolve(updatedRecord);
      }),

      delete: jest.fn().mockImplementation(({ where }) => {
        const records = dataSource[tableName] || [];
        const key = Object.keys(where)[0];
        const value = where[key];
        const recordIndex = records.findIndex(record => record[key] === value);
        
        if (recordIndex === -1) {
          throw new Error(`Record not found`);
        }
        
        const deletedRecord = records[recordIndex];
        records.splice(recordIndex, 1);
        return Promise.resolve(deletedRecord);
      }),

      deleteMany: jest.fn().mockImplementation(({ where }) => {
        const records = dataSource[tableName] || [];
        let deletedCount = 0;
        
        if (where) {
          Object.entries(where).forEach(([key, value]) => {
            for (let i = records.length - 1; i >= 0; i--) {
              if (records[i][key] === value) {
                records.splice(i, 1);
                deletedCount++;
              }
            }
          });
        }
        
        return Promise.resolve({ count: deletedCount });
      }),

      count: jest.fn().mockImplementation(({ where = {} }) => {
        let records = dataSource[tableName] || [];
        
        Object.entries(where).forEach(([key, value]) => {
          records = records.filter(record => record[key] === value);
        });
        
        return Promise.resolve(records.length);
      }),
    };
  }

  // Utility methods for tests
  seed(tableName: string, data: any[]) {
    this.data[tableName] = [...data];
  }

  clear(tableName?: string) {
    if (tableName) {
      this.data[tableName] = [];
    } else {
      Object.keys(this.data).forEach(key => {
        this.data[key] = [];
      });
    }
  }

  getData(tableName: string) {
    return [...(this.data[tableName] || [])];
  }

  // Connect to the global mock
  getClient() {
    return this.createTransactionClient();
  }
}

// Mock services for integration tests
export class MockServices {
  private mockDb = new MockDatabase();
  
  // Storage service that tracks operations
  storageOperations: Array<{ operation: string; key?: string; success: boolean }> = [];
  
  mockStorageService = {
    uploadFile: jest.fn().mockImplementation(async (buffer, filename, mimetype) => {
      const key = `uploads/test-${Date.now()}.${filename.split('.').pop()}`;
      this.storageOperations.push({ operation: 'upload', key, success: true });
      return {
        key,
        size: buffer.length,
        etag: '"mock-etag"',
        url: `https://test-bucket.s3.amazonaws.com/${key}`,
      };
    }),

    downloadFile: jest.fn().mockImplementation(async (key) => {
      this.storageOperations.push({ operation: 'download', key, success: true });
      return {
        buffer: Buffer.from('mock file content'),
        contentType: 'audio/mpeg',
        contentLength: 1024,
      };
    }),

    deleteFile: jest.fn().mockImplementation(async (key) => {
      this.storageOperations.push({ operation: 'delete', key, success: true });
      return true;
    }),

    fileExists: jest.fn().mockResolvedValue(true),
    getFileInfo: jest.fn().mockResolvedValue({
      size: 1024,
      contentType: 'audio/mpeg',
      lastModified: new Date(),
    }),
    getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.test/file'),
    validateFileType: jest.fn().mockReturnValue(true),
    validateFileSize: jest.fn().mockReturnValue(true),
  };

  // Queue service that tracks jobs
  queueJobs: Array<{ name: string; data: any; status: 'pending' | 'completed' | 'failed' }> = [];

  mockQueueService = {
    addJob: jest.fn().mockImplementation(async (queueName, data) => {
      const job = {
        id: `job-${Date.now()}`,
        name: queueName,
        data,
        status: 'pending' as const,
        createdAt: new Date(),
      };
      this.queueJobs.push(job);
      return job;
    }),

    getJobs: jest.fn().mockImplementation(async () => {
      return this.queueJobs;
    }),
  };

  // AI providers that simulate real processing
  mockSTTProvider = {
    transcribe: jest.fn().mockImplementation(async (buffer, filename) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        text: `Mock transcription for ${filename}. This is a simulated transcription of the uploaded audio file.`,
        language: 'en',
        confidence: 0.95,
      };
    }),
  };

  mockLLMProvider = {
    summarize: jest.fn().mockImplementation(async (text) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        summary: {
          tldr: 'This is a mock summary of the transcribed text.',
          bullets: [
            'First key point from the transcript',
            'Second important insight',
            'Third notable observation',
          ],
        },
        actions: [
          {
            text: 'Follow up on the discussed topic',
            due_suggested: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            text: 'Review the key decisions made',
            due_suggested: null,
          },
        ],
      };
    }),
  };

  // Audit service
  auditEvents: Array<{ userId: string; action: string; resourceType: string; resourceId: string }> = [];

  mockAuditService = {
    logEvent: jest.fn().mockImplementation(async (event) => {
      this.auditEvents.push(event);
      return event;
    }),
  };

  getMockDatabase() {
    return this.mockDb;
  }

  clearAll() {
    this.mockDb.clear();
    this.storageOperations = [];
    this.queueJobs = [];
    this.auditEvents = [];
    jest.clearAllMocks();
  }

  getOperationLogs() {
    return {
      storage: this.storageOperations,
      queue: this.queueJobs,
      audit: this.auditEvents,
    };
  }
}

// Integration test application factory
export class IntegrationTestApp {
  private app?: FastifyInstance;
  private mockServices: MockServices;

  constructor() {
    this.mockServices = new MockServices();
  }

  async setup(): Promise<FastifyInstance> {
    const { default: Fastify } = await import('fastify');
    
    this.app = Fastify({
      logger: false, // Disable logging in tests
    });

    // Register plugins
    await this.app.register(import('@fastify/jwt'), {
      secret: {
        private: process.env.JWT_ACCESS_SECRET!,
        public: process.env.JWT_ACCESS_SECRET!,
      },
    });

    await this.app.register(import('@fastify/cookie'));
    await this.app.register(import('@fastify/multipart'));
    
    // Mock the services before registering routes
    this.setupMocks();

    // Register all routes
    await this.app.register(import('../../src/routes/health.js'), { prefix: '/api/v1' });
    await this.app.register(import('../../src/routes/auth.js'), { prefix: '/api/v1' });
    await this.app.register(import('../../src/routes/notes.js'), { prefix: '/api/v1' });
    await this.app.register(import('../../src/routes/actions.js'), { prefix: '/api/v1' });
    await this.app.register(import('../../src/routes/admin.js'), { prefix: '/api/v1' });

    return this.app;
  }

  private setupMocks() {
    // Override the service imports with our mocks
    const mockDb = this.mockServices.getMockDatabase();
    
    jest.doMock('../../src/services/db.js', () => ({
      db: mockDb.getClient(),
    }));

    jest.doMock('../../src/services/storage.js', () => ({
      storageService: this.mockServices.mockStorageService,
    }));

    jest.doMock('../../src/services/queue.js', () => ({
      queueService: this.mockServices.mockQueueService,
    }));

    jest.doMock('../../src/services/audit.js', () => ({
      auditService: this.mockServices.mockAuditService,
    }));

    jest.doMock('../../src/providers/stt/index.js', () => ({
      createSTTProvider: () => this.mockServices.mockSTTProvider,
    }));

    jest.doMock('../../src/providers/llm/index.js', () => ({
      createLLMProvider: () => this.mockServices.mockLLMProvider,
    }));
  }

  async teardown() {
    if (this.app) {
      await this.app.close();
    }
    this.mockServices.clearAll();
  }

  getApp(): FastifyInstance {
    if (!this.app) {
      throw new Error('App not initialized. Call setup() first.');
    }
    return this.app;
  }

  getMockServices(): MockServices {
    return this.mockServices;
  }

  // Helper methods for common operations
  async authenticateUser(userData: any) {
    // Register user
    const registerResponse = await this.app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: userData.email,
        password: userData.password,
      },
    });

    if (registerResponse.statusCode !== 201) {
      throw new Error(`Failed to register user: ${registerResponse.body}`);
    }

    const { user, accessToken } = registerResponse.json();
    const cookies = this.extractCookies(registerResponse.cookies);

    return {
      user,
      accessToken,
      cookies,
      authHeaders: {
        authorization: `Bearer ${accessToken}`,
      },
    };
  }

  async createAuthenticatedRequest(userData: any) {
    const auth = await this.authenticateUser(userData);
    return {
      headers: auth.authHeaders,
      cookies: auth.cookies,
      user: auth.user,
    };
  }

  private extractCookies(cookies: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    cookies.forEach(cookie => {
      result[cookie.name] = cookie.value;
    });
    return result;
  }

  // Simulate async processing completion
  async simulateTranscriptionComplete(noteId: string) {
    const mockDb = this.mockServices.getMockDatabase();
    
    // Find the note
    const notes = mockDb.getData('notes');
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      throw new Error(`Note ${noteId} not found`);
    }

    // Create transcript
    const transcript = {
      id: `transcript-${noteId}`,
      noteId,
      text: await this.mockServices.mockSTTProvider.transcribe(Buffer.from('mock'), 'test.mp3'),
      createdAt: new Date(),
    };

    mockDb.seed('transcripts', [...mockDb.getData('transcripts'), transcript]);

    // Update note status
    note.status = 'transcribing_done';
    mockDb.seed('notes', notes);

    return transcript;
  }

  async simulateSummarizationComplete(noteId: string) {
    const mockDb = this.mockServices.getMockDatabase();
    
    // Find transcript
    const transcripts = mockDb.getData('transcripts');
    const transcript = transcripts.find(t => t.noteId === noteId);
    if (!transcript) {
      throw new Error(`Transcript for note ${noteId} not found`);
    }

    // Create summary and actions
    const llmResult = await this.mockServices.mockLLMProvider.summarize(transcript.text);
    
    const summary = {
      id: `summary-${noteId}`,
      noteId,
      ...llmResult.summary,
      createdAt: new Date(),
    };

    const actions = llmResult.actions.map((action: any, index: number) => ({
      id: `action-${noteId}-${index}`,
      noteId,
      ...action,
      done: false,
      createdAt: new Date(),
    }));

    mockDb.seed('summaries', [...mockDb.getData('summaries'), summary]);
    mockDb.seed('actions', [...mockDb.getData('actions'), ...actions]);

    // Update note status
    const notes = mockDb.getData('notes');
    const note = notes.find(n => n.id === noteId);
    if (note) {
      note.status = 'ready';
      mockDb.seed('notes', notes);
    }

    return { summary, actions };
  }
}

// Utility function to wait for conditions
export const waitForCondition = async (
  conditionFn: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};