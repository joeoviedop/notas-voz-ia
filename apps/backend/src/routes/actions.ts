import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  CreateActionRequestSchema,
  UpdateActionRequestSchema
} from '@notas-voz/schemas';
import { 
  validateBody, 
  validateParams,
  handleApiError 
} from '../middleware/validation.middleware.js';
import { authMiddleware, getUserId } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

// Schema for route parameters
const ActionParamsSchema = z.object({
  id: z.string()
});

const NoteParamsSchema = z.object({
  id: z.string()
});

export const actionsRoutes: FastifyPluginAsync = async (fastify) => {

  // Create action for a note
  fastify.post('/notes/:id/actions', {
    preHandler: [authMiddleware, validateParams(NoteParamsSchema), validateBody(CreateActionRequestSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id: noteId } = request.validatedParams;
      const { text, due_suggested } = request.validatedBody;

      // Check if note exists and belongs to user
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId }
      });

      if (!note) {
        throw new Error('NOTE_NOT_FOUND');
      }

      // Create action
      const action = await prisma.action.create({
        data: {
          text,
          done: false,
          dueSuggested: due_suggested ? new Date(due_suggested) : undefined,
          noteId,
          userId
        }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'action_created',
          userId,
          noteId,
          correlationId: request.headers['x-correlation-id'] as string,
          metadata: {
            actionId: action.id,
            actionText: action.text
          }
        }
      });

      return reply.status(201).send({
        id: action.id,
        text: action.text,
        done: action.done,
        due_suggested: action.dueSuggested?.toISOString(),
        createdAt: action.createdAt.toISOString()
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Update an action
  fastify.patch('/:id', {
    preHandler: [authMiddleware, validateParams(ActionParamsSchema), validateBody(UpdateActionRequestSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;
      const { text, done, due_suggested } = request.validatedBody;

      // Check if action exists and belongs to user
      const existingAction = await prisma.action.findFirst({
        where: { id, userId }
      });

      if (!existingAction) {
        throw new Error('Action not found');
      }

      // Update action
      const updatedAction = await prisma.action.update({
        where: { id },
        data: {
          ...(text !== undefined && { text }),
          ...(done !== undefined && { done }),
          ...(due_suggested !== undefined && { 
            dueSuggested: due_suggested ? new Date(due_suggested) : null 
          })
        }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'action_updated',
          userId,
          noteId: existingAction.noteId,
          correlationId: request.headers['x-correlation-id'] as string,
          metadata: {
            actionId: updatedAction.id,
            changes: { text, done, due_suggested }
          }
        }
      });

      return reply.status(200).send({
        id: updatedAction.id,
        text: updatedAction.text,
        done: updatedAction.done,
        due_suggested: updatedAction.dueSuggested?.toISOString(),
        createdAt: updatedAction.createdAt.toISOString()
      });

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

  // Delete an action
  fastify.delete('/:id', {
    preHandler: [authMiddleware, validateParams(ActionParamsSchema)]
  }, async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { id } = request.validatedParams;

      // Check if action exists and belongs to user
      const action = await prisma.action.findFirst({
        where: { id, userId }
      });

      if (!action) {
        throw new Error('Action not found');
      }

      // Delete action
      await prisma.action.delete({
        where: { id }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'action_deleted',
          userId,
          noteId: action.noteId,
          correlationId: request.headers['x-correlation-id'] as string,
          metadata: {
            actionId: action.id,
            actionText: action.text
          }
        }
      });

      return reply.status(204).send();

    } catch (error) {
      return handleApiError(error, request, reply);
    }
  });

};