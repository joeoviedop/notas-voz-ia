import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.MOCK_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurar multer para archivos
const upload = multer({
  dest: path.join(__dirname, '.fixtures/uploads'),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

// Mock data storage
const mockUsers = new Map();
const mockNotes = new Map();
const mockTokens = new Set();

// Utilidades
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateToken = () => `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 15)}`;

// Middleware para logs
app.use((req, res, next) => {
  console.log(`🔧 [MOCK] ${req.method} ${req.path}`, req.query);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mock Server',
    timestamp: new Date().toISOString(),
    environment: 'mock',
  });
});

// Auth endpoints
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email y password son requeridos',
      correlationId: `mock-${Date.now()}`,
    });
  }

  // Credenciales mock válidas
  if (email === 'test@example.com' && password === 'password123') {
    const token = generateToken();
    const userId = 'mock-user-123';
    
    mockTokens.add(token);
    mockUsers.set(userId, {
      id: userId,
      email,
      name: 'Usuario Mock',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      data: {
        token,
        user: mockUsers.get(userId),
        expiresIn: '24h',
      },
      correlationId: `mock-${Date.now()}`,
    });
  }

  res.status(401).json({
    error: 'Credenciales inválidas',
    correlationId: `mock-${Date.now()}`,
  });
});

app.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Email, password y name son requeridos',
      correlationId: `mock-${Date.now()}`,
    });
  }

  const token = generateToken();
  const userId = generateId();
  
  mockTokens.add(token);
  mockUsers.set(userId, {
    id: userId,
    email,
    name,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    data: {
      token,
      user: mockUsers.get(userId),
      expiresIn: '24h',
    },
    message: 'Usuario registrado exitosamente',
    correlationId: `mock-${Date.now()}`,
  });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token no proporcionado',
      correlationId: `mock-${Date.now()}`,
    });
  }

  const token = authHeader.substring(7);
  
  if (mockTokens.has(token)) {
    return res.json({
      valid: true,
      user: {
        id: 'mock-user-123',
        email: 'test@example.com',
        name: 'Usuario Mock',
      },
      correlationId: `mock-${Date.now()}`,
    });
  }

  res.status(401).json({
    error: 'Token inválido',
    correlationId: `mock-${Date.now()}`,
  });
});

// Notes endpoints
app.get('/notes', (req, res) => {
  const { limit = 50, offset = 0, status } = req.query;
  
  // Mock notes con diferentes estados
  const allNotes = [
    {
      id: 'note-1',
      userId: 'mock-user-123',
      title: 'Reunión de equipo - Proyecto MVP',
      status: 'ready',
      createdAt: new Date().toISOString(),
      originalFileName: 'reunion-equipo.mp3',
      fileSize: 2048000,
      transcript: 'Esta es la transcripción simulada de la reunión donde discutimos el MVP, las responsabilidades del equipo y establecimos fechas límite importantes.',
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
      tags: ['trabajo', 'mvp', 'planificación'],
    },
    {
      id: 'note-2',
      userId: 'mock-user-123',
      title: 'Ideas para nueva feature',
      status: 'transcribing',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      originalFileName: 'ideas-feature.wav',
      fileSize: 1536000,
      transcript: null,
      summary: null,
      keyPoints: [],
      actions: [],
      tags: ['ideas', 'producto'],
    },
    {
      id: 'note-3',
      userId: 'mock-user-123',
      title: 'Feedback de clientes',
      status: 'summarizing',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      originalFileName: 'feedback-clientes.m4a',
      fileSize: 3072000,
      transcript: 'Transcripción del feedback de clientes sobre la experiencia de usuario...',
      summary: null,
      keyPoints: [],
      actions: [],
      tags: ['feedback', 'clientes', 'ux'],
    }
  ];

  // Filtrar por estado si se especifica
  let filteredNotes = status ? allNotes.filter(note => note.status === status) : allNotes;
  
  // Simular paginación
  const startIndex = parseInt(offset);
  const limitNum = parseInt(limit);
  const paginatedNotes = filteredNotes.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginatedNotes,
    total: filteredNotes.length,
    correlationId: `mock-${Date.now()}`,
  });
});

app.post('/notes', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No se encontró archivo de audio',
      correlationId: `mock-${Date.now()}`,
    });
  }

  const noteId = generateId();
  const userId = 'mock-user-123';

  const newNote = {
    id: noteId,
    userId,
    title: req.body.title || req.file.originalname || 'Audio sin título',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
    originalFileName: req.file.originalname,
    fileSize: req.file.size,
    transcript: null,
    summary: null,
    keyPoints: [],
    actions: [],
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
  };

  mockNotes.set(noteId, newNote);

  // Simular procesamiento automático después de un delay
  setTimeout(() => {
    const note = mockNotes.get(noteId);
    if (note) {
      note.status = 'transcribing';
      mockNotes.set(noteId, note);
    }
  }, 2000);

  res.status(201).json({
    data: newNote,
    message: 'Audio subido exitosamente. Iniciando transcripción...',
    correlationId: `mock-${Date.now()}`,
  });
});

