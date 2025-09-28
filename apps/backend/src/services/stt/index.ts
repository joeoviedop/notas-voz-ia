import { Readable } from 'stream';

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments?: TranscriptionSegment[];
  metadata?: Record<string, any>;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  transcribeStream(audioStream: Readable, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  getSupportedFormats(): string[];
  getMaxFileSize(): number; // in bytes
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
}

/**
 * Factory function to create STT provider based on environment
 */
export function createSTTProvider(): STTProvider {
  const provider = process.env.STT_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAISTTProvider();
    case 'assemblyai':
      return new AssemblyAISTTProvider();
    case 'mock':
    default:
      return new MockSTTProvider();
  }
}

// Mock STT Provider for development/testing
export class MockSTTProvider implements STTProvider {
  name = 'mock';

  async transcribe(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const mockTranscriptions = [
      'Hola, esta es una transcripción de prueba generada por el proveedor mock. En esta reunión discutimos los objetivos del proyecto y las próximas tareas a realizar.',
      'Buenos días equipo. Hoy vamos a revisar el progreso del MVP y definir las próximas tareas. Primero, necesitamos completar la documentación técnica para el viernes.',
      'Esta es una nota de voz sobre las ideas para nuevas funcionalidades. Deberíamos considerar agregar notificaciones push y sincronización en tiempo real.',
      'Llamada con el cliente para discutir feedback sobre la última versión. El cliente está satisfecho con el progreso y sugiere algunas mejoras menores.',
    ];

    const randomText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];

    return {
      text: randomText,
      language: options?.language || 'es',
      confidence: 0.85 + Math.random() * 0.1, // Random confidence between 0.85-0.95
      segments: [
        {
          start: 0,
          end: 5.2,
          text: randomText.split('.')[0] + '.',
          confidence: 0.9
        },
        {
          start: 5.3,
          end: 12.8,
          text: randomText.split('.')[1]?.trim() + '.' || '',
          confidence: 0.88
        }
      ],
      metadata: {
        provider: 'mock',
        processingTime: '2.3s',
        fileSize: audioBuffer.length,
      }
    };
  }

  async transcribeStream(audioStream: Readable, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Convert stream to buffer for mock implementation
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      audioStream.on('error', reject);
      audioStream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const result = await this.transcribe(buffer, options);
        resolve(result);
      });
    });
  }

  getSupportedFormats(): string[] {
    return ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
  }

  getMaxFileSize(): number {
    return 25 * 1024 * 1024; // 25MB
  }
}

// OpenAI Whisper STT Provider
export class OpenAISTTProvider implements STTProvider {
  name = 'openai';
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
  }

  async transcribe(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      
      // Create a blob from buffer for the API
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', options?.model || process.env.OPENAI_STT_MODEL || 'whisper-1');
      
      if (options?.language) {
        formData.append('language', options.language);
      }
      
      if (options?.temperature) {
        formData.append('temperature', options.temperature.toString());
      }
      
      if (options?.prompt) {
        formData.append('prompt', options.prompt);
      }

      formData.append('response_format', 'verbose_json');

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        text: data.text,
        language: data.language || options?.language || 'es',
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        segments: data.segments?.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text,
        })),
        metadata: {
          provider: 'openai',
          model: options?.model || 'whisper-1',
          duration: data.duration,
        }
      };

    } catch (error) {
      throw new Error(`OpenAI STT failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async transcribeStream(audioStream: Readable, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Convert stream to buffer for OpenAI API
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      audioStream.on('error', reject);
      audioStream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await this.transcribe(buffer, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  getSupportedFormats(): string[] {
    return [
      'audio/flac',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
    ];
  }

  getMaxFileSize(): number {
    return 25 * 1024 * 1024; // 25MB - OpenAI's limit
  }
}

// AssemblyAI STT Provider
export class AssemblyAISTTProvider implements STTProvider {
  name = 'assemblyai';
  private apiKey: string;
  private baseURL = 'https://api.assemblyai.com/v2';

  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('AssemblyAI API key not configured. Set ASSEMBLYAI_API_KEY environment variable.');
    }
  }

  async transcribe(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      // First, upload the file
      const uploadResponse = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: audioBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      // Create transcription job
      const transcriptionConfig = {
        audio_url: audioUrl,
        language_code: options?.language || 'es',
        punctuate: true,
        format_text: true,
      };

      const transcribeResponse = await fetch(`${this.baseURL}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transcriptionConfig),
      });

      if (!transcribeResponse.ok) {
        throw new Error(`AssemblyAI transcription failed: ${transcribeResponse.statusText}`);
      }

      const transcribeData = await transcribeResponse.json();
      const transcriptId = transcribeData.id;

      // Poll for completion
      let result;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes maximum

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`${this.baseURL}/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.apiKey,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`AssemblyAI status check failed: ${statusResponse.statusText}`);
        }

        result = await statusResponse.json();

        if (result.status === 'completed') {
          break;
        } else if (result.status === 'error') {
          throw new Error(`AssemblyAI transcription error: ${result.error}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      if (!result || result.status !== 'completed') {
        throw new Error('AssemblyAI transcription timed out');
      }

      return {
        text: result.text,
        language: options?.language || 'es',
        confidence: result.confidence || 0.8,
        segments: result.words?.map((word: any) => ({
          start: word.start / 1000, // Convert from ms to seconds
          end: word.end / 1000,
          text: word.text,
          confidence: word.confidence,
        })),
        metadata: {
          provider: 'assemblyai',
          transcriptId,
          audioUrl,
          processingTime: result.processing_time,
        }
      };

    } catch (error) {
      throw new Error(`AssemblyAI STT failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async transcribeStream(audioStream: Readable, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Convert stream to buffer for AssemblyAI API
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      audioStream.on('error', reject);
      audioStream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await this.transcribe(buffer, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  getSupportedFormats(): string[] {
    return [
      'audio/aac',
      'audio/flac', 
      'audio/mp3',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
    ];
  }

  getMaxFileSize(): number {
    return 5 * 1024 * 1024 * 1024; // 5GB - AssemblyAI's limit
  }
}

// Export the factory function and singleton
export const sttProvider = createSTTProvider();