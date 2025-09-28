import { faker } from '@faker-js/faker';

/**
 * Test data generators for consistent and realistic test fixtures
 */

// User fixtures
export const generateUser = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  passwordHash: '$2b$10$' + faker.string.alphanumeric(53), // Mock bcrypt hash
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const generateUsers = (count: number = 5) =>
  Array.from({ length: count }, () => generateUser());

// Note fixtures
export const generateNote = (userId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  title: faker.lorem.sentence({ min: 2, max: 8 }),
  status: faker.helpers.arrayElement(['idle', 'uploading', 'uploaded', 'transcribing', 'summarizing', 'ready', 'error'] as const),
  tags: faker.helpers.arrayElements(['meeting', 'personal', 'work', 'idea', 'reminder'], { min: 0, max: 3 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const generateNotes = (count: number = 10, userId?: string) =>
  Array.from({ length: count }, () => generateNote(userId));

// Media fixtures
export const generateMedia = (noteId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  noteId: noteId || faker.string.uuid(),
  filename: `${faker.string.alphanumeric(12)}.${faker.helpers.arrayElement(['mp3', 'wav', 'm4a', 'ogg'])}`,
  originalName: faker.system.fileName({ extensionCount: 1 }),
  mimetype: faker.helpers.arrayElement(['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']),
  size: faker.number.int({ min: 1024, max: 25 * 1024 * 1024 }),
  storageKey: `uploads/${faker.string.uuid()}.${faker.helpers.arrayElement(['mp3', 'wav', 'm4a'])}`,
  createdAt: faker.date.past(),
  ...overrides,
});

// Transcript fixtures
export const generateTranscript = (noteId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  noteId: noteId || faker.string.uuid(),
  text: faker.lorem.paragraphs(3, '\n\n'),
  language: 'en',
  confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
  provider: faker.helpers.arrayElement(['openai', 'assemblyai', 'mock']),
  createdAt: faker.date.past(),
  ...overrides,
});

// Summary fixtures
export const generateSummary = (noteId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  noteId: noteId || faker.string.uuid(),
  tldr: faker.lorem.sentence({ min: 10, max: 20 }),
  bullets: Array.from({ length: faker.number.int({ min: 3, max: 7 }) }, () =>
    faker.lorem.sentence({ min: 5, max: 12 })
  ),
  provider: faker.helpers.arrayElement(['openai', 'anthropic', 'mock']),
  createdAt: faker.date.past(),
  ...overrides,
});

// Action fixtures
export const generateAction = (noteId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  noteId: noteId || faker.string.uuid(),
  text: faker.lorem.sentence({ min: 3, max: 10 }),
  done: faker.datatype.boolean(),
  dueSuggested: faker.helpers.maybe(() => faker.date.future(), { probability: 0.6 }),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const generateActions = (count: number = 5, noteId?: string) =>
  Array.from({ length: count }, () => generateAction(noteId));

// Refresh token fixtures
export const generateRefreshToken = (userId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  token: '$2b$10$' + faker.string.alphanumeric(53), // Mock hashed token
  expiresAt: faker.date.future(),
  createdAt: faker.date.past(),
  ...overrides,
});

// Password reset token fixtures
export const generatePasswordResetToken = (userId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  token: faker.string.alphanumeric(32),
  expiresAt: faker.date.future(),
  createdAt: faker.date.past(),
  ...overrides,
});

// Audit event fixtures
export const generateAuditEvent = (userId?: string, overrides: any = {}) => ({
  id: faker.string.uuid(),
  userId: userId || faker.string.uuid(),
  action: faker.helpers.arrayElement([
    'USER_REGISTERED',
    'USER_LOGGED_IN',
    'USER_LOGGED_OUT',
    'NOTE_CREATED',
    'NOTE_UPDATED',
    'NOTE_DELETED',
    'ACTION_CREATED',
    'ACTION_UPDATED',
    'ACTION_DELETED',
  ]),
  resourceType: faker.helpers.arrayElement(['USER', 'NOTE', 'ACTION']),
  resourceId: faker.string.uuid(),
  metadata: faker.helpers.maybe(() => ({
    userAgent: faker.internet.userAgent(),
    ip: faker.internet.ip(),
    additional: faker.helpers.objectValue({
      key1: faker.lorem.word(),
      key2: faker.number.int(),
    }),
  })),
  correlationId: `req-${Date.now()}-${faker.string.alphanumeric(8)}`,
  createdAt: faker.date.past(),
  ...overrides,
});

// Complete note with relations fixtures
export const generateCompleteNote = (userId?: string, overrides: any = {}) => {
  const user = generateUser({ id: userId });
  const note = generateNote(user.id);
  const media = generateMedia(note.id);
  const transcript = generateTranscript(note.id);
  const summary = generateSummary(note.id);
  const actions = generateActions(faker.number.int({ min: 2, max: 5 }), note.id);

  return {
    user,
    note: {
      ...note,
      status: 'ready' as const,
      ...overrides,
    },
    media,
    transcript,
    summary,
    actions,
  };
};

