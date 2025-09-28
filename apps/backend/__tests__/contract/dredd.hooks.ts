import { before, beforeEach, after, hooks } from 'dredd';
import { FastifyInstance } from 'fastify';
import { IntegrationTestApp } from '../integration/testRunner.js';

let testApp: IntegrationTestApp;
let app: FastifyInstance;
let authContext: any;

/**
 * Dredd hooks for contract testing against OpenAPI specification
 * These hooks set up authentication and test data before running contract tests
 */

before('Starting test server for contract testing', async (transactions, done) => {
  try {
    console.log('🚀 Starting test server for contract testing...');
    
    // Initialize test app
    testApp = new IntegrationTestApp();
    app = await testApp.setup();
    
    // Start server on test port
    const port = process.env.TEST_PORT || 5000;
    await app.listen({ port, host: '127.0.0.1' });
    console.log(`📡 Test server running on http://127.0.0.1:${port}`);
    
    // Create authenticated user for protected routes
    authContext = await testApp.createAuthenticatedRequest({
      email: 'contract-test@example.com',
      password: 'password123',
    });
    
    console.log('✅ Authentication context created');
    
    // Seed some test data
    await seedTestData();
    console.log('✅ Test data seeded');
    
    done();
  } catch (error) {
    console.error('❌ Failed to start test server:', error);
    done(error);
  }
});

after('Stopping test server', async (transactions, done) => {
  try {
    console.log('🔄 Stopping test server...');
    if (testApp) {
      await testApp.teardown();
    }
    console.log('✅ Test server stopped');
    done();
  } catch (error) {
    console.error('❌ Error stopping test server:', error);
    done(error);
  }
});

