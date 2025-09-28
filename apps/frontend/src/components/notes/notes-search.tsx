'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { debounce } from '@/lib/utils';

interface NotesSearchProps {
  onSearch: (query: string) => void;
  onTagFilter: (tag: string | undefined) => void;
  selectedTag?: string;
  availableTags?: string[];
  placeholder?: string;
}

export function NotesSearch({
  onSearch,
  onTagFilter,
  selectedTag,
  availableTags = [],
  placeholder = "Buscar en notas..."
}: NotesSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  // Effect para ejecutar la búsqueda cuando cambia el query
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const selectTag = (tag: string | undefined) => {
    onTagFilter(tag);
    setShowTagFilter(false);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          aria-label="Buscar notas"
        />
        
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <Filter className="h-3 w-3" />
            Filtros
            {selectedTag && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                1
              </span>
            )}
          </button>

          {/* Selected tag display */}
          {selectedTag && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">Tag:</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {selectedTag}
                <button
                  onClick={() => selectTag(undefined)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  aria-label={`Remover filtro ${selectedTag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tag Filter Dropdown */}
      {showTagFilter && availableTags.length > 0 && (
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
            <div className="max-h-60 overflow-y-auto">
              <button
                onClick={() => selectTag(undefined)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  !selectedTag ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                Todos los tags
              </button>
              
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => selectTag(tag)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    selectedTag === tag ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    {tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-sm text-gray-600" aria-live="polite">
          Buscando: <span className="font-medium">"{searchQuery}"</span>
          {selectedTag && (
            <span> en tag <span className="font-medium">"{selectedTag}"</span></span>
          )}
        </div>
      )}
    </div>
  );
}