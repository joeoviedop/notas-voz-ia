import type {
  Note,
  User,
  LoginRequest,
  RegisterRequest,
  ResetRequest,
  ResetConfirmRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateActionRequest,
  UpdateActionRequest,
  NotesListResponse,
  NoteResponse,
  AuthResponse,
  TokenResponse,
  ActionResponse,
  UploadResponse,
  ApiError as ApiErrorType,
  ErrorCode,
  CursorPagination,
} from '@notas-voz/schemas';

// ==============================================
// CLIENT CONFIGURATION
// ==============================================

export interface ApiClientConfig {
  baseUrl: string;
  accessToken?: string;
  timeout?: number;
  withCredentials?: boolean;
}

export interface PaginationOptions {
  cursor?: string;
  query?: string;
  tag?: string;
}

// ==============================================
// MAIN API CLIENT
// ==============================================

export class NotasVozApiClient {
  private baseUrl: string;
  private accessToken?: string;
  private timeout: number;
  private withCredentials: boolean;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.accessToken = config.accessToken;
    this.timeout = config.timeout || 30000;
    this.withCredentials = config.withCredentials ?? true;
  }

  // ==============================================
  // AUTH ENDPOINTS
  // ==============================================

  async registerUser(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials: LoginRequest): Promise<TokenResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(): Promise<TokenResponse> {
    return this.request('/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Para enviar cookies
    });
  }

  async logoutUser(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  }

  async requestPasswordReset(data: ResetRequest): Promise<{ message: string }> {
    return this.request('/auth/reset/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmPasswordReset(data: ResetConfirmRequest): Promise<{ message: string }> {
    return this.request('/auth/reset/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==============================================
  // NOTES ENDPOINTS
  // ==============================================

  async listNotes(options: PaginationOptions = {}): Promise<CursorPagination> {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.query) params.append('query', options.query);
    if (options.tag) params.append('tag', options.tag);
    
    const queryString = params.toString();
    const url = queryString ? `/notes?${queryString}` : '/notes';
    
    return this.request(url, {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  async createNote(data: CreateNoteRequest = {}): Promise<Note> {
    return this.request('/notes', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
  }

  async getNote(id: string): Promise<Note> {
    return this.request(`/notes/${id}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  async updateNote(id: string, update: UpdateNoteRequest): Promise<Note> {
    return this.request(`/notes/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(update),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request(`/notes/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
  }

  async uploadAudioToNote(id: string, audioFile: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return this.request(`/notes/${id}/upload`, {
      method: 'POST',
      headers: this.authHeadersNoContentType(),
      body: formData,
    });
  }

  // ==============================================
  // PROCESSING ENDPOINTS
  // ==============================================

  async transcribeNote(id: string): Promise<Note> {
    return this.request(`/notes/${id}/transcribe`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  }

  async summarizeNote(id: string): Promise<Note> {
    return this.request(`/notes/${id}/summarize`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  }

  // ==============================================
  // ACTIONS ENDPOINTS
  // ==============================================

  async createAction(noteId: string, data: CreateActionRequest): Promise<ActionResponse> {
    return this.request(`/notes/${noteId}/actions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
  }

  async updateAction(actionId: string, update: UpdateActionRequest): Promise<ActionResponse> {
    return this.request(`/actions/${actionId}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(update),
    });
  }

  async deleteAction(actionId: string): Promise<void> {
    await this.request(`/actions/${actionId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health', {
      method: 'GET',
    });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  clearAccessToken() {
    this.accessToken = undefined;
  }

  // ==============================================
  // PRIVATE UTILITIES
  // ==============================================

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private authHeadersNoContentType(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private async request(endpoint: string, init: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestInit: RequestInit = {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      credentials: this.withCredentials ? 'include' : 'same-origin',
    };

    // Add timeout if supported
    if (typeof AbortSignal.timeout === 'function') {
      requestInit.signal = AbortSignal.timeout(this.timeout);
    }

    const response = await fetch(url, requestInit);

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: {
          code: 'INTERNAL_ERROR',
          message: response.statusText || 'Unknown error'
        }
      })) as ApiErrorType;
      
      throw new ApiError(
        response.status,
        errorData.error.code,
        errorData.error.message
      );
    }

    return response.json();
  }
}

// ==============================================
// ERROR CLASS
// ==============================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isNetworkError(): boolean {
    return this.status === 0 || this.status >= 500;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isAuthError(): boolean {
    return this.status === 401 || this.code === 'AUTH_TOKEN_EXPIRED' || this.code === 'AUTH_INVALID_CREDENTIALS';
  }

  isRateLimitError(): boolean {
    return this.status === 429 || this.code === 'RATE_LIMITED';
  }
}

// ==============================================
// FACTORY FUNCTION
// ==============================================

export const createApiClient = (config: ApiClientConfig): NotasVozApiClient => {
  return new NotasVozApiClient(config);
};

// ==============================================
// TYPE EXPORTS
// ==============================================

export type {
  Note,
  User,
  LoginRequest,
  RegisterRequest,
  ResetRequest,
  ResetConfirmRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateActionRequest,
  UpdateActionRequest,
  NotesListResponse,
  NoteResponse,
  AuthResponse,
  TokenResponse,
  ActionResponse,
  UploadResponse,
  ApiErrorType,
  ErrorCode,
  CursorPagination,
  ApiClientConfig,
  PaginationOptions,
};
