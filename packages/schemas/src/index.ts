import { z } from 'zod';

// Esquemas de Usuario
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

// Esquemas de Notas
export const AudioStatusSchema = z.enum([
  'idle',
  'uploading', 
  'uploaded',
  'transcribing',
  'summarizing',
  'ready',
  'error'
]);

export const ActionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  suggestedDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const NoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  status: AudioStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  originalFileName: z.string().optional(),
  fileSize: z.number().optional(),
  transcript: z.string().nullable(),
  summary: z.string().nullable(),
  keyPoints: z.array(z.string()),
  actions: z.array(ActionItemSchema),
  tags: z.array(z.string()).optional(),
});

export const CreateNoteSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateNoteSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateActionSchema = z.object({
  completed: z.boolean(),
  text: z.string().optional(),
});

// Esquemas de respuestas API
export const ApiResponseSchema = z.object({
  data: z.unknown().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  correlationId: z.string(),
  timestamp: z.string().datetime().optional(),
});

export const NotesListResponseSchema = ApiResponseSchema.extend({
  data: z.array(NoteSchema),
  total: z.number(),
});

export const NoteResponseSchema = ApiResponseSchema.extend({
  data: NoteSchema,
});

export const AuthResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    token: z.string(),
    user: UserSchema,
    expiresIn: z.string(),
  }).optional(),
});

// Tipos TypeScript derivados
export type User = z.infer<typeof UserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type AudioStatus = z.infer<typeof AudioStatusSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type CreateNoteRequest = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteRequest = z.infer<typeof UpdateNoteSchema>;
export type UpdateActionRequest = z.infer<typeof UpdateActionSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type NotesListResponse = z.infer<typeof NotesListResponseSchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Utilidades de validación
export const validateNote = (data: unknown): Note => {
  return NoteSchema.parse(data);
};

export const validateUser = (data: unknown): User => {
  return UserSchema.parse(data);
};

export const validateLoginRequest = (data: unknown): LoginRequest => {
  return LoginSchema.parse(data);
};

export const validateRegisterRequest = (data: unknown): RegisterRequest => {
  return RegisterSchema.parse(data);
};