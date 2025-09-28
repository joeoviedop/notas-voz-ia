'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateNote, useUploadAudio, useTranscribeNote } from '@/hooks/use-notes';
import { FileUpload } from '@/components/upload/file-upload';
import { AudioRecorder } from '@/components/upload/audio-recorder';
import { ArrowLeft, Upload, Mic, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

type UploadMethod = 'file' | 'recording';
type Step = 'method' | 'upload' | 'processing';

export default function NewNotePage() {
  const router = useRouter();
  const [method, setMethod] = useState<UploadMethod>('file');
  const [step, setStep] = useState<Step>('method');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  const createNote = useCreateNote();
  const uploadAudio = useUploadAudio();
  const transcribeNote = useTranscribeNote();

  const handleMethodSelect = (selectedMethod: UploadMethod) => {
    setMethod(selectedMethod);
    setStep('upload');
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    
    // Auto-generate title from filename
    if (!noteTitle) {
      const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setNoteTitle(name);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    // Convert blob to File
    const file = new File([audioBlob], `grabacion-${Date.now()}.webm`, {
      type: 'audio/webm',
    });
    
    setSelectedFile(file);
    setUploadError(null);
    
    // Auto-generate title if empty
    if (!noteTitle) {
      const now = new Date();
      const title = `Grabación ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      setNoteTitle(title);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setStep('processing');
      setUploadError(null);

      // Create note first
      toast.loading('Creando nota...', { id: 'upload-process' });
      const note = await createNote.mutateAsync({
        title: noteTitle || 'Nueva nota',
        description: `Nota con archivo de audio: ${selectedFile.name}`,
      });

      setCreatedNoteId(note.id);

      // Upload audio file
      toast.loading('Subiendo archivo...', { id: 'upload-process' });
      
      // Simulate upload progress (since the SDK doesn't support progress tracking yet)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await uploadAudio.mutateAsync({
        id: note.id,
        file: selectedFile,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Start transcription
      toast.loading('Iniciando transcripción...', { id: 'upload-process' });
      await transcribeNote.mutateAsync(note.id);

      toast.success('¡Audio subido y transcripción iniciada!', { id: 'upload-process' });
      
      // Redirect to note detail
      router.push(`/dashboard/notes/${note.id}`);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Error al subir el archivo. Intenta nuevamente.');
      toast.error('Error al procesar el audio', { id: 'upload-process' });
      setIsUploading(false);
      setStep('upload');
    }
  };

  const goBack = () => {
    if (step === 'upload') {
      setStep('method');
    } else {
      router.push('/dashboard');
    }
  };

  const canUpload = selectedFile && noteTitle.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={goBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={step === 'upload' ? 'Volver a método' : 'Volver al dashboard'}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Nota</h1>
          <p className="text-gray-600 mt-1">
            {step === 'method' && 'Elige cómo quieres crear tu nota'}
            {step === 'upload' && 'Sube tu archivo de audio o graba directamente'}
            {step === 'processing' && 'Procesando tu archivo de audio'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {['method', 'upload', 'processing'].map((currentStep, index) => (
            <div key={currentStep} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === currentStep ? 'bg-blue-600 text-white' :
                  ['method', 'upload', 'processing'].indexOf(step) > index ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${['method', 'upload', 'processing'].indexOf(step) > index ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step: Method Selection */}
      {step === 'method' && (
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => handleMethodSelect('file')}
            className="group p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400 group-hover:text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Subir archivo</h3>
            <p className="text-sm text-gray-600">
              Sube un archivo de audio existente desde tu dispositivo
            </p>
            <div className="mt-3 text-xs text-gray-500">
              Formatos: MP3, WAV, M4A, WebM • Max: 50MB
            </div>
          </button>

          <button
            onClick={() => handleMethodSelect('recording')}
            className="group p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all text-center"
          >
            <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400 group-hover:text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Grabar ahora</h3>
            <p className="text-sm text-gray-600">
              Graba directamente usando el micrófono de tu dispositivo
            </p>
            <div className="mt-3 text-xs text-gray-500">
              Duración máxima: 5 minutos
            </div>
          </button>
        </div>
      )}

      {/* Step: Upload/Recording */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Note Title */}
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 mb-2">
              Título de la nota
            </label>
            <input
              type="text"
              id="note-title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ej: Reunión de equipo, Ideas para el proyecto..."
            />
          </div>

          {/* Upload/Recording Interface */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {method === 'file' ? (
              <FileUpload
                onFileSelect={handleFileSelect}
                onUploadStart={() => setIsUploading(true)}
                onUploadProgress={setUploadProgress}
                onUploadComplete={() => setIsUploading(false)}
                onUploadError={setUploadError}
                isUploading={isUploading}
                progress={uploadProgress}
                error={uploadError}
                accept="audio/*"
                maxSize={50 * 1024 * 1024} // 50MB
              />
            ) : (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onRecordingError={setUploadError}
                maxDuration={300} // 5 minutes
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('method')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cambiar método
            </button>
            
            <button
              onClick={handleUpload}
              disabled={!canUpload || isUploading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="h-4 w-4" />
              {isUploading ? 'Procesando...' : 'Crear nota y transcribir'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Procesando tu audio
              </h3>
              <p className="text-gray-600">
                Estamos subiendo tu archivo y preparando la transcripción...
              </p>
            </div>

            {/* Progress */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <p className="text-sm text-gray-600">
              {uploadProgress < 50 && 'Subiendo archivo...'}
              {uploadProgress >= 50 && uploadProgress < 90 && 'Procesando audio...'}
              {uploadProgress >= 90 && 'Iniciando transcripción...'}
            </p>

            {/* Selected file info */}
            {selectedFile && (
              <div className="bg-gray-50 rounded-lg p-3 text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {noteTitle}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}