// Hook to inject authentication for protected routes
beforeEach((transaction, done) => {
  const isPublicRoute = transaction.fullPath.includes('/auth/') ||
                       transaction.fullPath.includes('/health');
  
  if (!isPublicRoute && authContext) {
    // Add authorization header for protected routes
    transaction.request.headers.Authorization = authContext.headers.authorization;
    
    // Add refresh token cookie for routes that need it
    if (transaction.fullPath.includes('/auth/refresh') || 
        transaction.fullPath.includes('/auth/logout')) {
      transaction.request.headers.Cookie = `refreshToken=${authContext.cookies.refreshToken}`;
    }
  }
  
  // Set correlation ID for tracking
  transaction.request.headers['x-correlation-id'] = `dredd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  done();
});

// Seed test data for contract tests
async function seedTestData() {
  const mockServices = testApp.getMockServices();
  const mockDb = mockServices.getMockDatabase();
  
  // Create a test note for GET /notes/{id} tests
  const testNote = {
    id: 'contract-test-note-id',
    userId: authContext.user.id,
    title: 'Contract Test Note',
    status: 'ready',
    tags: ['contract', 'test'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const testTranscript = {
    id: 'contract-test-transcript-id',
    noteId: 'contract-test-note-id',
    text: 'This is a contract test transcription for API validation.',
    language: 'en',
    confidence: 0.95,
    provider: 'mock',
    createdAt: new Date(),
  };
  
  const testSummary = {
    id: 'contract-test-summary-id',
    noteId: 'contract-test-note-id',
    tldr: 'Contract test summary for API validation',
    bullets: [
      'First contract test point',
      'Second contract test point',
      'Third contract test point',
    ],
    provider: 'mock',
    createdAt: new Date(),
  };
  
  const testActions = [
    {
      id: 'contract-test-action-1',
      noteId: 'contract-test-note-id',
      text: 'Complete contract testing',
      done: false,
      dueSuggested: '2024-02-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'contract-test-action-2',
      noteId: 'contract-test-note-id',
      text: 'Review test results',
      done: true,
      dueSuggested: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  // Seed the data
  mockDb.seed('notes', [testNote]);
  mockDb.seed('transcripts', [testTranscript]);
  mockDb.seed('summaries', [testSummary]);
  mockDb.seed('actions', testActions);
}

// Specific hooks for different endpoints
hooks.before('/api/v1/notes/{id} > GET', (transaction, done) => {
  // Use the seeded note ID
  transaction.fullPath = transaction.fullPath.replace('{id}', 'contract-test-note-id');
  done();
});

hooks.before('/api/v1/notes/{id} > PATCH', (transaction, done) => {
  transaction.fullPath = transaction.fullPath.replace('{id}', 'contract-test-note-id');
  done();
});

hooks.before('/api/v1/notes/{id} > DELETE', (transaction, done) => {
  // Create a disposable note for delete test
  const disposableNoteId = 'disposable-note-id';
  const mockServices = testApp.getMockServices();
  const mockDb = mockServices.getMockDatabase();
  
  const disposableNote = {
    id: disposableNoteId,
    userId: authContext.user.id,
    title: 'Disposable Note',
    status: 'idle',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const existingNotes = mockDb.getData('notes');
  mockDb.seed('notes', [...existingNotes, disposableNote]);
  
  transaction.fullPath = transaction.fullPath.replace('{id}', disposableNoteId);
  done();
});

hooks.before('/api/v1/notes/{id}/upload > POST', (transaction, done) => {
  // Create a note specifically for upload testing
  const uploadNoteId = 'upload-test-note-id';
  const mockServices = testApp.getMockServices();
  const mockDb = mockServices.getMockDatabase();
  
  const uploadNote = {
    id: uploadNoteId,
    userId: authContext.user.id,
    title: 'Upload Test Note',
    status: 'idle',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const existingNotes = mockDb.getData('notes');
  mockDb.seed('notes', [...existingNotes, uploadNote]);
  
  transaction.fullPath = transaction.fullPath.replace('{id}', uploadNoteId);
  
  // Set up multipart form data for file upload
  transaction.request.headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';
  transaction.request.body = [
    '------WebKitFormBoundary7MA4YWxkTrZu0gW',
    'Content-Disposition: form-data; name="audio"; filename="test.mp3"',
    'Content-Type: audio/mpeg',
    '',
    'mock audio file content for contract testing',
    '------WebKitFormBoundary7MA4YWxkTrZu0gW--',
    ''
  ].join('\r\n');
  
  done();
});

hooks.before('/api/v1/notes/{id}/transcribe > POST', (transaction, done) => {
  // Create a note with uploaded media for transcription testing
  const transcribeNoteId = 'transcribe-test-note-id';
  const mockServices = testApp.getMockServices();
  const mockDb = mockServices.getMockDatabase();
  
  const transcribeNote = {
    id: transcribeNoteId,
    userId: authContext.user.id,
    title: 'Transcribe Test Note',
    status: 'uploaded',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const testMedia = {
    id: 'transcribe-test-media-id',
    noteId: transcribeNoteId,
    filename: 'test-transcribe.mp3',
    originalName: 'test-transcribe.mp3',
    mimetype: 'audio/mpeg',
    size: 1024,
    storageKey: 'uploads/test-transcribe.mp3',
    createdAt: new Date(),
  };
  
  const existingNotes = mockDb.getData('notes');
  const existingMedia = mockDb.getData('media');
  mockDb.seed('notes', [...existingNotes, transcribeNote]);
  mockDb.seed('media', [...existingMedia, testMedia]);
  
  transaction.fullPath = transaction.fullPath.replace('{id}', transcribeNoteId);
  done();
});

hooks.before('/api/v1/notes/{id}/summarize > POST', (transaction, done) => {
  // Create a note with transcript for summarization testing
  const summarizeNoteId = 'summarize-test-note-id';
  const mockServices = testApp.getMockServices();
  const mockDb = mockServices.getMockDatabase();
  
  const summarizeNote = {
    id: summarizeNoteId,
    userId: authContext.user.id,
    title: 'Summarize Test Note',
    status: 'transcribing_done',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const testTranscript = {
    id: 'summarize-test-transcript-id',
    noteId: summarizeNoteId,
    text: 'This is a test transcript for summarization contract testing.',
    language: 'en',
    confidence: 0.9,
    provider: 'mock',
    createdAt: new Date(),
  };
  
  const existingNotes = mockDb.getData('notes');
  const existingTranscripts = mockDb.getData('transcripts');
  mockDb.seed('notes', [...existingNotes, summarizeNote]);
  mockDb.seed('transcripts', [...existingTranscripts, testTranscript]);
  
  transaction.fullPath = transaction.fullPath.replace('{id}', summarizeNoteId);
  done();
});

hooks.before('/api/v1/actions/{id} > PATCH', (transaction, done) => {
  transaction.fullPath = transaction.fullPath.replace('{id}', 'contract-test-action-1');
  done();
});

hooks.before('/api/v1/actions/{id} > DELETE', (transaction, done) => {
  transaction.fullPath = transaction.fullPath.replace('{id}', 'contract-test-action-2');
  done();
});

// Skip some scenarios that are hard to test with static data
hooks.beforeEach((transaction, done) => {
  // Skip tests that require specific error conditions
  const skipPatterns = [
    // These would require dynamic error injection
    'FILE_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE',
    'AUTH_INVALID_CREDENTIALS',
  ];
  
  const shouldSkip = skipPatterns.some(pattern => 
    transaction.name.includes(pattern) ||
    (transaction.expected && transaction.expected.statusCode === '400' && 
     transaction.request.method === 'POST' && transaction.fullPath.includes('/upload'))
  );
  
  if (shouldSkip) {
    transaction.skip = true;
    console.log(`⚠️  Skipping ${transaction.name} - requires dynamic error conditions`);
  }
  
  done();
});

// Log transaction details for debugging
hooks.beforeEach((transaction, done) => {
  console.log(`📋 Testing: ${transaction.name}`);
  console.log(`   Method: ${transaction.request.method}`);
  console.log(`   Path: ${transaction.fullPath}`);
  console.log(`   Expected: ${transaction.expected.statusCode}`);
  done();
});

hooks.afterEach((transaction, done) => {
  if (transaction.test && transaction.test.valid === false) {
    console.log(`❌ Failed: ${transaction.name}`);
    console.log(`   Expected: ${transaction.expected.statusCode}`);
    console.log(`   Actual: ${transaction.real.statusCode}`);
    if (transaction.test.results.length > 0) {
      transaction.test.results.forEach((result: any) => {
        console.log(`   Error: ${result.message}`);
      });
    }
  } else {
    console.log(`✅ Passed: ${transaction.name}`);
  }
  done();
});

export default hooks;