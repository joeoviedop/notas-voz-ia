import type {
  Note,
  User,
  LoginRequest,
  RegisterRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  UpdateActionRequest,
  NotesListResponse,
  NoteResponse,
  AuthResponse,
  ApiResponse,
} from '@notas-voz/schemas';

// Configuración del cliente
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

// Cliente API placeholder (será reemplazado por generación OpenAPI)
export class NotasVozApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyToken(): Promise<ApiResponse> {
    return this.request('/auth/verify', {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  // Notes endpoints
  async getNotes(): Promise<NotesListResponse> {
    return this.request('/notes', {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  async getNote(id: string): Promise<NoteResponse> {
    return this.request(`/notes/${id}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  async createNote(file: File, metadata?: CreateNoteRequest): Promise<NoteResponse> {
    const formData = new FormData();
    formData.append('audio', file);
    
    if (metadata?.title) {
      formData.append('title', metadata.title);
    }
    
    if (metadata?.tags) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }

    return this.request('/notes', {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        // No incluir Content-Type para FormData
      },
      body: formData,
    });
  }

  async updateNote(id: string, update: UpdateNoteRequest): Promise<NoteResponse> {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(update),
    });
  }

  async transcribeNote(id: string): Promise<NoteResponse> {
    return this.request(`/notes/${id}/transcribe`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  }

  async summarizeNote(id: string): Promise<NoteResponse> {
    return this.request(`/notes/${id}/summarize`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  }

  async updateAction(noteId: string, actionId: string, update: UpdateActionRequest): Promise<NoteResponse> {
    return this.request(`/notes/${noteId}/actions/${actionId}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(update),
    });
  }

  // Utilidades privadas
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async request(endpoint: string, init: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || response.statusText,
        errorData.correlationId
      );
    }

    return response.json();
  }
}

// Error personalizado para la API
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public correlationId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Factory function para crear cliente
export const createApiClient = (config: ApiClientConfig): NotasVozApiClient => {
  return new NotasVozApiClient(config);
};

// Exportar tipos para conveniencia
export type {
  Note,
  User,
  LoginRequest,
  RegisterRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  UpdateActionRequest,
  NotesListResponse,
  NoteResponse,
  AuthResponse,
  ApiResponse,
};