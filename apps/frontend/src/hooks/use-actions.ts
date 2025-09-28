import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'react-hot-toast';
import { ApiError, type CreateActionRequest, type UpdateActionRequest } from '@notas-voz/sdk';
import { getErrorInfo } from '@/lib/error-catalog';
import { notesQueryKeys } from './use-notes';

// Hook para crear una acción
export function useCreateAction(noteId: string) {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActionRequest) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.createAction(noteId, data);
    },
    onSuccess: () => {
      // Invalidar la nota para que se refresque con las nuevas acciones
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Acción añadida exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al crear la acción');
      }
    },
  });
}

// Hook para actualizar una acción
export function useUpdateAction(noteId: string) {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionId, update }: { actionId: string; update: UpdateActionRequest }) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.updateAction(actionId, update);
    },
    onSuccess: () => {
      // Invalidar la nota para que se refresque
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Acción actualizada exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al actualizar la acción');
      }
    },
  });
}

// Hook para eliminar una acción
export function useDeleteAction(noteId: string) {
  const { client, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      if (!isAuthenticated) {
        throw new Error('No authenticated');
      }
      return client.deleteAction(actionId);
    },
    onSuccess: () => {
      // Invalidar la nota para que se refresque
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      
      toast.success('Acción eliminada exitosamente');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const errorInfo = getErrorInfo(error.code);
        toast.error(errorInfo.message);
      } else {
        toast.error('Error al eliminar la acción');
      }
    },
  });
}