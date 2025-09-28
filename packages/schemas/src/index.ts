import { z } from 'zod';

// ==============================================
// ERROR SCHEMAS
// ==============================================

export const ErrorCodeSchema = z.enum([
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_EXPIRED',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'NOTE_NOT_FOUND',
  'LLM_FAILURE',
  'STT_FAILURE',
  'RATE_LIMITED',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
  }),
});

// ==============================================
// USER SCHEMAS
// ==============================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ResetRequestSchema = z.object({
  email: z.string().email(),
});

export const ResetConfirmRequestSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

// ==============================================
// TOKEN SCHEMAS
// ==============================================

export const TokenPairSchema = z.object({
  accessToken: z.string(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  tokens: TokenPairSchema,
});

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
});

// ==============================================
// NOTE STATUS & CORE SCHEMAS
// ==============================================

export const NoteStatusSchema = z.enum([
  'idle',
  'uploading', 
  'uploaded',
  'transcribing',
  'summarizing',
  'ready',
  'error'
]);

export const ActionSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  due_suggested: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export const TranscriptSchema = z.object({
  id: z.string(),
  text: z.string(),
  language: z.string(),
  confidence: z.number().min(0).max(1),
});

export const SummarySchema = z.object({
  id: z.string(),
  tl_dr: z.string(),
  bullets: z.array(z.string()),
  actions: z.array(ActionSchema),
});

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: NoteStatusSchema,
  createdAt: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  transcript: TranscriptSchema.nullable().optional(),
  summary: SummarySchema.nullable().optional(),
  actions: z.array(ActionSchema),
});

// ==============================================
// MEDIA SCHEMAS
// ==============================================

export const MediaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  contentType: z.string(),
});

// ==============================================
// PAGINATION SCHEMAS
// ==============================================

export const CursorPaginationSchema = z.object({
  items: z.array(NoteSchema),
  cursor: z.string().nullable().optional(),
});

// ==============================================
// REQUEST SCHEMAS
// ==============================================

export const CreateNoteRequestSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateNoteRequestSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateActionRequestSchema = z.object({
  text: z.string(),
  due_suggested: z.string().datetime().optional(),
});

export const UpdateActionRequestSchema = z.object({
  text: z.string().optional(),
  done: z.boolean().optional(),
  due_suggested: z.string().datetime().optional(),
});

// ==============================================
// RESPONSE SCHEMAS
// ==============================================

export const NoteResponseSchema = NoteSchema;
export const NotesListResponseSchema = CursorPaginationSchema;
export const ActionResponseSchema = ActionSchema;

export const UploadResponseSchema = z.object({
  media: MediaSchema,
  note: NoteSchema,
});

// ==============================================
// TYPESCRIPT TYPES
// ==============================================

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type User = z.infer<typeof UserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ResetRequest = z.infer<typeof ResetRequestSchema>;
export type ResetConfirmRequest = z.infer<typeof ResetConfirmRequestSchema>;
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type NoteStatus = z.infer<typeof NoteStatusSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;
export type CreateActionRequest = z.infer<typeof CreateActionRequestSchema>;
export type UpdateActionRequest = z.infer<typeof UpdateActionRequestSchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
export type NotesListResponse = z.infer<typeof NotesListResponseSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// ==============================================
// VALIDATION UTILITIES
// ==============================================

export const validateNote = (data: unknown): Note => {
  return NoteSchema.parse(data);
};

export const validateUser = (data: unknown): User => {
  return UserSchema.parse(data);
};

export const validateLoginRequest = (data: unknown): LoginRequest => {
  return LoginRequestSchema.parse(data);
};

export const validateRegisterRequest = (data: unknown): RegisterRequest => {
  return RegisterRequestSchema.parse(data);
};

export const validateCreateNoteRequest = (data: unknown): CreateNoteRequest => {
  return CreateNoteRequestSchema.parse(data);
};

export const validateUpdateNoteRequest = (data: unknown): UpdateNoteRequest => {
  return UpdateNoteRequestSchema.parse(data);
};

export const validateCreateActionRequest = (data: unknown): CreateActionRequest => {
  return CreateActionRequestSchema.parse(data);
};

export const validateUpdateActionRequest = (data: unknown): UpdateActionRequest => {
  return UpdateActionRequestSchema.parse(data);
};

export const validateApiError = (data: unknown): ApiError => {
  return ApiErrorSchema.parse(data);
};

// ==============================================
// CONSTANTS
// ==============================================

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
  LLM_FAILURE: 'LLM_FAILURE',
  STT_FAILURE: 'STT_FAILURE',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const NOTE_STATUSES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  TRANSCRIBING: 'transcribing',
  SUMMARIZING: 'summarizing',
  READY: 'ready',
  ERROR: 'error',
} as const;