// API response fixtures
export const generateApiError = (code?: string, message?: string) => ({
  error: {
    code: code || faker.helpers.arrayElement([
      'VALIDATION_ERROR',
      'AUTH_INVALID_CREDENTIALS',
      'NOTE_NOT_FOUND',
      'FILE_TOO_LARGE',
      'UNSUPPORTED_MEDIA_TYPE',
    ]),
    message: message || faker.lorem.sentence(),
  },
  correlationId: `req-${Date.now()}-${faker.string.alphanumeric(8)}`,
  timestamp: faker.date.recent().toISOString(),
});

export const generateApiSuccess = (data: any) => ({
  ...data,
  timestamp: faker.date.recent().toISOString(),
});

// Queue job fixtures
export const generateQueueJob = (type: 'transcribe' | 'summarize', overrides: any = {}) => ({
  id: faker.string.uuid(),
  name: type,
  data: {
    noteId: faker.string.uuid(),
    mediaId: faker.string.uuid(),
    userId: faker.string.uuid(),
    ...overrides.data,
  },
  opts: {
    attempts: 3,
    backoff: 'exponential',
    delay: 0,
    ...overrides.opts,
  },
  timestamp: Date.now(),
  processedOn: faker.helpers.maybe(() => Date.now() - faker.number.int({ min: 1000, max: 60000 })),
  finishedOn: faker.helpers.maybe(() => Date.now() - faker.number.int({ min: 100, max: 10000 })),
  failedReason: faker.helpers.maybe(() => faker.lorem.sentence()),
  ...overrides,
});

// Database transaction fixtures
export const generateDbTransaction = (operations: any[]) => ({
  $transaction: jest.fn().mockResolvedValue(operations[operations.length - 1]),
});

// HTTP request fixtures
export const generateHttpRequest = (overrides: any = {}) => ({
  method: faker.helpers.arrayElement(['GET', 'POST', 'PATCH', 'DELETE']),
  url: `/api/v1/${faker.lorem.slug()}`,
  headers: {
    'user-agent': faker.internet.userAgent(),
    'x-correlation-id': `req-${Date.now()}-${faker.string.alphanumeric(8)}`,
    'authorization': faker.helpers.maybe(() => `Bearer ${faker.string.alphanumeric(32)}`),
    ...overrides.headers,
  },
  body: faker.helpers.maybe(() => ({
    [faker.lorem.word()]: faker.lorem.words(),
  })),
  query: faker.helpers.maybe(() => ({
    page: faker.number.int({ min: 1, max: 10 }).toString(),
    limit: faker.number.int({ min: 10, max: 100 }).toString(),
  })),
  ...overrides,
});

// File fixtures
export const generateAudioFile = (overrides: any = {}) => ({
  fieldname: 'audio',
  originalname: faker.system.fileName({ extensionCount: 1 }),
  encoding: '7bit',
  mimetype: faker.helpers.arrayElement(['audio/mpeg', 'audio/wav', 'audio/mp4']),
  buffer: Buffer.from(faker.string.alphanumeric(1024)),
  size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }),
  ...overrides,
});

// Utility functions
export const resetFaker = () => faker.seed(12345);

export const generateMockData = {
  users: generateUsers,
  notes: generateNotes,
  completeNote: generateCompleteNote,
  audioFile: generateAudioFile,
  apiError: generateApiError,
  apiSuccess: generateApiSuccess,
  queueJob: generateQueueJob,
  httpRequest: generateHttpRequest,
};

// Predefined test scenarios
export const testScenarios = {
  // New user registration flow
  newUserRegistration: () => {
    const userData = {
      email: 'newuser@test.com',
      password: 'password123',
    };
    const createdUser = generateUser({
      email: userData.email,
      id: faker.string.uuid(),
    });
    return { userData, createdUser };
  },

  // Complete note processing flow
  noteProcessingFlow: () => {
    const user = generateUser();
    const note = generateNote(user.id, { status: 'idle' });
    const audioFile = generateAudioFile();
    const uploadedNote = { ...note, status: 'uploaded' };
    const transcribingNote = { ...note, status: 'transcribing' };
    const transcript = generateTranscript(note.id);
    const summarizingNote = { ...note, status: 'summarizing' };
    const summary = generateSummary(note.id);
    const actions = generateActions(3, note.id);
    const finalNote = { ...note, status: 'ready' };

    return {
      user,
      note,
      audioFile,
      uploadedNote,
      transcribingNote,
      transcript,
      summarizingNote,
      summary,
      actions,
      finalNote,
    };
  },

  // Authentication flow with refresh tokens
  authFlow: () => {
    const user = generateUser();
    const loginData = {
      email: user.email,
      password: 'password123',
    };
    const tokens = {
      accessToken: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${faker.string.base64()}`,
      refreshToken: faker.string.alphanumeric(32),
    };
    const refreshTokenRecord = generateRefreshToken(user.id);

    return {
      user,
      loginData,
      tokens,
      refreshTokenRecord,
    };
  },

  // Error scenarios
  errorScenarios: () => ({
    validationError: generateApiError('VALIDATION_ERROR', 'Invalid input data'),
    authError: generateApiError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password'),
    notFoundError: generateApiError('NOTE_NOT_FOUND', 'Note not found'),
    fileTooLargeError: generateApiError('FILE_TOO_LARGE', 'File size exceeds 25MB limit'),
    internalError: generateApiError('INTERNAL_ERROR', 'Internal server error'),
  }),
};