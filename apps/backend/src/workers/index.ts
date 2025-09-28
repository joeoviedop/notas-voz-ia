import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

import { sttProvider } from '../services/stt/index.js';
import { llmProvider } from '../services/llm/index.js';
import { storageService } from '../services/storage.service.js';
import { getQueueService, TranscribeJobData, SummarizeJobData } from '../services/queue.service.js';

const prisma = new PrismaClient();

/**
 * Worker manager for handling background job processing
 */
export class WorkerManager {
  private redis: Redis;
  private transcribeWorker: Worker<TranscribeJobData>;
  private summarizeWorker: Worker<SummarizeJobData>;
  private queueService = getQueueService();

  constructor() {
    // Initialize Redis connection for workers
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize workers
    this.transcribeWorker = new Worker<TranscribeJobData>(
      'transcribe',
      this.processTranscribeJob.bind(this),
      {
        connection: this.redis,
        concurrency: parseInt(process.env.TRANSCRIBE_CONCURRENCY || '2'),
        limiter: {
          max: 10, // Max 10 jobs per duration
          duration: 60 * 1000, // 1 minute
        },
      }
    );

    this.summarizeWorker = new Worker<SummarizeJobData>(
      'summarize',
      this.processSummarizeJob.bind(this),
      {
        connection: this.redis,
        concurrency: parseInt(process.env.SUMMARIZE_CONCURRENCY || '3'),
        limiter: {
          max: 15, // Max 15 jobs per duration
          duration: 60 * 1000, // 1 minute
        },
      }
    );

    this.setupWorkerEventListeners();
  }

  /**
   * Process transcription job
   */
  private async processTranscribeJob(job: Job<TranscribeJobData>): Promise<void> {
    const { noteId, mediaId, storageKey, userId, options } = job.data;
    
    try {
      console.log(`🎤 Starting transcription for note ${noteId}`);
      
      // Update job progress
      await job.updateProgress(10);

      // Update note status to transcribing
      await prisma.note.update({
        where: { id: noteId },
        data: { status: 'transcribing' }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'transcription_started',
          userId,
          noteId,
          correlationId: nanoid(),
        }
      });

      await job.updateProgress(20);

      // Download audio file from storage
      console.log(`📥 Downloading audio file: ${storageKey}`);
      const audioBuffer = await storageService.downloadFile(storageKey);
      
      await job.updateProgress(30);

      // Transcribe audio
      console.log(`🔄 Transcribing audio with ${sttProvider.name} provider`);
      const transcriptionResult = await sttProvider.transcribe(audioBuffer, {
        language: options?.language || 'es',
        model: options?.model,
      });

      await job.updateProgress(70);

      // Save transcript to database
      const transcript = await prisma.transcript.create({
        data: {
          text: transcriptionResult.text,
          language: transcriptionResult.language,
          confidence: transcriptionResult.confidence,
          provider: sttProvider.name,
          noteId,
          metadata: transcriptionResult.metadata,
        }
      });

      console.log(`✅ Transcript created with ID: ${transcript.id}`);
      
      await job.updateProgress(80);

      // Update note status
      await prisma.note.update({
        where: { id: noteId },
        data: { status: 'summarizing' }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'transcription_completed',
          userId,
          noteId,
          correlationId: nanoid(),
        }
      });

      await job.updateProgress(90);

      // Automatically trigger summarization
      console.log(`🤖 Queuing summarization job for note ${noteId}`);
      await this.queueService.addSummarizeJob({
        noteId,
        transcriptId: transcript.id,
        transcriptText: transcript.text,
        userId,
        options: {
          language: options?.language,
        }
      });

      await job.updateProgress(100);
      
