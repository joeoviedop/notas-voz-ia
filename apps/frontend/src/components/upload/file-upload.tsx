'use client';

import { useCallback, useState } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUploadStart: () => void;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: () => void;
  onUploadError: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  isUploading?: boolean;
  progress?: number;
  error?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  accept = 'audio/*',
  maxSize = 50 * 1024 * 1024, // 50MB default
  isUploading = false,
  progress = 0,
  error,
  disabled = false,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `El archivo es muy grande. Tamaño máximo: ${formatFileSize(maxSize)}`;
    }

    // Check file type
    if (accept && !accept.includes('*')) {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      
      if (!acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'));
        }
        return fileType === type;
      })) {
        return `Formato de archivo no soportado. Formatos aceptados: ${accept}`;
      }
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      onUploadError(error);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect, onUploadError, maxSize, accept]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const clearFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-all duration-200',
          {
            'border-blue-300 bg-blue-50': dragOver && !disabled,
            'border-gray-300 hover:border-gray-400': !dragOver && !disabled && !error,
            'border-red-300 bg-red-50': error,
            'border-gray-200 bg-gray-50 cursor-not-allowed': disabled,
            'border-green-300 bg-green-50': selectedFile && !error && !isUploading,
          }
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Seleccionar archivo de audio"
        />

        <div className="text-center">
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <Upload className="mx-auto h-12 w-12 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Subiendo archivo...
                </p>
                <p className="text-xs text-gray-600">
                  {progress}% completado
                </p>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="space-y-3">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Archivo seleccionado
                </p>
                <p className="text-xs text-gray-600">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Error al seleccionar archivo
                </p>
                <p className="text-xs text-red-600">
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className={cn(
                'mx-auto h-12 w-12',
                disabled ? 'text-gray-400' : 'text-gray-600'
              )} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {disabled ? 'Upload deshabilitado' : 'Arrastra un archivo aquí o haz clic'}
                </p>
                <p className="text-xs text-gray-600">
                  {accept === 'audio/*' ? 'Archivos de audio' : accept} • Max {formatFileSize(maxSize)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Clear button */}
        {selectedFile && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="absolute top-2 right-2 p-1 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Limpiar archivo seleccionado"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* File Details */}
      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <File className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>{selectedFile.type || 'Tipo desconocido'}</span>
                <span>
                  Modificado: {new Date(selectedFile.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}