app.get('/notes/:id', (req, res) => {
  const { id } = req.params;
  const note = mockNotes.get(id);

  if (!note) {
    return res.status(404).json({
      error: 'Nota no encontrada',
      correlationId: `mock-${Date.now()}`,
    });
  }

  res.json({
    data: note,
    correlationId: `mock-${Date.now()}`,
  });
});

app.post('/notes/:id/transcribe', (req, res) => {
  const { id } = req.params;
  const note = mockNotes.get(id);

  if (!note) {
    return res.status(404).json({
      error: 'Nota no encontrada',
      correlationId: `mock-${Date.now()}`,
    });
  }

  note.status = 'transcribing';
  mockNotes.set(id, note);

  // Simular transcripción
  setTimeout(() => {
    const updatedNote = mockNotes.get(id);
    if (updatedNote) {
      updatedNote.status = 'summarizing';
      updatedNote.transcript = 'Transcripción simulada generada por el mock server. Aquí estaría el texto convertido del audio.';
      mockNotes.set(id, updatedNote);
    }
  }, 3000);

  res.json({
    data: note,
    message: 'Transcripción iniciada',
    correlationId: `mock-${Date.now()}`,
  });
});

app.post('/notes/:id/summarize', (req, res) => {
  const { id } = req.params;
  const note = mockNotes.get(id);

  if (!note) {
    return res.status(404).json({
      error: 'Nota no encontrada',
      correlationId: `mock-${Date.now()}`,
    });
  }

  // Simular resumen
  setTimeout(() => {
    const updatedNote = mockNotes.get(id);
    if (updatedNote) {
      updatedNote.status = 'ready';
      updatedNote.summary = 'Resumen simulado generado por IA: Puntos clave identificados y acciones extraídas.';
      updatedNote.keyPoints = [
        'Punto clave 1 identificado por IA',
        'Punto clave 2 identificado por IA',
        'Punto clave 3 identificado por IA'
      ];
      updatedNote.actions = [
        {
          id: `action-${Date.now()}`,
          text: 'Acción simulada generada por IA',
          completed: false,
          suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `action-${Date.now() + 1}`,
          text: 'Segunda acción simulada',
          completed: false,
          suggestedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      mockNotes.set(id, updatedNote);
    }
  }, 2500);

  res.json({
    data: note,
    message: 'Generación de resumen iniciada',
    correlationId: `mock-${Date.now()}`,
  });
});

// Mock endpoints para proveedores externos
app.post('/mock/stt/transcribe', (req, res) => {
  console.log('🎤 Mock STT: Simulando transcripción de audio');
  
  setTimeout(() => {
    res.json({
      text: 'Esta es una transcripción simulada del audio proporcionado.',
      confidence: 0.95,
      language: 'es',
      duration: 120.5,
    });
  }, 2000);
});

app.post('/mock/llm/summarize', (req, res) => {
  console.log('🤖 Mock LLM: Simulando generación de resumen');
  
  setTimeout(() => {
    res.json({
      summary: 'Resumen simulado del texto proporcionado.',
      keyPoints: [
        'Primer punto clave',
        'Segundo punto importante', 
        'Tercera observación relevante'
      ],
      actions: [
        {
          text: 'Primera acción sugerida',
          priority: 'high',
          estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          text: 'Segunda acción recomendada',
          priority: 'medium',
          estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
    });
  }, 1500);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Mock server error:', err);
  res.status(500).json({
    error: 'Error interno del mock server',
    correlationId: `mock-${Date.now()}`,
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Mock Server iniciado en http://localhost:${port}`);
  console.log('📝 Endpoints disponibles:');
  console.log('  GET /health - Health check');
  console.log('  POST /auth/login - Login (test@example.com / password123)');
  console.log('  POST /auth/register - Registro');
  console.log('  GET /auth/verify - Verificar token');
  console.log('  GET /notes - Listar notas');
  console.log('  POST /notes - Crear nota (con archivo)');
  console.log('  GET /notes/:id - Obtener nota');
  console.log('  POST /notes/:id/transcribe - Transcribir');
  console.log('  POST /notes/:id/summarize - Resumir');
  console.log('  POST /mock/stt/transcribe - Mock STT');
  console.log('  POST /mock/llm/summarize - Mock LLM');
});