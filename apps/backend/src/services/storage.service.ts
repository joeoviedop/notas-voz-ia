import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import mimeTypes from 'mime-types';
import crypto from 'crypto';
import type { Readable } from 'stream';

export interface StorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  folder?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
  size?: number;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  operation?: 'getObject' | 'putObject';
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true, // Needed for MinIO
    });
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const extension = originalName.split('.').pop() || '';
    const contentType = options.contentType || mimeTypes.lookup(originalName) || 'application/octet-stream';
    
    // Generate unique key
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const folder = options.folder || 'uploads';
    const fileId = nanoid();
    const key = `${folder}/${timestamp}/${fileId}.${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          'original-name': originalName,
          'upload-timestamp': new Date().toISOString(),
          ...options.metadata,
        },
      });

      const result = await this.s3Client.send(command);

      return {
        key,
        url: await this.getPublicUrl(key),
        etag: result.ETag,
        size: fileBuffer.length,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Upload stream to storage
   */
  async uploadStream(
    stream: Readable,
    key: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        Metadata: options.metadata,
      });

      const result = await this.s3Client.send(command);

      return {
        key,
        url: await this.getPublicUrl(key),
        etag: result.ETag,
      };
    } catch (error) {
      throw new Error(`Failed to upload stream: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Download a file from storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get file stream
   */
  async getFileStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      return response.Body as Readable;
    } catch (error) {
      throw new Error(`Failed to get file stream: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        metadata: response.Metadata || {},
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate signed URL for direct access
   */
  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const { expiresIn = 3600, operation = 'getObject' } = options;

    try {
      const command = operation === 'putObject'
        ? new PutObjectCommand({ Bucket: this.bucket, Key: key })
        : new GetObjectCommand({ Bucket: this.bucket, Key: key });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get public URL (for public buckets)
   */
  async getPublicUrl(key: string): Promise<string> {
    const endpoint = process.env.STORAGE_ENDPOINT || 'https://s3.amazonaws.com';
    const cleanEndpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanEndpoint}/${this.bucket}/${key}`;
  }

  /**
   * Generate unique storage key
   */
  generateKey(originalName: string, folder = 'uploads'): string {
    const extension = originalName.split('.').pop() || '';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileId = nanoid();
    return `${folder}/${timestamp}/${fileId}.${extension}`;
  }

  /**
   * Validate file type
   */
  validateFileType(filename: string, allowedTypes: string[]): boolean {
    const mimeType = mimeTypes.lookup(filename);
    return mimeType ? allowedTypes.includes(mimeType) : false;
  }

  /**
   * Generate file hash
   */
  generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Clean up old files (utility method)
   */
  async cleanupOldFiles(folder: string, olderThanDays: number): Promise<number> {
    // This is a basic implementation - in production you might want to use S3 lifecycle policies
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // This would require listing objects and checking their LastModified date
    // For now, return 0 as a placeholder
    return 0;
  }
}

// Factory function to create storage service based on environment
export function createStorageService(): StorageService {
  const config: StorageConfig = {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION || 'us-east-1',
    accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
    bucket: process.env.STORAGE_BUCKET || 'notas-audio',
    forcePathStyle: true, // Required for MinIO and local S3 compatible services
  };

  // Validate required environment variables
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Storage credentials not configured. Please set STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY environment variables.');
  }

  return new StorageService(config);
}

// Export singleton instance
export const storageService = createStorageService();