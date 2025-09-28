'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause, Trash2, Save } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingError?: (error: string) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'completed' | 'error';

export function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
  disabled = false,
  maxDuration = 300, // 5 minutes default
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    audioChunksRef.current = [];
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      setState('requesting');
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Create audio URL for playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        setState('completed');
        onRecordingStop?.();
      };

      mediaRecorder.onerror = (event) => {
        const errorMsg = 'Error durante la grabación';
        setError(errorMsg);
        setState('error');
        onRecordingError?.(errorMsg);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      setDuration(0);
      onRecordingStart?.();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al acceder al micrófono';
      setError(errorMsg);
      setState('error');
      onRecordingError?.(errorMsg);
      cleanup();
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      
      // Resume duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newDuration;
        });
      }, 1000);
    }
  };

  // Play/pause audio preview
  const togglePlayback = () => {
    if (!audioUrl || !audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  // Clear recording
  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setState('idle');
    setDuration(0);
    setError(null);
    setIsPlaying(false);
  };

  // Save recording
  const saveRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanup, audioUrl]);

  // Handle audio element events
  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const handleEnded = () => setIsPlaying(false);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  return (
    <div className="w-full space-y-4">
      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Main Recording Button */}
        <div className="relative">
          <button
            onClick={
              state === 'idle' ? startRecording :
              state === 'recording' ? pauseRecording :
              state === 'paused' ? resumeRecording :
              () => {}
            }
            disabled={disabled || state === 'requesting' || state === 'error'}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
              ${state === 'recording' ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
                state === 'paused' ? 'bg-yellow-600 hover:bg-yellow-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
              text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
              focus:ring-4 focus:ring-blue-300
            `}
            aria-label={
              state === 'idle' ? 'Iniciar grabación' :
              state === 'recording' ? 'Pausar grabación' :
              state === 'paused' ? 'Reanudar grabación' :
              'Control de grabación'
            }
          >
            {state === 'requesting' ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : state === 'recording' ? (
              <Pause className="h-6 w-6" />
            ) : state === 'paused' ? (
              <Play className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* Recording indicator */}
          {state === 'recording' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Duration Display */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-gray-900">
            {formatDuration(duration)}
          </div>
          {maxDuration && (
            <div className="text-xs text-gray-600">
              Máximo: {formatDuration(maxDuration)}
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="text-center">
          {state === 'requesting' && (
            <p className="text-sm text-blue-600">Solicitando permisos...</p>
          )}
          {state === 'recording' && (
            <p className="text-sm text-red-600">🔴 Grabando...</p>
          )}
          {state === 'paused' && (
            <p className="text-sm text-yellow-600">⏸️ Pausado</p>
          )}
          {state === 'completed' && (
            <p className="text-sm text-green-600">✅ Grabación completada</p>
          )}
          {error && (
            <p className="text-sm text-red-600">❌ {error}</p>
          )}
        </div>

        {/* Action Buttons */}
        {(state === 'recording' || state === 'paused') && (
          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Square className="h-4 w-4" />
            Detener
          </button>
        )}
      </div>

      {/* Audio Preview */}
      {state === 'completed' && audioUrl && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Vista previa</h4>
            <div className="text-sm text-gray-600">
              {formatDuration(duration)}
            </div>
          </div>

          <audio
            ref={audioElementRef}
            src={audioUrl}
            className="w-full"
            controls
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={saveRecording}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Usar grabación
            </button>
            <button
              onClick={clearRecording}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setState('idle');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Intentar nuevamente
          </button>
        </div>
      )}
    </div>
  );
}