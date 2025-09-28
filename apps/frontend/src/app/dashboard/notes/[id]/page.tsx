'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNote, useUpdateNote, useSummarizeNote } from '@/hooks/use-notes';
import { ActionsChecklist } from '@/components/notes/actions-checklist';
import { NoteStatusChip } from '@/components/notes/note-status-chip';
import { formatDate } from '@/lib/utils';
import { 
  ArrowLeft, 
  Edit2, 
  Save, 
  X, 
  RefreshCw, 
  FileText, 
  Brain, 
  Play, 
  Pause,
  Volume2,
  Download
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTranscript, setEditingTranscript] = useState('');

  const { data: note, isLoading, error } = useNote(noteId);
  const updateNote = useUpdateNote();
  const summarizeNote = useSummarizeNote();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando nota...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error al cargar la nota
          </h3>
          <p className="text-red-600 mb-4">
            {error?.message || 'La nota no se encontró'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get latest transcript and summary
  const latestTranscript = note.transcripts?.[note.transcripts.length - 1];
  const latestSummary = note.summaries?.[note.summaries.length - 1];

  // Get note status
  const getChipStatus = () => {
    if ('status' in note) {
      return note.status as 'draft' | 'uploaded' | 'transcribing' | 'ready' | 'error';
    }
    
    if (latestTranscript) {
      if (latestSummary) {
        return 'ready';
      }
      return 'transcribing';
    }
    
    if (note.mediaFiles && note.mediaFiles.length > 0) {
      return 'uploaded';
    }
    
    return 'draft';
  };

  const handleSaveTitle = async () => {
    if (!editingTitle.trim()) return;

    try {
      await updateNote.mutateAsync({
        id: noteId,
        update: {
          title: editingTitle.trim(),
        },
      });
      setIsEditingTitle(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSaveTranscript = async () => {
    if (!editingTranscript.trim()) return;
    
    // Note: This would require a specific endpoint to update transcript
    // For now, we'll update the note description as a workaround
    try {
      await updateNote.mutateAsync({
        id: noteId,
        update: {
          description: editingTranscript.trim(),
        },
      });
      setIsEditingTranscript(false);
      toast.success('Contenido actualizado');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleRegenerateSummary = async () => {
    try {
      await summarizeNote.mutateAsync(noteId);
    } catch (error) {
      // Error handled by hook
    }
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setEditingTitle(note.title || 'Nota sin título');
  };

  const startEditingTranscript = () => {
    setIsEditingTranscript(true);
    setEditingTranscript(latestTranscript?.text || note.description || '');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                    }
                  }}
                  className="flex-1 text-2xl font-bold border-0 border-b-2 border-blue-500 bg-transparent focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={updateNote.isPending}
                  className="p-1 text-green-600 hover:text-green-700"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-gray-600 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {note.title || 'Nota sin título'}
                </h1>
                <button
                  onClick={startEditingTitle}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Editar título"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <NoteStatusChip status={getChipStatus()} />
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            Creada: {formatDate(note.createdAt)}
            {note.updatedAt !== note.createdAt && (
              <span> • Actualizada: {formatDate(note.updatedAt)}</span>
            )}
          </p>
        </div>
      </div>

      {/* Audio Player */}
      {note.mediaFiles && note.mediaFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <button className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
              <Play className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              0:45 / 3:20
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <Volume2 className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transcript */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Transcripción</h2>
              </div>
              
              {!isEditingTranscript && (
                <button
                  onClick={startEditingTranscript}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </button>
              )}
            </div>

            {isEditingTranscript ? (
              <div className="space-y-3">
                <textarea
                  value={editingTranscript}
                  onChange={(e) => setEditingTranscript(e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Edita el contenido de la transcripción..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTranscript}
                    disabled={updateNote.isPending}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" />
                    Guardar cambios
                  </button>
                  <button
                    onClick={() => setIsEditingTranscript(false)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose max-w-none">
                {latestTranscript?.text || note.description ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {latestTranscript?.text || note.description}
                  </p>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay transcripción disponible aún</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
              </div>
              
              <button
                onClick={handleRegenerateSummary}
                disabled={summarizeNote.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${summarizeNote.isPending ? 'animate-spin' : ''}`} />
                {summarizeNote.isPending ? 'Generando...' : 'Regenerar'}
              </button>
            </div>

            {latestSummary ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">TL;DR</h3>
                  <p className="text-blue-800">
                    {latestSummary.tldr || 'Sin resumen ejecutivo'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Puntos clave</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {latestSummary.content}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="mb-4">No hay resumen disponible aún</p>
                {latestTranscript && (
                  <button
                    onClick={handleRegenerateSummary}
                    disabled={summarizeNote.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Brain className="h-4 w-4" />
                    {summarizeNote.isPending ? 'Generando resumen...' : 'Generar resumen'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Checklist */}
          <ActionsChecklist 
            noteId={noteId} 
            actions={note.actions || []} 
            isEditable={true}
          />

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <NoteStatusChip status={getChipStatus()} className="text-xs" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Archivos de audio:</span>
                <span className="font-medium">{note.mediaFiles?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transcripciones:</span>
                <span className="font-medium">{note.transcripts?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resúmenes:</span>
                <span className="font-medium">{note.summaries?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Acciones:</span>
                <span className="font-medium">{note.actions?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}