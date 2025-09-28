import { FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Login mock
  fastify.post('/login', async (request, reply) => {
    const body = request.body as { email: string; password: string };
    
    if (!body.email || !body.password) {
      return reply.status(400).send({
        error: 'Email y password son requeridos',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    // Simular validación de credenciales
    if (body.email === 'test@example.com' && body.password === 'password123') {
      const mockToken = `mock-jwt-token-${Date.now()}`;
      
      return {
        token: mockToken,
        user: {
          id: 'user-mock-123',
          email: body.email,
          name: 'Usuario de Prueba',
        },
        expiresIn: '24h',
        correlationId: request.headers['x-correlation-id'],
      };
    }

    return reply.status(401).send({
      error: 'Credenciales inválidas',
      correlationId: request.headers['x-correlation-id'],
    });
  });

  // Registro mock
  fastify.post('/register', async (request, reply) => {
    const body = request.body as { email: string; password: string; name: string };
    
    if (!body.email || !body.password || !body.name) {
      return reply.status(400).send({
        error: 'Email, password y name son requeridos',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    // Simular registro
    const mockToken = `mock-jwt-token-${Date.now()}`;
    
    return reply.status(201).send({
      token: mockToken,
      user: {
        id: `user-${Date.now()}`,
        email: body.email,
        name: body.name,
      },
      message: 'Usuario registrado exitosamente',
      correlationId: request.headers['x-correlation-id'],
    });
  });

  // Verificar token mock
  fastify.get('/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Token no proporcionado',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    const token = authHeader.substring(7);
    
    // Simular validación de token
    if (token.startsWith('mock-jwt-token-')) {
      return {
        valid: true,
        user: {
          id: 'user-mock-123',
          email: 'test@example.com',
          name: 'Usuario de Prueba',
        },
        correlationId: request.headers['x-correlation-id'],
      };
    }

    return reply.status(401).send({
      error: 'Token inválido',
      correlationId: request.headers['x-correlation-id'],
    });
  });

};