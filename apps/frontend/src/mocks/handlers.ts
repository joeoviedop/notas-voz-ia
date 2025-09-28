import { http, HttpResponse, delay } from 'msw';
import type { Note, User, CursorPagination } from '@notas-voz/sdk';

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    email: 'user@test.com',
    name: 'Usuario de Prueba',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockNotes: Note[] = [
  {
    id: '1',
    userId: '1',
    title: 'Reunión de equipo - Sprint Review',
    description: 'Transcripción de la reunión de sprint review del equipo de producto',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    tags: ['trabajo', 'reunión', 'sprint'],
    mediaFiles: [
      {
        id: '1',
        noteId: '1',
        filename: 'reunion-sprint.mp3',
        originalName: 'reunion-sprint.mp3',
        mimeType: 'audio/mpeg',
        size: 2048000,
        url: '/mock-audio/reunion-sprint.mp3',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ],
    transcripts: [
      {
        id: '1',
        noteId: '1',
        text: 'Hola equipo, vamos a revisar los resultados del sprint. Durante estas dos semanas hemos completado 8 de las 10 historias de usuario planificadas. Las dos historias pendientes se han movido al siguiente sprint debido a dependencias externas. El feedback del cliente ha sido muy positivo, especialmente con la nueva funcionalidad de búsqueda que implementamos.',
        language: 'es',
        confidence: 0.95,
        processingTimeMs: 1500,
        createdAt: '2024-01-15T10:15:00Z',
      },
    ],
    summaries: [
      {
        id: '1',
        noteId: '1',
        content: 'Sprint review exitoso con 8 de 10 historias completadas. Feedback positivo del cliente sobre nueva funcionalidad de búsqueda. Dos historias pendientes se mueven al siguiente sprint por dependencias externas.',
        tldr: 'Sprint review exitoso: 80% historias completadas, cliente satisfecho con búsqueda, 2 historias pospuestas.',
        keyPoints: [
          '8/10 historias de usuario completadas',
          'Feedback positivo del cliente',
          'Nueva funcionalidad de búsqueda bien recibida',
          '2 historias movidas al siguiente sprint',
          'Dependencias externas causaron retrasos',
        ],
        createdAt: '2024-01-15T10:20:00Z',
      },
    ],
    actions: [
      {
        id: '1',
        noteId: '1',
        description: 'Coordinar con equipo externo para resolver dependencias',
        done: false,
        dueDate: '2024-01-22T00:00:00Z',
        createdAt: '2024-01-15T10:25:00Z',
        updatedAt: '2024-01-15T10:25:00Z',
      },
      {
        id: '2',
        noteId: '1',
        description: 'Documentar lecciones aprendidas del sprint',
        done: true,
        createdAt: '2024-01-15T10:25:00Z',
        updatedAt: '2024-01-16T09:00:00Z',
      },
      {
        id: '3',
        noteId: '1',
        description: 'Preparar demo para stakeholders',
        done: false,
        dueDate: '2024-01-20T00:00:00Z',
        createdAt: '2024-01-15T10:25:00Z',
        updatedAt: '2024-01-15T10:25:00Z',
      },
    ],
  },
  {
    id: '2',
    userId: '1',
    title: 'Lluvia de ideas - Nueva funcionalidad',
    description: 'Sesión de brainstorming para definir nueva funcionalidad',
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T15:00:00Z',
    tags: ['ideas', 'producto', 'brainstorming'],
    mediaFiles: [
      {
        id: '2',
        noteId: '2',
        filename: 'brainstorm-session.wav',
        originalName: 'brainstorm-session.wav',
        mimeType: 'audio/wav',
        size: 3200000,
        url: '/mock-audio/brainstorm-session.wav',
        createdAt: '2024-01-10T14:30:00Z',
      },
    ],
    transcripts: [
      {
        id: '2',
        noteId: '2',
        text: 'Necesitamos pensar en cómo mejorar la experiencia del usuario en el dashboard. Algunas ideas: filtros avanzados, vista de kanban, integración con calendario, notificaciones push personalizables, y tal vez un modo oscuro. También deberíamos considerar métricas de uso para entender mejor el comportamiento.',
        language: 'es',
        confidence: 0.92,
        processingTimeMs: 1800,
        createdAt: '2024-01-10T14:45:00Z',
      },
    ],
    summaries: [
      {
        id: '2',
        noteId: '2',
        content: 'Sesión de brainstorming sobre mejoras UX para dashboard. Ideas principales: filtros avanzados, vista kanban, integración calendario, notificaciones push, modo oscuro y métricas de uso.',
        tldr: 'Brainstorming UX dashboard: filtros, kanban, calendario, push notifications, modo oscuro, métricas.',
        keyPoints: [
          'Filtros avanzados para mejor organización',
          'Vista de kanban como alternativa',
          'Integración con calendario personal',
          'Notificaciones push personalizables',
          'Modo oscuro para mejor experiencia',
          'Métricas de uso para análisis',
        ],
        createdAt: '2024-01-10T14:50:00Z',
      },
    ],
    actions: [
      {
        id: '4',
        noteId: '2',
        description: 'Investigar herramientas de analytics para métricas',
        done: false,
        createdAt: '2024-01-10T14:55:00Z',
        updatedAt: '2024-01-10T14:55:00Z',
      },
      {
        id: '5',
        noteId: '2',
        description: 'Crear wireframes para vista kanban',
        done: true,
        createdAt: '2024-01-10T14:55:00Z',
        updatedAt: '2024-01-12T11:00:00Z',
      },
    ],
  },
  {
    id: '3',
    userId: '1',
    title: 'Grabación de prueba',
    description: 'Audio de prueba para testing',
    createdAt: '2024-01-20T16:00:00Z',
    updatedAt: '2024-01-20T16:00:00Z',
    tags: ['test'],
    mediaFiles: [
      {
        id: '3',
        noteId: '3',
        filename: 'test-audio.webm',
        originalName: 'grabacion-test.webm',
        mimeType: 'audio/webm',
        size: 512000,
        url: '/mock-audio/test-audio.webm',
        createdAt: '2024-01-20T16:00:00Z',
      },
    ],
    transcripts: [],
    summaries: [],
    actions: [],
  },
];

// Current user for auth
let currentUser: User | null = null;

export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/register', async ({ request }) => {
    await delay(800); // Simulate network delay
    
    const body = await request.json() as any;
    
    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email, password and name are required' } },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === body.email);
    if (existingUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_EMAIL_EXISTS', message: 'Email already registered' } },
        { status: 409 }
      );
    }

    // Create new user
    const newUser: User = {
      id: String(mockUsers.length + 1),
      email: body.email,
      name: body.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    currentUser = newUser;

    return HttpResponse.json({
      user: newUser,
      accessToken: 'mock-access-token',
    });
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(600);
    
    const body = await request.json() as any;
    
    // Mock credentials
    if (body.email === 'user@test.com' && body.password === 'password123') {
      currentUser = mockUsers[0];
      return HttpResponse.json({
        user: mockUsers[0],
        accessToken: 'mock-access-token',
      });
    }

    return HttpResponse.json(
      { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/refresh', async () => {
    await delay(200);
    
    if (currentUser) {
      return HttpResponse.json({
        user: currentUser,
        accessToken: 'mock-refresh-token',
      });
    }

    return HttpResponse.json(
      { error: { code: 'AUTH_TOKEN_EXPIRED', message: 'Token expired' } },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/logout', async () => {
    await delay(200);
    currentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // Notes endpoints
  http.get('/api/v1/notes', async ({ request }) => {
    await delay(400);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const tag = url.searchParams.get('tag') || '';
    const cursor = url.searchParams.get('cursor') || '';

    // Filter notes based on query and tag
    let filteredNotes = mockNotes.filter(note => note.userId === currentUser!.id);

    if (query) {
      filteredNotes = filteredNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.description?.toLowerCase().includes(query.toLowerCase()) ||
        note.transcripts?.some(t => t.text.toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (tag) {
      filteredNotes = filteredNotes.filter(note =>
        note.tags?.includes(tag)
      );
    }

    // Simple pagination simulation
    const limit = 10;
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedNotes = filteredNotes.slice(startIndex, endIndex);

    const response: CursorPagination = {
      data: paginatedNotes,
      hasMore: endIndex < filteredNotes.length,
      nextCursor: endIndex < filteredNotes.length ? String(endIndex) : null,
      total: filteredNotes.length,
    };

    return HttpResponse.json(response);
  }),

  http.post('/api/v1/notes', async ({ request }) => {
    await delay(600);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as any;
    
    const newNote: Note = {
      id: String(mockNotes.length + 1),
      userId: currentUser.id,
      title: body.title || 'Nueva nota',
      description: body.description || '',
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mediaFiles: [],
      transcripts: [],
      summaries: [],
      actions: [],
    };

    mockNotes.push(newNote);
    return HttpResponse.json(newNote, { status: 201 });
  }),

  http.get('/api/v1/notes/:id', async ({ params }) => {
    await delay(300);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const note = mockNotes.find(n => n.id === params.id && n.userId === currentUser!.id);
    if (!note) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(note);
  }),

  http.patch('/api/v1/notes/:id', async ({ params, request }) => {
    await delay(400);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const noteIndex = mockNotes.findIndex(n => n.id === params.id && n.userId === currentUser!.id);
    if (noteIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    const body = await request.json() as any;
    const updatedNote = {
      ...mockNotes[noteIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    mockNotes[noteIndex] = updatedNote;
    return HttpResponse.json(updatedNote);
  }),

  http.delete('/api/v1/notes/:id', async ({ params }) => {
    await delay(300);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const noteIndex = mockNotes.findIndex(n => n.id === params.id && n.userId === currentUser!.id);
    if (noteIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    mockNotes.splice(noteIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Upload endpoint
  http.post('/api/v1/notes/:id/upload', async ({ params }) => {
    await delay(2000); // Simulate upload time
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const note = mockNotes.find(n => n.id === params.id && n.userId === currentUser!.id);
    if (!note) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      fileId: 'mock-file-id',
      url: '/mock-audio/uploaded-file.webm',
      message: 'File uploaded successfully',
    });
  }),

  // Transcription endpoint
  http.post('/api/v1/notes/:id/transcribe', async ({ params }) => {
    await delay(1500);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const noteIndex = mockNotes.findIndex(n => n.id === params.id && n.userId === currentUser!.id);
    if (noteIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    // Simulate transcription process
    const updatedNote = { ...mockNotes[noteIndex] };
    updatedNote.transcripts = [
      {
        id: 'mock-transcript-' + Date.now(),
        noteId: params.id as string,
        text: 'Esta es una transcripción simulada del audio subido. En una implementación real, aquí aparecería el texto convertido desde el archivo de audio usando tecnología de speech-to-text.',
        language: 'es',
        confidence: 0.95,
        processingTimeMs: 1500,
        createdAt: new Date().toISOString(),
      },
    ];
    updatedNote.updatedAt = new Date().toISOString();

    mockNotes[noteIndex] = updatedNote;
    return HttpResponse.json(updatedNote);
  }),

  // Summarization endpoint
  http.post('/api/v1/notes/:id/summarize', async ({ params }) => {
    await delay(2500);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const noteIndex = mockNotes.findIndex(n => n.id === params.id && n.userId === currentUser!.id);
    if (noteIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    // Sometimes simulate LLM failure for testing
    if (Math.random() < 0.1) {
      return HttpResponse.json(
        { error: { code: 'LLM_FAILURE', message: 'Failed to generate summary. Please try again.' } },
        { status: 503 }
      );
    }

    const updatedNote = { ...mockNotes[noteIndex] };
    updatedNote.summaries = [
      {
        id: 'mock-summary-' + Date.now(),
        noteId: params.id as string,
        content: 'Resumen generado automáticamente del contenido transcrito. Los puntos principales incluyen información relevante extraída del audio.',
        tldr: 'Resumen ejecutivo: información clave del audio procesado.',
        keyPoints: [
          'Punto clave 1 identificado automáticamente',
          'Punto clave 2 extraído del contexto',
          'Punto clave 3 relevante para el tema',
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    // Also generate some mock actions
    updatedNote.actions = [
      {
        id: 'mock-action-' + Date.now(),
        noteId: params.id as string,
        description: 'Acción sugerida basada en el contenido',
        done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    updatedNote.updatedAt = new Date().toISOString();

    mockNotes[noteIndex] = updatedNote;
    return HttpResponse.json(updatedNote);
  }),

  // Actions endpoints
  http.post('/api/v1/notes/:noteId/actions', async ({ params, request }) => {
    await delay(300);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as any;
    
    const newAction = {
      id: 'action-' + Date.now(),
      noteId: params.noteId as string,
      description: body.description,
      done: body.done || false,
      dueDate: body.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(newAction, { status: 201 });
  }),

  http.patch('/api/v1/actions/:id', async ({ params, request }) => {
    await delay(200);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as any;
    
    const updatedAction = {
      id: params.id as string,
      noteId: 'mock-note-id',
      description: body.description || 'Updated action',
      done: body.done ?? false,
      dueDate: body.dueDate,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(updatedAction);
  }),

  http.delete('/api/v1/actions/:id', async ({ params }) => {
    await delay(200);
    
    if (!currentUser) {
      return HttpResponse.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Health check
  http.get('/api/v1/health', async () => {
    await delay(100);
    
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'mock',
    });
  }),
];

export { mockNotes, mockUsers };