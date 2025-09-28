import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'react-hot-toast';
import { ApiError, type Note, type CreateNoteRequest, type UpdateNoteRequest } from '@notas-voz/sdk';
import { getErrorInfo } from '@/lib/error-catalog';

// Keys para el cache de React Query
export const notesQueryKeys = {
  all: ['notes'] as const,
  lists: () => [...notesQueryKeys.all, 'list'] as const,
  list: (filters: { query?: string; tag?: string; cursor?: string }) =>
    [...notesQueryKeys.lists(), filters] as const,
  details: () => [...notesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...notesQueryKeys.details(), id] as const,
};

interface UseNotesOptions {
  query?: string;
  tag?: string;
  cursor?: string;
}

// Hook para listar notas con filtros
export function useNotes(options: UseNotesOptions = {}) {
  const { client, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notesQueryKeys.list(options),
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.listNotes(options);
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para obtener una nota específica
export function useNote(id: string) {
  const { client, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notesQueryKeys.detail(id),
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.getNote(id);
    },
    enabled: isAuthenticated && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para crear una nota
export function useCreateNote() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteRequest = {}) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.createNote(data);
    },
    onSuccess: (newNote: Note) => {
      // Invalidar la lista de notas para refrescar
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      // Añadir la nueva nota al cache
      queryClient.setQueryData(notesQueryKeys.detail(newNote.id), newNote);
      
      toast.success('Nota creada exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al crear la nota');
      }
    },
  });
}

// Hook para actualizar una nota
export function useUpdateNote() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, update }: { id: string; update: UpdateNoteRequest }) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.updateNote(id, update);
    },
    onSuccess: (updatedNote: Note) => {
      // Actualizar el cache de la nota específica
      queryClient.setQueryData(notesQueryKeys.detail(updatedNote.id), updatedNote);
      
      // Invalidar las listas para que se refresquen con los nuevos datos
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Nota actualizada exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al actualizar la nota');
      }
    },
  });
}

// Hook para eliminar una nota
export function useDeleteNote() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.deleteNote(id);
    },
    onSuccess: (_, deletedId) => {
      // Remover la nota del cache
      queryClient.removeQueries({ queryKey: notesQueryKeys.detail(deletedId) });
      
      // Invalidar las listas para que se refresquen
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Nota eliminada exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al eliminar la nota');
      }
    },
  });
}

// Hook para subir audio a una nota
export function useUploadAudio() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.uploadAudioToNote(id, file);
    },
    onSuccess: (_, { id }) => {
      // Invalidar la nota para que se refresque con el nuevo estado
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Audio subido exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al subir el audio');
      }
    },
  });
}

// Hook para transcribir una nota
export function useTranscribeNote() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.transcribeNote(id);
    },
    onSuccess: (updatedNote: Note) => {
      // Actualizar el cache
      queryClient.setQueryData(notesQueryKeys.detail(updatedNote.id), updatedNote);
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Transcripción iniciada');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al iniciar la transcripción');
      }
    },
  });
}

// Hook para generar resumen de una nota
export function useSummarizeNote() {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.summarizeNote(id);
    },
    onSuccess: (updatedNote: Note) => {
      // Actualizar el cache
      queryClient.setQueryData(notesQueryKeys.detail(updatedNote.id), updatedNote);
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Resumen generado exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        
        if (error.code === 'LLM_FAILURE') {
          // Para errores de LLM, mostrar acción de reintentar
          toast.error(errorInfo.message, {
            duration: 6000,
          });
        } else {
          toast.error(errorInfo.message);
        }
      } else {
        toast.error('Error al generar el resumen');
      }
    },
  });
}