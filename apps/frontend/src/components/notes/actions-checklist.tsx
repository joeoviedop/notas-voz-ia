'use client';

import { useState } from 'react';
import { Plus, Check, X, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { useCreateAction, useUpdateAction, useDeleteAction } from '@/hooks/use-actions';
import { formatDate } from '@/lib/utils';

interface Action {
  id: string;
  description: string;
  done: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionsChecklistProps {
  noteId: string;
  actions: Action[];
  isEditable?: boolean;
}

export function ActionsChecklist({ noteId, actions, isEditable = true }: ActionsChecklistProps) {
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [editActionText, setEditActionText] = useState('');

  const createAction = useCreateAction(noteId);
  const updateAction = useUpdateAction(noteId);
  const deleteAction = useDeleteAction(noteId);

  const completedActions = actions.filter(action => action.done).length;
  const totalActions = actions.length;
  const completionPercentage = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  const handleAddAction = async () => {
    if (!newActionText.trim()) return;

    try {
      await createAction.mutateAsync({
        description: newActionText.trim(),
      });
      setNewActionText('');
      setIsAddingAction(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleToggleAction = async (action: Action) => {
    try {
      await updateAction.mutateAsync({
        actionId: action.id,
        update: {
          done: !action.done,
        },
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleEditAction = async (actionId: string) => {
    if (!editActionText.trim()) return;

    try {
      await updateAction.mutateAsync({
        actionId,
        update: {
          description: editActionText.trim(),
        },
      });
      setEditingAction(null);
      setEditActionText('');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta acción?')) {
      try {
        await deleteAction.mutateAsync(actionId);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  const startEditing = (action: Action) => {
    setEditingAction(action.id);
    setEditActionText(action.description);
  };

  const cancelEditing = () => {
    setEditingAction(null);
    setEditActionText('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Acciones</h3>
          <p className="text-sm text-gray-600">
            {completedActions} de {totalActions} completadas
          </p>
        </div>
        
        {totalActions > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(completionPercentage)}%
            </div>
            <div className="w-20 h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-green-600 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => (
          <div 
            key={action.id} 
            className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              action.done 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggleAction(action)}
              disabled={!isEditable || updateAction.isPending}
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 transition-all focus:ring-2 focus:ring-blue-500 ${
                action.done
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              } ${!isEditable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              aria-label={action.done ? 'Marcar como pendiente' : 'Marcar como completada'}
            >
              {action.done && <Check className="h-3 w-3" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {editingAction === action.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editActionText}
                    onChange={(e) => setEditActionText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEditAction(action.id);
                      } else if (e.key === 'Escape') {
                        cancelEditing();
                      }
                    }}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción de la acción..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditAction(action.id)}
                      disabled={updateAction.isPending || !editActionText.trim()}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      Guardar
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p 
                    className={`text-sm ${
                      action.done 
                        ? 'line-through text-gray-600' 
                        : 'text-gray-900'
                    }`}
                  >
                    {action.description}
                  </p>
                  
                  {action.dueDate && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Vence: {formatDate(action.dueDate)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {isEditable && editingAction !== action.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(action)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Editar acción"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteAction(action.id)}
                  disabled={deleteAction.isPending}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  aria-label="Eliminar acción"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add new action */}
        {isEditable && (
          <div>
            {isAddingAction ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAction();
                    } else if (e.key === 'Escape') {
                      setIsAddingAction(false);
                      setNewActionText('');
                    }
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Descripción de la nueva acción..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAction}
                    disabled={createAction.isPending || !newActionText.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir acción
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingAction(false);
                      setNewActionText('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingAction(true)}
                className="flex items-center gap-2 w-full p-3 text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Añadir nueva acción
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {actions.length === 0 && !isAddingAction && (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-4">
            No hay acciones definidas para esta nota
          </p>
          {isEditable && (
            <button
              onClick={() => setIsAddingAction(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir primera acción
            </button>
          )}
        </div>
      )}
    </div>
  );
}