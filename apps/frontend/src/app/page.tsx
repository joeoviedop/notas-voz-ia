'use client';

import { useState } from 'react';

type AudioStatus = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'ready' | 'error';

export default function Home() {
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const simulateProcess = () => {
    if (!file) return;

    setStatus('uploading');
    setTimeout(() => {
      setStatus('transcribing');
      setTimeout(() => {
        setStatus('summarizing');
        setTimeout(() => {
          setStatus('ready');
        }, 2000);
      }, 1500);
    }, 1000);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Selecciona un archivo de audio';
      case 'uploading':
        return 'Subiendo archivo...';
      case 'transcribing':
        return 'Transcribiendo audio...';
      case 'summarizing':
        return 'Generando resumen y acciones...';
      case 'ready':
        return '¡Listo! Transcript, resumen y acciones disponibles';
      case 'error':
        return 'Error procesando el archivo';
      default:
        return '';
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          📝 Notas de Voz con IA
        </h1>
        <p className="text-gray-600 text-lg">
          Convierte tus audios en transcripciones, resúmenes y listas de acciones
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Subir Audio</h2>
        
        <div className="mb-4">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p><strong>Archivo:</strong> {file.name}</p>
            <p><strong>Tamaño:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <button
          onClick={simulateProcess}
          disabled={!file || status !== 'idle'}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'idle' ? 'Procesar Audio' : 'Procesando...'}
        </button>

        {status !== 'idle' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              {status !== 'ready' && status !== 'error' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              )}
              <span className={status === 'ready' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-blue-600'}>
                {getStatusMessage()}
              </span>
            </div>
          </div>
        )}
      </div>

      {status === 'ready' && (
        <div className="space-y-6">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">📄 Transcripción</h3>
            <div className="bg-gray-50 p-4 rounded max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-700">
                Esta es una transcripción simulada del audio subido. En la implementación real, 
                aquí aparecería el texto convertido desde el archivo de audio usando tecnología 
                de speech-to-text como OpenAI Whisper.
              </p>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">📋 Resumen</h3>
            <div className="bg-blue-50 p-4 rounded">
              <h4 className="font-medium mb-2">TL;DR:</h4>
              <p className="text-sm mb-3">Reunión sobre planificación de proyecto con 3 acciones clave identificadas.</p>
              
              <h4 className="font-medium mb-2">Puntos Clave:</h4>
              <ul className="text-sm space-y-1">
                <li>• Definición de alcance del MVP</li>
                <li>• Asignación de responsabilidades del equipo</li>
                <li>• Establecimiento de fechas límite</li>
              </ul>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">✅ Acciones</h3>
            <div className="space-y-3">
              <div className="flex items-start p-3 bg-yellow-50 rounded">
                <input type="checkbox" className="mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Preparar documentación técnica</p>
                  <p className="text-xs text-gray-600">Fecha sugerida: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-start p-3 bg-yellow-50 rounded">
                <input type="checkbox" className="mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Revisar presupuesto del proyecto</p>
                  <p className="text-xs text-gray-600">Fecha sugerida: {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-start p-3 bg-yellow-50 rounded">
                <input type="checkbox" className="mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Coordinar próxima reunión de equipo</p>
                  <p className="text-xs text-gray-600">Fecha sugerida: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>🚀 Monorepo configurado exitosamente</p>
        <p>Frontend funcionando en puerto 3000 | Backend en puerto 4000</p>
      </div>
    </main>
  );
}