import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { NoteStatusChip } from './note-status-chip';
import { MoreVertical, Play, Pause, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { type Note } from '@notas-voz/sdk';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Mapear el status del SDK al tipo esperado por el chip
  const getChipStatus = (note: Note) => {
    // Asumiendo que la nota tiene un campo status
    // que puede ser uno de los valores esperados
    if ('status' in note) {
      return note.status as 'draft' | 'uploaded' | 'transcribing' | 'ready' | 'error';
    }
    
    // Lógica de fallback basada en los campos disponibles
    if (note.transcripts && note.transcripts.length > 0) {
      if (note.summaries && note.summaries.length > 0) {
        return 'ready';
      }
      return 'transcribing';
    }
    
    if (note.mediaFiles && note.mediaFiles.length > 0) {
      return 'uploaded';
    }
    
    return 'draft';
  };

  const chipStatus = getChipStatus(note);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlaying(!isPlaying);
    // TODO: Implement audio playback logic
  };

  const getPreviewText = () => {
    // Mostrar preview del transcript si existe
    if (note.transcripts && note.transcripts.length > 0) {
      const latestTranscript = note.transcripts[note.transcripts.length - 1];
      return latestTranscript.text?.substring(0, 150) + '...';
    }
    
    // Mostrar preview del resumen si existe
    if (note.summaries && note.summaries.length > 0) {
      const latestSummary = note.summaries[note.summaries.length - 1];
      return latestSummary.content?.substring(0, 150) + '...';
    }
    
    return 'Sin contenido transcrito aún';
  };

  const getActionCount = () => {
    return note.actions?.length || 0;
  };

  const getCompletedActions = () => {
    return note.actions?.filter(action => action.done).length || 0;
  };

  return (
    <Link href={`/dashboard/notes/${note.id}`}>
      <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {note.title || 'Nota sin título'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(note.createdAt)}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-3">
            <NoteStatusChip status={chipStatus} />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Show note options menu
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
              aria-label="Opciones de nota"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content preview */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 line-clamp-3">
            {getPreviewText()}
          </p>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {/* Audio playback button */}
            {note.mediaFiles && note.mediaFiles.length > 0 && (
              <button
                onClick={togglePlay}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                <Volume2 className="h-3 w-3" />
              </button>
            )}
            
            {/* Duration */}
            {note.mediaFiles && note.mediaFiles.length > 0 && (
              <span>
                {/* TODO: Show actual duration from media file */}
                2:30
              </span>
            )}
          </div>

          {/* Actions count */}
          {getActionCount() > 0 && (
            <div className="flex items-center gap-1">
              <span>
                {getCompletedActions()}/{getActionCount()} acciones
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}