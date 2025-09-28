import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  CreateNoteRequestSchema,
  UpdateNoteRequestSchema,
  NOTE_STATUSES
} from '@notas-voz/schemas';
import { 
  validateBody, 
  validateQuery, 
  validateParams,
  validateFileUpload,
  handleApiError 
} from '../middleware/validation.middleware.js';
import { authMiddleware, getUserId } from '../middleware/auth.middleware.js';
import { storageService } from '../services/storage.service.js';
import { getQueueService } from '../services/queue.service.js';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();
const queueService = getQueueService();

// Schema for route parameters
const NoteParamsSchema = z.object({
  id: z.string()
});

// Schema for query parameters
const NotesQuerySchema = z.object({
  cursor: z.string().optional(),
  query: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(10)
});

export const notesRoutes: FastifyPluginAsync = async (fastify) => {

  // List notes with pagination and search
  fastify.get('/', {
    preHandler: [authMiddleware, validateQuery(NotesQuerySchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { cursor, query, tag, limit } = request.validatedQuery;

      // Build where clause
      const where: any = {
        userId
      };

      // Add search filter
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { transcript: { text: { contains: query, mode: 'insensitive' } } }
        ];
      }

      // Add tag filter
      if (tag) {
        where.tags = {
          has: tag
        };
      }

      // Add cursor for pagination
      if (cursor) {
        where.createdAt = { lt: new Date(cursor) };
      }

      // Fetch notes with relations
      const notes = await prisma.note.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Fetch one extra to determine if there's a next page
        include: {
          transcript: true,
          summary: true,
          actions: {
            orderBy: { createdAt: 'asc' }
          },
          media: true
        }
      });

      // Determine if there's a next page
      const hasNextPage = notes.length > limit;
      const items = hasNextPage ? notes.slice(0, -1) : notes;
      const nextCursor = hasNextPage ? items[items.length - 1]?.createdAt?.toISOString() : null;

      // Format response
      const formattedNotes = items.map(note => ({
        id: note.id,
        title: note.title || 'Untitled Note',
        status: note.status,
        createdAt: note.createdAt.toISOString(),
        tags: note.tags,
        transcript: note.transcript ? {
          id: note.transcript.id,
          text: note.transcript.text,
          language: note.transcript.language,
          confidence: note.transcript.confidence
        } : null,
        summary: note.summary ? {
          id: note.summary.id,
          tl_dr: note.summary.tlDr,
          bullets: note.summary.bullets,
          actions: note.actions.map(action => ({
            id: action.id,
            text: action.text,
            done: action.done,
            due_suggested: action.dueSuggested?.toISOString(),
            createdAt: action.createdAt.toISOString()
          }))
        } : null,
        actions: note.actions.map(action => ({
          id: action.id,
          text: action.text,
          done: action.done,
          due_suggested: action.dueSuggested?.toISOString(),
          createdAt: action.createdAt.toISOString()
        }))
      }));

      return reply.status(200).send({
        items: formattedNotes,
        cursor: nextCursor
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Create a new note
  fastify.post('/', {
    preHandler: [authMiddleware, validateBody(CreateNoteRequestSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { title, tags } = request.validatedBody;

      const note = await prisma.note.create({
        data: {
          title: title || `Note ${new Date().toLocaleDateString()}`,
          tags: tags || [],
          status: 'idle',
          userId
        }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'note_created',
          userId,
          noteId: note.id,
          correlationId: request.headers['x-correlation-id'] as string
        }
      });

      return reply.status(201).send({
        id: note.id,
        title: note.title,
        status: note.status,
        createdAt: note.createdAt.toISOString(),
        tags: note.tags,
        transcript: null,
        summary: null,
        actions: []
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Get a specific note
  fastify.get('/:id', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;

      const note = await prisma.note.findFirst({
        where: { id, userId },
        include: {
          transcript: true,
          summary: true,
          actions: {
            orderBy: { createdAt: 'asc' }
          },
          media: true
        }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      return reply.status(200).send({
        id: note.id,
        title: note.title,
        status: note.status,
        createdAt: note.createdAt.toISOString(),
        tags: note.tags,
        transcript: note.transcript ? {
          id: note.transcript.id,
          text: note.transcript.text,
          language: note.transcript.language,
          confidence: note.transcript.confidence
        } : null,
        summary: note.summary ? {
          id: note.summary.id,
          tl_dr: note.summary.tlDr,
          bullets: note.summary.bullets,
          actions: note.actions.map(action => ({
            id: action.id,
            text: action.text,
            done: action.done,
            due_suggested: action.dueSuggested?.toISOString(),
            createdAt: action.createdAt.toISOString()
          }))
        } : null,
        actions: note.actions.map(action => ({
          id: action.id,
          text: action.text,
          done: action.done,
          due_suggested: action.dueSuggested?.toISOString(),
          createdAt: action.createdAt.toISOString()
        }))
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Update a note
  fastify.patch('/:id', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema), validateBody(UpdateNoteRequestSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;
      const { title, tags } = request.validatedBody;

      // Check if note exists and belongs to user
      const existingNote = await prisma.note.findFirst({
        where: { id, userId }
      });

      if (!existingNote) {
        throw new Error('NOTE_NOT_FOUND');
      }

      // Update note
      const updatedNote = await prisma.note.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(tags !== undefined && { tags })
        },
        include: {
          transcript: true,
          summary: true,
          actions: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'note_updated',
          userId,
          noteId: id,
          correlationId: request.headers['x-correlation-id'] as string
        }
      });

      return reply.status(200).send({
        id: updatedNote.id,
        title: updatedNote.title,
        status: updatedNote.status,
        createdAt: updatedNote.createdAt.toISOString(),
        tags: updatedNote.tags,
        transcript: updatedNote.transcript ? {
          id: updatedNote.transcript.id,
          text: updatedNote.transcript.text,
          language: updatedNote.transcript.language,
          confidence: updatedNote.transcript.confidence
        } : null,
        summary: updatedNote.summary ? {
          id: updatedNote.summary.id,
          tl_dr: updatedNote.summary.tlDr,
          bullets: updatedNote.summary.bullets,
          actions: updatedNote.actions.map(action => ({
            id: action.id,
            text: action.text,
            done: action.done,
            due_suggested: action.dueSuggested?.toISOString(),
            createdAt: action.createdAt.toISOString()
          }))
        } : null,
        actions: updatedNote.actions.map(action => ({
          id: action.id,
          text: action.text,
          done: action.done,
          due_suggested: action.dueSuggested?.toISOString(),
          createdAt: action.createdAt.toISOString()
        }))
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Delete a note
  fastify.delete('/:id', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;

      // Check if note exists and belongs to user
      const note = await prisma.note.findFirst({
        where: { id, userId },
        include: { media: true }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      // Delete associated files from storage
      if (note.media.length > 0) {
        await Promise.all(
          note.media.map(media => 
            storageService.deleteFile(media.storageKey).catch(error => {
              console.error(`Failed to delete file ${media.storageKey}:`, error);
            })
          )
        );
      }

      // Delete note (cascade will delete related records)
      await prisma.note.delete({
        where: { id }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'note_deleted',
          userId,
          noteId: id,
          correlationId: request.headers['x-correlation-id'] as string
        }
      });

      return reply.status(204).send();

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Upload audio to note
  fastify.post('/:id/upload', {
    preHandler: [
      authMiddleware, 
      validateParams(NoteParamsSchema),
      validateFileUpload({
        maxSize: 25 * 1024 * 1024, // 25MB
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg']
      })
    ]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;
      const fileData = request.uploadedFile;

      // Check if note exists and belongs to user
      const note = await prisma.note.findFirst({
        where: { id, userId }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      // Update note status to uploading
      await prisma.note.update({
        where: { id },
        data: { status: 'uploading' }
      });

      // Convert file stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of fileData.file) {
        chunks.push(chunk as Buffer);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Upload to storage
      const uploadResult = await storageService.uploadFile(
        fileBuffer,
        fileData.filename,
        {
          contentType: fileData.mimetype,
          folder: `audio/${userId}`,
          metadata: {
            noteId: id,
            userId,
            uploadedAt: new Date().toISOString()
          }
        }
      );

      // Save media record
      const media = await prisma.media.create({
        data: {
          filename: uploadResult.key.split('/').pop() || fileData.filename,
          originalName: fileData.filename,
          size: fileBuffer.length,
          contentType: fileData.mimetype,
          storageKey: uploadResult.key,
          storageUrl: uploadResult.url,
          noteId: id
        }
      });

      // Update note status to uploaded
      const updatedNote = await prisma.note.update({
        where: { id },
        data: { status: 'uploaded' },
        include: {
          transcript: true,
          summary: true,
          actions: true
        }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'media_uploaded',
          userId,
          noteId: id,
          correlationId: request.headers['x-correlation-id'] as string
        }
      });

      return reply.status(200).send({
        media: {
          id: media.id,
          filename: media.filename,
          size: media.size,
          contentType: media.contentType
        },
        note: {
          id: updatedNote.id,
          title: updatedNote.title,
          status: updatedNote.status,
          createdAt: updatedNote.createdAt.toISOString(),
          tags: updatedNote.tags,
          transcript: updatedNote.transcript ? {
            id: updatedNote.transcript.id,
            text: updatedNote.transcript.text,
            language: updatedNote.transcript.language,
            confidence: updatedNote.transcript.confidence
          } : null,
          summary: updatedNote.summary ? {
            id: updatedNote.summary.id,
            tl_dr: updatedNote.summary.tlDr,
            bullets: updatedNote.summary.bullets,
            actions: updatedNote.actions.map(action => ({
              id: action.id,
              text: action.text,
              done: action.done,
              due_suggested: action.dueSuggested?.toISOString(),
              createdAt: action.createdAt.toISOString()
            }))
          } : null,
          actions: updatedNote.actions.map(action => ({
            id: action.id,
            text: action.text,
            done: action.done,
            due_suggested: action.dueSuggested?.toISOString(),
            createdAt: action.createdAt.toISOString()
          }))
        }
      });

    } catch (error) {
      // Reset note status on error
      const { id } = request.validatedParams;
      if (id) {
        await prisma.note.update({
          where: { id },
          data: { status: 'idle' }
        }).catch(() => {}); // Ignore errors in cleanup
      }

      return handleApiError(error, request, reply);
    }
  });

  // Start transcription
  fastify.post('/:id/transcribe', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;

      // Check if note exists and belongs to user
      const note = await prisma.note.findFirst({
        where: { id, userId },
        include: { media: true }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      if (note.status !== 'uploaded') {
        throw new Error('Note must be uploaded before transcription');
      }

      if (!note.media || note.media.length === 0) {
        throw new Error('No audio file found for transcription');
      }

      // Get the latest media file
      const media = note.media[note.media.length - 1];

      // Queue transcription job
      await queueService.addTranscribeJob({
        noteId: id,
        mediaId: media.id,
        storageKey: media.storageKey,
        userId,
        options: {
          language: 'es' // Default to Spanish, can be made configurable
        }
      });

      // Update note status
      const updatedNote = await prisma.note.update({
        where: { id },
        data: { status: 'transcribing' },
        include: {
          transcript: true,
          summary: true,
          actions: true
        }
      });

      return reply.status(202).send({
        id: updatedNote.id,
        title: updatedNote.title,
        status: updatedNote.status,
        createdAt: updatedNote.createdAt.toISOString(),
        tags: updatedNote.tags,
        transcript: null,
        summary: null,
        actions: []
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Start summarization
  fastify.post('/:id/summarize', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;

      // Check if note exists and belongs to user
      const note = await prisma.note.findFirst({
        where: { id, userId },
        include: { transcript: true }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      if (!note.transcript) {
        throw new Error('Note must be transcribed before summarization');
      }

      // Queue summarization job
      await queueService.addSummarizeJob({
        noteId: id,
        transcriptId: note.transcript.id,
        transcriptText: note.transcript.text,
        userId,
        options: {
          language: 'español' // Default to Spanish
        }
      });

      // Update note status
      const updatedNote = await prisma.note.update({
        where: { id },
        data: { status: 'summarizing' },
        include: {
          transcript: true,
          summary: true,
          actions: true
        }
      });

      return reply.status(202).send({
        id: updatedNote.id,
        title: updatedNote.title,
        status: updatedNote.status,
        createdAt: updatedNote.createdAt.toISOString(),
        tags: updatedNote.tags,
        transcript: updatedNote.transcript ? {
          id: updatedNote.transcript.id,
          text: updatedNote.transcript.text,
          language: updatedNote.transcript.language,
          confidence: updatedNote.transcript.confidence
        } : null,
        summary: null,
        actions: []
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

};