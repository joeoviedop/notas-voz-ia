import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ApiError, ERROR_CODES } from '@notas-voz/schemas';

/**
 * Validation middleware factory
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = schema.parse(request.body);
      // Attach validated data to request for use in handlers
      (request as any).validatedBody = validatedData;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');

        return reply.status(400).send({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: `Validation failed: ${errorMessage}`,
          }
        } as ApiError);
      }

      return reply.status(500).send({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal validation error',
        }
      } as ApiError);
    }
  };
}

/**
 * Query parameter validation middleware
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedQuery = schema.parse(request.query);
      (request as any).validatedQuery = validatedQuery;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');

        return reply.status(400).send({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: `Query validation failed: ${errorMessage}`,
          }
        } as ApiError);
      }

      return reply.status(500).send({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal validation error',
        }
      } as ApiError);
    }
  };
}

/**
 * Path parameter validation middleware
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedParams = schema.parse(request.params);
      (request as any).validatedParams = validatedParams;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');

        return reply.status(400).send({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: `Parameter validation failed: ${errorMessage}`,
          }
        } as ApiError);
      }

      return reply.status(500).send({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal validation error',
        }
      } as ApiError);
    }
  };
}

/**
 * File upload validation middleware
 */
export function validateFileUpload(
  options: {
    maxSize?: number; // in bytes
    allowedMimeTypes?: string[];
    required?: boolean;
  } = {}
) {
  const {
    maxSize = 25 * 1024 * 1024, // 25MB default
    allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'],
    required = true
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data && required) {
        return reply.status(400).send({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'File upload is required',
          }
        } as ApiError);
      }

      if (data) {
        // Check file size
        if (data.file.bytesRead > maxSize) {
          return reply.status(413).send({
            error: {
              code: ERROR_CODES.FILE_TOO_LARGE,
              message: `File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
            }
          } as ApiError);
        }

        // Check MIME type
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply.status(415).send({
            error: {
              code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
              message: `Unsupported file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
            }
          } as ApiError);
        }

        // Attach file data to request
        (request as any).uploadedFile = data;
      }
    } catch (error) {
      request.log.error({
        error: error instanceof Error ? error.message : error,
        correlationId: request.headers['x-correlation-id']
      }, 'File upload validation failed');

      return reply.status(500).send({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'File upload processing failed',
        }
      } as ApiError);
    }
  };
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: any, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    correlationId: request.headers['x-correlation-id'],
    url: request.url,
    method: request.method,
  }, 'API error occurred');

  // Handle specific error types
  if (error.message === 'AUTH_INVALID_CREDENTIALS') {
    return reply.status(401).send({
      error: {
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      }
    } as ApiError);
  }

  if (error.message === 'AUTH_TOKEN_EXPIRED') {
    return reply.status(401).send({
      error: {
        code: ERROR_CODES.AUTH_TOKEN_EXPIRED,
        message: 'Token expired or invalid',
      }
    } as ApiError);
  }

  if (error.message === 'NOTE_NOT_FOUND') {
    return reply.status(404).send({
      error: {
        code: ERROR_CODES.NOTE_NOT_FOUND,
        message: 'Note not found',
      }
    } as ApiError);
  }

  if (error.message === 'LLM_FAILURE') {
    return reply.status(503).send({
      error: {
        code: ERROR_CODES.LLM_FAILURE,
        message: 'AI summarization service temporarily unavailable',
      }
    } as ApiError);
  }

  if (error.message === 'STT_FAILURE') {
    return reply.status(503).send({
      error: {
        code: ERROR_CODES.STT_FAILURE,
        message: 'Speech-to-text service temporarily unavailable',
      }
    } as ApiError);
  }

  // Default error response
  return reply.status(500).send({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
    }
  } as ApiError);
}

// Extend FastifyRequest to include validated data
declare module 'fastify' {
  interface FastifyRequest {
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    uploadedFile?: any;
  }
}