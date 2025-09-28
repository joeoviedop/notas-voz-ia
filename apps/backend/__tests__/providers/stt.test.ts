import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createAudioBuffer } from '../utils/testHelpers.js';

// Mock implementations will be loaded by the service
const mockOpenAIResult = {
  text: 'Mock transcription from OpenAI Whisper',
  language: 'en',
  confidence: 0.95,
};

const mockAssemblyAIResult = {
  text: 'Mock transcription from AssemblyAI',
  language: 'en', 
  confidence: 0.93,
};

const mockResult = {
  text: 'Mock transcription for testing',
  language: 'en',
  confidence: 1.0,
};

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResult),
      },
    },
  })),
}));

// Mock AssemblyAI
jest.mock('assemblyai', () => ({
  AssemblyAI: jest.fn(() => ({
    transcripts: {
      transcribe: jest.fn().mockResolvedValue({
        id: 'mock-transcript-id',
        text: mockAssemblyAIResult.text,
        status: 'completed',
        confidence: mockAssemblyAIResult.confidence,
        language_code: 'en',
      }),
    },
  })),
}));

describe('STT Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MockSTTProvider', () => {
    let mockProvider: any;

    beforeEach(async () => {
      const { MockSTTProvider } = await import('../../src/providers/stt/mock.js');
      mockProvider = new MockSTTProvider();
    });

    it('should transcribe audio successfully', async () => {
      const audioBuffer = createAudioBuffer(1024);
      const result = await mockProvider.transcribe(audioBuffer, 'test.mp3');

      expect(result).toMatchObject({
        text: expect.any(String),
        language: 'en',
        confidence: expect.any(Number),
      });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should handle different audio formats', async () => {
      const audioBuffer = createAudioBuffer(2048);
      const formats = ['audio.mp3', 'audio.wav', 'audio.m4a'];

      for (const filename of formats) {
        const result = await mockProvider.transcribe(audioBuffer, filename);
        expect(result).toMatchObject({
          text: expect.any(String),
          language: 'en',
          confidence: expect.any(Number),
        });
      }
    });

    it('should simulate processing time', async () => {
      const audioBuffer = createAudioBuffer(1024);
      const startTime = Date.now();
      
      await mockProvider.transcribe(audioBuffer, 'test.mp3');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least some time to simulate processing
      expect(duration).toBeGreaterThan(50);
    });

    it('should handle large audio files', async () => {
      const largeBuffer = createAudioBuffer(10 * 1024 * 1024); // 10MB
      const result = await mockProvider.transcribe(largeBuffer, 'large-audio.wav');

      expect(result).toMatchObject({
        text: expect.any(String),
        language: 'en', 
        confidence: expect.any(Number),
      });
      // Larger files might have slightly different confidence
      expect(result.text.length).toBeGreaterThan(50);
    });

    it('should handle empty buffers gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await mockProvider.transcribe(emptyBuffer, 'empty.mp3');

      expect(result).toMatchObject({
        text: expect.any(String),
        language: 'en',
        confidence: expect.any(Number),
      });
      // Empty files should return minimal transcription
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('OpenAISTTProvider', () => {
    let openaiProvider: any;
    let mockOpenAI: any;

    beforeEach(async () => {
      const OpenAI = (await import('openai')).default;
      mockOpenAI = {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResult),
          },
        },
      };
      (OpenAI as jest.Mock).mockReturnValue(mockOpenAI);

      const { OpenAISTTProvider } = await import('../../src/providers/stt/openai.js');
      openaiProvider = new OpenAISTTProvider();
    });

    it('should transcribe audio using OpenAI Whisper', async () => {
      const audioBuffer = createAudioBuffer(1024);
      const result = await openaiProvider.transcribe(audioBuffer, 'test.mp3');

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(Object), // Blob-like object
        model: 'whisper-1',
        language: 'en',
        response_format: 'json',
        temperature: 0,
      });

      expect(result).toEqual({
        text: mockOpenAIResult.text,
        language: mockOpenAIResult.language,
        confidence: mockOpenAIResult.confidence,
      });
    });

    it('should handle transcription errors', async () => {
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const audioBuffer = createAudioBuffer(1024);
      
      await expect(
        openaiProvider.transcribe(audioBuffer, 'test.mp3')
      ).rejects.toThrow('OpenAI API error');
    });

    it('should handle rate limiting', async () => {
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const audioBuffer = createAudioBuffer(1024);
      
      await expect(
        openaiProvider.transcribe(audioBuffer, 'test.mp3')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should convert buffer to proper format for OpenAI', async () => {
      const audioBuffer = createAudioBuffer(1024);
      await openaiProvider.transcribe(audioBuffer, 'audio.wav');

      const createCall = mockOpenAI.audio.transcriptions.create.mock.calls[0][0];
      expect(createCall.file).toBeDefined();
      expect(createCall.model).toBe('whisper-1');
      expect(createCall.language).toBe('en');
    });

    it('should handle different audio formats', async () => {
      const audioBuffer = createAudioBuffer(1024);
      const formats = [
        { filename: 'audio.mp3', expected: 'mp3' },
        { filename: 'audio.wav', expected: 'wav' },
        { filename: 'audio.m4a', expected: 'm4a' },
      ];

      for (const { filename } of formats) {
        mockOpenAI.audio.transcriptions.create.mockClear();
        await openaiProvider.transcribe(audioBuffer, filename);
        
        expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalled();
      }
    });
  });

  describe('AssemblyAISTTProvider', () => {
    let assemblyProvider: any;
    let mockAssemblyAI: any;

    beforeEach(async () => {
      const { AssemblyAI } = await import('assemblyai');
      mockAssemblyAI = {
        transcripts: {
          transcribe: jest.fn().mockResolvedValue({
            id: 'mock-transcript-id',
            text: mockAssemblyAIResult.text,
            status: 'completed',
            confidence: mockAssemblyAIResult.confidence,
            language_code: 'en',
          }),
        },
      };
      (AssemblyAI as jest.Mock).mockReturnValue(mockAssemblyAI);

      const { AssemblyAISTTProvider } = await import('../../src/providers/stt/assemblyai.js');
      assemblyProvider = new AssemblyAISTTProvider();
    });

    it('should transcribe audio using AssemblyAI', async () => {
      const audioBuffer = createAudioBuffer(1024);
      const result = await assemblyProvider.transcribe(audioBuffer, 'test.mp3');

      expect(mockAssemblyAI.transcripts.transcribe).toHaveBeenCalledWith({
        audio: expect.any(Buffer),
        language_code: 'en',
      });

      expect(result).toEqual({
        text: mockAssemblyAIResult.text,
        language: mockAssemblyAIResult.language,
        confidence: mockAssemblyAIResult.confidence,
      });
    });

    it('should handle transcription errors', async () => {
      mockAssemblyAI.transcripts.transcribe.mockRejectedValue(
        new Error('AssemblyAI API error')
      );

      const audioBuffer = createAudioBuffer(1024);
      
      await expect(
        assemblyProvider.transcribe(audioBuffer, 'test.mp3')
      ).rejects.toThrow('AssemblyAI API error');
    });

    it('should handle failed transcription status', async () => {
      mockAssemblyAI.transcripts.transcribe.mockResolvedValue({
        id: 'failed-transcript-id',
        status: 'error',
        error: 'Transcription failed',
      });

      const audioBuffer = createAudioBuffer(1024);
      
      await expect(
        assemblyProvider.transcribe(audioBuffer, 'test.mp3')
      ).rejects.toThrow('Transcription failed');
    });

    it('should handle incomplete transcription', async () => {
      mockAssemblyAI.transcripts.transcribe.mockResolvedValue({
        id: 'processing-transcript-id',
        status: 'processing',
      });

      const audioBuffer = createAudioBuffer(1024);
      
      await expect(
        assemblyProvider.transcribe(audioBuffer, 'test.mp3')
      ).rejects.toThrow('Transcription not completed');
    });

    it('should pass correct parameters to AssemblyAI', async () => {
      const audioBuffer = createAudioBuffer(2048);
      await assemblyProvider.transcribe(audioBuffer, 'interview.wav');

      expect(mockAssemblyAI.transcripts.transcribe).toHaveBeenCalledWith({
        audio: audioBuffer,
        language_code: 'en',
      });
    });
  });

  describe('STT Provider Factory', () => {
    beforeEach(() => {
      // Reset environment
      delete process.env.STT_PROVIDER;
    });

    afterEach(() => {
      // Reset to test default
      process.env.STT_PROVIDER = 'mock';
    });

    it('should return mock provider by default', async () => {
      process.env.STT_PROVIDER = 'mock';
      const { createSTTProvider } = await import('../../src/providers/stt/index.js');
      
      const provider = createSTTProvider();
      expect(provider).toBeDefined();
      
      // Test that it behaves like mock provider
      const result = await provider.transcribe(createAudioBuffer(1024), 'test.mp3');
      expect(result.text).toBeTruthy();
      expect(result.language).toBe('en');
    });

    it('should return OpenAI provider when configured', async () => {
      process.env.STT_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const { createSTTProvider } = await import('../../src/providers/stt/index.js');
      const provider = createSTTProvider();
      
      expect(provider).toBeDefined();
    });

    it('should return AssemblyAI provider when configured', async () => {
      process.env.STT_PROVIDER = 'assemblyai';
      process.env.ASSEMBLYAI_API_KEY = 'test-key';
      
      const { createSTTProvider } = await import('../../src/providers/stt/index.js');
      const provider = createSTTProvider();
      
      expect(provider).toBeDefined();
    });

    it('should throw error for unknown provider', async () => {
      process.env.STT_PROVIDER = 'unknown';
      
      const { createSTTProvider } = await import('../../src/providers/stt/index.js');
      
      expect(() => createSTTProvider()).toThrow('Unknown STT provider: unknown');
    });

    it('should throw error when API key is missing', async () => {
      process.env.STT_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;
      
      const { createSTTProvider } = await import('../../src/providers/stt/index.js');
      
      expect(() => createSTTProvider()).toThrow('OpenAI API key is required');
    });
  });
});