      console.log(`🎉 Transcription completed for note ${noteId}`);

    } catch (error) {
      console.error(`❌ Transcription failed for note ${noteId}:`, error);

      // Update note status to error
      await prisma.note.update({
        where: { id: noteId },
        data: { status: 'error' }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'transcription_failed',
          userId,
          noteId,
          correlationId: nanoid(),
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        }
      });

      throw error;
    }
  }

  /**
   * Process summarization job
   */
  private async processSummarizeJob(job: Job<SummarizeJobData>): Promise<void> {
    const { noteId, transcriptId, transcriptText, userId, options } = job.data;
    
    try {
      console.log(`🧠 Starting summarization for note ${noteId}`);
      
      // Update job progress
      await job.updateProgress(10);

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'summarization_started',
          userId,
          noteId,
          correlationId: nanoid(),
        }
      });

      await job.updateProgress(20);

      // Generate summary using LLM
      console.log(`🔄 Generating summary with ${llmProvider.name} provider`);
      const summarizationResult = await llmProvider.summarize(transcriptText, {
        language: options?.language || 'español',
        model: options?.model,
      });

      await job.updateProgress(60);

      // Save summary to database
      const summary = await prisma.summary.create({
        data: {
          tlDr: summarizationResult.tlDr,
          bullets: summarizationResult.bullets,
          provider: llmProvider.name,
          noteId,
          metadata: summarizationResult.metadata,
        }
      });

      console.log(`✅ Summary created with ID: ${summary.id}`);
      
      await job.updateProgress(80);

      // Save actions to database
      const actionsData = summarizationResult.actions.map(action => ({
        text: action.text,
        done: false,
        dueSuggested: action.dueSuggested,
        noteId,
        userId,
      }));

      if (actionsData.length > 0) {
        await prisma.action.createMany({
          data: actionsData
        });
        console.log(`✅ Created ${actionsData.length} actions`);
      }

      await job.updateProgress(90);

      // Update note status to ready
      await prisma.note.update({
        where: { id: noteId },
        data: { status: 'ready' }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'summarization_completed',
          userId,
          noteId,
          correlationId: nanoid(),
        }
      });

      await job.updateProgress(100);
      
      console.log(`🎉 Summarization completed for note ${noteId}`);

    } catch (error) {
      console.error(`❌ Summarization failed for note ${noteId}:`, error);

      // Update note status to error
      await prisma.note.update({
        where: { id: noteId },
        data: { status: 'error' }
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          type: 'summarization_failed',
          userId,
          noteId,
          correlationId: nanoid(),
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        }
      });

      throw error;
    }
  }

  /**
   * Setup worker event listeners
   */
  private setupWorkerEventListeners(): void {
    // Transcribe worker events
    this.transcribeWorker.on('completed', (job) => {
      console.log(`✅ Transcribe job ${job.id} completed`);
    });

    this.transcribeWorker.on('failed', (job, err) => {
      console.log(`❌ Transcribe job ${job?.id} failed:`, err.message);
    });

    this.transcribeWorker.on('active', (job) => {
      console.log(`🔄 Transcribe job ${job.id} started processing`);
    });

    this.transcribeWorker.on('stalled', (jobId) => {
      console.log(`⏸️ Transcribe job ${jobId} stalled`);
    });

    // Summarize worker events
    this.summarizeWorker.on('completed', (job) => {
      console.log(`✅ Summarize job ${job.id} completed`);
    });

    this.summarizeWorker.on('failed', (job, err) => {
      console.log(`❌ Summarize job ${job?.id} failed:`, err.message);
    });

    this.summarizeWorker.on('active', (job) => {
      console.log(`🔄 Summarize job ${job.id} started processing`);
    });

    this.summarizeWorker.on('stalled', (jobId) => {
      console.log(`⏸️ Summarize job ${jobId} stalled`);
    });

    // Generic error handling
    this.transcribeWorker.on('error', (err) => {
      console.error('❌ Transcribe worker error:', err);
    });

    this.summarizeWorker.on('error', (err) => {
      console.error('❌ Summarize worker error:', err);
    });
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<{
    transcribe: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
    summarize: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
    };
  }> {
    const [transcribeStats, summarizeStats] = await Promise.all([
      this.queueService.getQueueStats('transcribe'),
      this.queueService.getQueueStats('summarize'),
    ]);

    return {
      transcribe: {
        active: transcribeStats.active,
        waiting: transcribeStats.waiting,
        completed: transcribeStats.completed,
        failed: transcribeStats.failed,
      },
      summarize: {
        active: summarizeStats.active,
        waiting: summarizeStats.waiting,
        completed: summarizeStats.completed,
        failed: summarizeStats.failed,
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down workers...');
    
    await Promise.all([
      this.transcribeWorker.close(),
      this.summarizeWorker.close(),
    ]);

    await this.redis.quit();
    await prisma.$disconnect();

    console.log('✅ Workers shut down successfully');
  }

  /**
   * Health check for workers
   */
  async healthCheck(): Promise<{
    redis: { status: string; responseTime?: number };
    database: { status: string; responseTime?: number };
    workers: {
      transcribe: { status: string; processing: number };
      summarize: { status: string; processing: number };
    };
  }> {
    // Check Redis connection
    const redisHealth = await this.queueService.healthCheck();

    // Check database connection
    let databaseHealth;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      databaseHealth = { status: 'ok', responseTime };
    } catch (error) {
      databaseHealth = { status: 'error' };
    }

    // Check worker status
    const stats = await this.getWorkerStats();

    return {
      redis: redisHealth,
      database: databaseHealth,
      workers: {
        transcribe: {
          status: this.transcribeWorker.isRunning() ? 'running' : 'stopped',
          processing: stats.transcribe.active,
        },
        summarize: {
          status: this.summarizeWorker.isRunning() ? 'running' : 'stopped',
          processing: stats.summarize.active,
        },
      },
    };
  }
}

// Main worker process
async function startWorkers() {
  console.log('🚀 Starting background workers...');
  
  const workerManager = new WorkerManager();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('📡 Received shutdown signal');
    await workerManager.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Health check endpoint (if running standalone)
  if (process.argv.includes('--health')) {
    const health = await workerManager.healthCheck();
    console.log(JSON.stringify(health, null, 2));
    process.exit(0);
  }

  console.log('✅ Workers started successfully');
  console.log('   - Transcription worker: Running');
  console.log('   - Summarization worker: Running');
  console.log('   - Press Ctrl+C to shutdown');

  // Keep the process alive
  process.stdin.resume();
}

// Export for use in main application
export { WorkerManager };

// Start workers if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorkers().catch((error) => {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  });
}