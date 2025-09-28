'use client';

import { useState, useMemo } from 'react';
import { useNotes } from '@/hooks/use-notes';
import { NoteCard } from '@/components/notes/note-card';
import { NotesSearch } from '@/components/notes/notes-search';
import { Loader2, FileText, Search } from 'lucide-react';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  // Query para obtener notas con filtros
  const {
    data: notesResponse,
    isLoading,
    error,
    isError
  } = useNotes({
    query: searchQuery,
    tag: selectedTag,
  });

  // Extraer notas de la respuesta de paginación
  const notes = notesResponse?.data || [];

  // Extraer tags únicos de todas las notas
  const availableTags = useMemo(() => {
    const allTags = notes.flatMap(note => note.tags || []);
    return [...new Set(allTags)].sort();
  }, [notes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando tus notas...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error al cargar las notas
          </h3>
          <p className="text-red-600">
            {error?.message || 'Ocurrió un error inesperado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Notas</h1>
        <p className="text-gray-600 mt-1">
          Gestiona tus grabaciones de voz, transcripciones y resúmenes
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <NotesSearch
          onSearch={setSearchQuery}
          onTagFilter={setSelectedTag}
          selectedTag={selectedTag}
          availableTags={availableTags}
          placeholder="Buscar en transcripciones, títulos y resúmenes..."
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Total de notas
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {notes.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Search className="h-5 w-5 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Transcripciones
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {notes.filter(note => note.transcripts && note.transcripts.length > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Con resumen
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {notes.filter(note => note.summaries && note.summaries.length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || selectedTag ? 'No se encontraron notas' : 'No tienes notas aún'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedTag
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primera nota de voz'
              }
            </p>
            {!searchQuery && !selectedTag && (
              <button
                onClick={() => window.location.href = '/dashboard/notes/new'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear primera nota
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {notesResponse?.hasMore && (
        <div className="text-center py-6">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cargar más notas
          </button>
        </div>
      )}
    </div>
  );
}