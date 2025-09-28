import { type ErrorCode } from '@notas-voz/sdk';

export interface ErrorInfo {
  title: string;
  message: string;
  canRetry: boolean;
  retryable: boolean;
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorInfo> = {
  // Auth Errors
  AUTH_INVALID_CREDENTIALS: {
    title: 'Credenciales incorrectas',
    message: 'El email o la contraseña son incorrectos. Por favor, verifica tus datos.',
    canRetry: false,
    retryable: false,
  },
  AUTH_TOKEN_EXPIRED: {
    title: 'Sesión expirada',
    message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    canRetry: false,
    retryable: false,
  },
  AUTH_TOKEN_INVALID: {
    title: 'Token inválido',
    message: 'Tu sesión es inválida. Por favor, inicia sesión nuevamente.',
    canRetry: false,
    retryable: false,
  },
  AUTH_USER_NOT_FOUND: {
    title: 'Usuario no encontrado',
    message: 'No se encontró un usuario con esas credenciales.',
    canRetry: false,
    retryable: false,
  },
  AUTH_EMAIL_EXISTS: {
    title: 'Email ya registrado',
    message: 'Ya existe una cuenta con este email. Intenta iniciar sesión o usa otro email.',
    canRetry: false,
    retryable: false,
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    title: 'Email no verificado',
    message: 'Necesitas verificar tu email antes de continuar. Revisa tu bandeja de entrada.',
    canRetry: false,
    retryable: false,
  },

  // Validation Errors
  VALIDATION_ERROR: {
    title: 'Datos inválidos',
    message: 'Algunos campos contienen información incorrecta. Por favor, revísalos.',
    canRetry: false,
    retryable: false,
  },
  INVALID_REQUEST: {
    title: 'Solicitud inválida',
    message: 'La solicitud contiene errores. Por favor, verifica los datos enviados.',
    canRetry: false,
    retryable: false,
  },

  // File Upload Errors
  FILE_TOO_LARGE: {
    title: 'Archivo muy grande',
    message: 'El archivo es demasiado grande. El tamaño máximo permitido es 50MB.',
    canRetry: false,
    retryable: false,
  },
  UNSUPPORTED_MEDIA_TYPE: {
    title: 'Formato no soportado',
    message: 'Este formato de audio no es compatible. Usa MP3, WAV, M4A o similar.',
    canRetry: false,
    retryable: false,
  },
  UPLOAD_FAILED: {
    title: 'Error de subida',
    message: 'No se pudo subir el archivo. Verifica tu conexión e intenta nuevamente.',
    canRetry: true,
    retryable: true,
  },

  // Processing Errors
  STT_FAILURE: {
    title: 'Error de transcripción',
    message: 'No se pudo transcribir el audio. El archivo podría estar dañado o en un formato no compatible.',
    canRetry: true,
    retryable: true,
  },
  LLM_FAILURE: {
    title: 'Error de procesamiento',
    message: 'No se pudo generar el resumen. Intenta nuevamente en unos momentos.',
    canRetry: true,
    retryable: true,
  },
  PROCESSING_TIMEOUT: {
    title: 'Tiempo de espera agotado',
    message: 'El procesamiento está tardando más de lo usual. Intenta nuevamente más tarde.',
    canRetry: true,
    retryable: true,
  },

  // Resource Errors
  RESOURCE_NOT_FOUND: {
    title: 'Recurso no encontrado',
    message: 'El recurso solicitado no existe o ya no está disponible.',
    canRetry: false,
    retryable: false,
  },
  RESOURCE_CONFLICT: {
    title: 'Conflicto de recursos',
    message: 'El recurso está siendo modificado por otro proceso. Intenta nuevamente.',
    canRetry: true,
    retryable: true,
  },
  RESOURCE_LOCKED: {
    title: 'Recurso bloqueado',
    message: 'Este recurso está siendo procesado. Espera unos momentos e intenta nuevamente.',
    canRetry: true,
    retryable: true,
  },

  // Rate Limiting
  RATE_LIMITED: {
    title: 'Demasiadas solicitudes',
    message: 'Has realizado demasiadas solicitudes. Espera unos minutos antes de intentar nuevamente.',
    canRetry: true,
    retryable: true,
  },

  // Server Errors
  INTERNAL_ERROR: {
    title: 'Error interno',
    message: 'Ocurrió un error interno del servidor. Intenta nuevamente más tarde.',
    canRetry: true,
    retryable: true,
  },
  SERVICE_UNAVAILABLE: {
    title: 'Servicio no disponible',
    message: 'El servicio está temporalmente no disponible. Intenta nuevamente más tarde.',
    canRetry: true,
    retryable: true,
  },
  DATABASE_ERROR: {
    title: 'Error de base de datos',
    message: 'Error al acceder a los datos. Intenta nuevamente en unos momentos.',
    canRetry: true,
    retryable: true,
  },
  EXTERNAL_SERVICE_ERROR: {
    title: 'Error de servicio externo',
    message: 'Un servicio externo está fallando. Intenta nuevamente más tarde.',
    canRetry: true,
    retryable: true,
  },

  // Generic/Fallback
  UNKNOWN_ERROR: {
    title: 'Error desconocido',
    message: 'Ocurrió un error inesperado. Si el problema persiste, contacta con soporte.',
    canRetry: true,
    retryable: true,
  },
};

export function getErrorInfo(errorCode: ErrorCode): ErrorInfo {
  return ERROR_CATALOG[errorCode] || ERROR_CATALOG.UNKNOWN_ERROR;
}

export function isRetryableError(errorCode: ErrorCode): boolean {
  return getErrorInfo(errorCode).retryable;
}