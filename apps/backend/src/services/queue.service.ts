import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// Queue job data interfaces
export interface TranscribeJobData {
  noteId: string;
  mediaId: string;
  storageKey: string;
  userId: string;
  options?: {
    language?: string;
    model?: string;
  };
}

export interface SummarizeJobData {
  noteId: string;
  transcriptId: string;
  transcriptText: string;
  userId: string;
  options?: {
    language?: string;
    model?: string;
  };
}

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: 'exponential';
      delay: number;
    };
  };
}

/**
 * Queue service for managing background jobs
 */
export class QueueService {
  private redis: Redis;
  private transcribeQueue: Queue<TranscribeJobData>;
  private summarizeQueue: Queue<SummarizeJobData>;
  private queueEvents: QueueEvents[];

  constructor(config: QueueConfig) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize queues
    const queueOptions = {
      connection: this.redis,
      defaultJobOptions: config.defaultJobOptions,
    };

    this.transcribeQueue = new Queue<TranscribeJobData>('transcribe', queueOptions);
    this.summarizeQueue = new Queue<SummarizeJobData>('summarize', queueOptions);

    // Initialize queue events for monitoring
    this.queueEvents = [
      new QueueEvents('transcribe', { connection: this.redis }),
      new QueueEvents('summarize', { connection: this.redis }),
    ];

    this.setupEventListeners();
  }

  /**
   * Add transcription job to queue
   */
  async addTranscribeJob(data: TranscribeJobData, options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }): Promise<string> {
    try {
      // Create processing job record
      const processingJob = await prisma.processingJob.create({
        data: {
          type: 'transcribe',
          status: 'pending',
          noteId: data.noteId,
          provider: process.env.STT_PROVIDER || 'mock',
          payload: data as any,
          attempts: 0,
          maxAttempts: 3,
        },
      });

      const job = await this.transcribeQueue.add('transcribe-audio', data, {
        jobId: options?.jobId || processingJob.id,
        delay: options?.delay,
        priority: options?.priority || 10,
      });

      // Update processing job with queue job ID
      await prisma.processingJob.update({
        where: { id: processingJob.id },
        data: { 
          payload: { ...data, queueJobId: job.id } as any 
        },
      });

      return job.id!;
    } catch (error) {
      throw new Error(`Failed to add transcribe job: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Add summarization job to queue
   */
  async addSummarizeJob(data: SummarizeJobData, options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }): Promise<string> {
    try {
      // Create processing job record
      const processingJob = await prisma.processingJob.create({
        data: {
          type: 'summarize',
          status: 'pending',
          noteId: data.noteId,
          provider: process.env.LLM_PROVIDER || 'mock',
          payload: data as any,
          attempts: 0,
          maxAttempts: 3,
        },
      });

      const job = await this.summarizeQueue.add('summarize-text', data, {
        jobId: options?.jobId || processingJob.id,
        delay: options?.delay,
        priority: options?.priority || 5,
      });

      // Update processing job with queue job ID
      await prisma.processingJob.update({
        where: { id: processingJob.id },
        data: { 
          payload: { ...data, queueJobId: job.id } as any 
        },
      });

      return job.id!;
    } catch (error) {
      throw new Error(`Failed to add summarize job: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: 'transcribe' | 'summarize', jobId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
    result?: any;
  }> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    
    return {
      status: state,
      progress: job.progress,
      error: job.failedReason,
      result: job.returnvalue,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName: 'transcribe' | 'summarize', jobId: string): Promise<boolean> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: 'transcribe' | 'summarize'): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    
    return {
      waiting: await queue.getWaiting().then(jobs => jobs.length),
      active: await queue.getActive().then(jobs => jobs.length),
      completed: await queue.getCompleted().then(jobs => jobs.length),
      failed: await queue.getFailed().then(jobs => jobs.length),
      delayed: await queue.getDelayed().then(jobs => jobs.length),
    };
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: 'transcribe' | 'summarize'): Promise<void> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    await queue.pause();
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: 'transcribe' | 'summarize'): Promise<void> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    await queue.resume();
  }

  /**
   * Clean up old jobs
   */
  async cleanOldJobs(queueName: 'transcribe' | 'summarize', olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = queueName === 'transcribe' ? this.transcribeQueue : this.summarizeQueue;
    
    await queue.clean(olderThan, 10, 'completed');
    await queue.clean(olderThan, 10, 'failed');
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.queueEvents.forEach((queueEvent, index) => {
      const queueName = index === 0 ? 'transcribe' : 'summarize';

      queueEvent.on('completed', async ({ jobId, returnvalue }) => {
        console.log(`✅ ${queueName} job ${jobId} completed`);
        
        // Update processing job status
        await this.updateProcessingJobStatus(jobId, 'completed', returnvalue);
      });

      queueEvent.on('failed', async ({ jobId, failedReason }) => {
        console.log(`❌ ${queueName} job ${jobId} failed: ${failedReason}`);
        
        // Update processing job status
        await this.updateProcessingJobStatus(jobId, 'failed', null, failedReason);
      });

      queueEvent.on('active', async ({ jobId }) => {
        console.log(`🔄 ${queueName} job ${jobId} started`);
        
        // Update processing job status
        await this.updateProcessingJobStatus(jobId, 'processing');
      });

      queueEvent.on('stalled', async ({ jobId }) => {
        console.log(`⏸️ ${queueName} job ${jobId} stalled`);
      });

      queueEvent.on('progress', async ({ jobId, data }) => {
        console.log(`📊 ${queueName} job ${jobId} progress: ${data}%`);
      });
    });
  }

  /**
   * Update processing job status in database
   */
  private async updateProcessingJobStatus(
    jobId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    result?: any,
    error?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'processing') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
        if (result) updateData.result = result;
      } else if (status === 'failed') {
        updateData.error = error;
        updateData.attempts = { increment: 1 };
      }

      await prisma.processingJob.update({
        where: { id: jobId },
        data: updateData,
      });
    } catch (err) {
      console.error(`Failed to update processing job ${jobId}:`, err);
    }
  }

  /**
   * Check Redis connection
   */
  async healthCheck(): Promise<{ status: string; responseTime?: number }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      return { status: 'ok', responseTime };
    } catch (error) {
      return { status: 'error' };
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.transcribeQueue.close(),
      this.summarizeQueue.close(),
      ...this.queueEvents.map(qe => qe.close()),
    ]);
    
    await this.redis.quit();
  }
}

/**
 * Create queue service based on environment
 */
export function createQueueService(): QueueService {
  const queueDriver = process.env.QUEUE_DRIVER || 'memory';
  
  if (queueDriver === 'memory') {
    // For development, create a mock that doesn't require Redis
    console.warn('⚠️ Using memory-based queue (development only). Jobs will not persist across restarts.');
  }

  const config: QueueConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    defaultJobOptions: {
      removeOnComplete: 50, // Keep last 50 completed jobs
      removeOnFail: 20,     // Keep last 20 failed jobs
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds
      },
    },
  };

  return new QueueService(config);
}

// Export singleton instance
let queueService: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueService) {
    queueService = createQueueService();
  }
  return queueService;
}