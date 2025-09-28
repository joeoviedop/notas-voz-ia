import { FastifyPluginAsync } from 'fastify';

// Mock data store (reemplazar con BD real)
const notesStore = new Map();

export const notesRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Listar notas del usuario
  fastify.get('/', async (request, reply) => {
    const userId = 'user-mock-123'; // Mock user ID
    
    const mockNotes = [
      {
        id: 'note-1',
        userId,
        title: 'Reunión de equipo - Proyecto MVP',
        status: 'ready',
        createdAt: new Date().toISOString(),
        transcript: 'Esta es la transcripción simulada de la reunión...',
        summary: 'Reunión sobre planificación del MVP con 3 acciones identificadas.',
        keyPoints: [
          'Definición de alcance del MVP',
          'Asignación de responsabilidades del equipo',
          'Establecimiento de fechas límite'
        ],
        actions: [
          {
            id: 'action-1',
            text: 'Preparar documentación técnica',
            completed: false,
            suggestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'action-2',
            text: 'Revisar presupuesto del proyecto',
            completed: false,
            suggestedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ],
      },
      {
        id: 'note-2',
        userId,
        title: 'Ideas para nueva feature',
        status: 'transcribing',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        transcript: null,
        summary: null,
        keyPoints: [],
        actions: [],
      }
    ];
    
    return {
      data: mockNotes,
      total: mockNotes.length,
      correlationId: request.headers['x-correlation-id'],
    };
  });

  // Crear nueva nota (upload audio)
  fastify.post('/', async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({
        error: 'No se encontró archivo de audio',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    const noteId = `note-${Date.now()}`;
    const userId = 'user-mock-123'; // Mock user ID

    const newNote = {
      id: noteId,
      userId,
      title: data.filename || 'Audio sin título',
      status: 'uploaded',
      createdAt: new Date().toISOString(),
      originalFileName: data.filename,
      fileSize: data.file.bytesRead,
      transcript: null,
      summary: null,
      keyPoints: [],
      actions: [],
    };

    // Simular guardado en storage
    notesStore.set(noteId, newNote);

    return reply.status(201).send({
      data: newNote,
      message: 'Audio subido exitosamente. Iniciando transcripción...',
      correlationId: request.headers['x-correlation-id'],
    });
  });

  // Obtener nota específica
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = notesStore.get(id);

    if (!note) {
      return reply.status(404).send({
        error: 'Nota no encontrada',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    return {
      data: note,
      correlationId: request.headers['x-correlation-id'],
    };
  });

  // Iniciar transcripción (mock)
  fastify.post('/:id/transcribe', async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = notesStore.get(id);

    if (!note) {
      return reply.status(404).send({
        error: 'Nota no encontrada',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    // Simular proceso de transcripción
    note.status = 'transcribing';
    notesStore.set(id, note);

    // Simular tiempo de procesamiento
    setTimeout(() => {
      note.status = 'summarizing';
      note.transcript = 'Transcripción simulada del audio procesado...';
      notesStore.set(id, note);
    }, 1500);

    return {
      data: note,
      message: 'Transcripción iniciada',
      correlationId: request.headers['x-correlation-id'],
    };
  });

  // Generar resumen (mock)
  fastify.post('/:id/summarize', async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = notesStore.get(id);

    if (!note) {
      return reply.status(404).send({
        error: 'Nota no encontrada',
        correlationId: request.headers['x-correlation-id'],
      });
    }

    // Simular proceso de resumen
    setTimeout(() => {
      note.status = 'ready';
      note.summary = 'Resumen simulado generado por IA';
      note.keyPoints = [
        'Punto clave 1 identificado',
        'Punto clave 2 identificado',
        'Punto clave 3 identificado'
      ];
      note.actions = [
        {
          id: `action-${Date.now()}`,
          text: 'Acción simulada generada por IA',
          completed: false,
          suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      notesStore.set(id, note);
    }, 2000);

    return {
      data: note,
      message: 'Generación de resumen iniciada',
      correlationId: request.headers['x-correlation-id'],
    };
  });

};