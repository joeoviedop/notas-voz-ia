import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { storageService } from '../../src/services/storage.js';
import { createAudioBuffer } from '../utils/testHelpers.js';

// Mock AWS SDK
const mockS3Send = jest.fn();
const mockS3Client = {
  send: mockS3Send,
};

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => mockS3Client),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Import mocked modules
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send.mockReset();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const buffer = createAudioBuffer(1024);
      const filename = 'test-audio.mp3';
      const mimetype = 'audio/mpeg';

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
        ETag: '"mock-etag"',
      });

      const result = await storageService.uploadFile(buffer, filename, mimetype);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.STORAGE_BUCKET,
        Key: expect.stringMatching(/^uploads\/.*\.mp3$/),
        Body: buffer,
        ContentType: mimetype,
        Metadata: {
          originalName: filename,
          uploadedAt: expect.any(String),
        },
      });

      expect(mockS3Send).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toMatchObject({
        key: expect.stringMatching(/^uploads\/.*\.mp3$/),
        size: 1024,
        etag: '"mock-etag"',
        url: expect.stringContaining('uploads/'),
      });
    });

    it('should handle upload errors', async () => {
      const buffer = createAudioBuffer(1024);
      const filename = 'test-audio.mp3';
      const mimetype = 'audio/mpeg';

      mockS3Send.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        storageService.uploadFile(buffer, filename, mimetype)
      ).rejects.toThrow('S3 upload failed');
    });

    it('should generate unique keys for same filename', async () => {
      const buffer = createAudioBuffer(1024);
      const filename = 'duplicate.mp3';
      const mimetype = 'audio/mpeg';

      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
        ETag: '"mock-etag"',
      });

      const result1 = await storageService.uploadFile(buffer, filename, mimetype);
      const result2 = await storageService.uploadFile(buffer, filename, mimetype);

      expect(result1.key).not.toBe(result2.key);
      expect(result1.key).toMatch(/^uploads\/.*\.mp3$/);
      expect(result2.key).toMatch(/^uploads\/.*\.mp3$/);
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
      };

      mockS3Send.mockResolvedValue({
        Body: mockStream,
        ContentType: 'audio/mpeg',
        ContentLength: 4,
      });

      const result = await storageService.downloadFile('uploads/test-file.mp3');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.STORAGE_BUCKET,
        Key: 'uploads/test-file.mp3',
      });

      expect(mockS3Send).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toMatchObject({
        buffer: expect.any(Buffer),
        contentType: 'audio/mpeg',
        contentLength: 4,
      });
    });

    it('should handle download errors', async () => {
      mockS3Send.mockRejectedValue(new Error('File not found'));

      await expect(
        storageService.downloadFile('uploads/nonexistent.mp3')
      ).rejects.toThrow('File not found');
    });

    it('should handle stream errors', async () => {
      const mockStream = {
        transformToByteArray: jest.fn().mockRejectedValue(new Error('Stream error')),
      };

      mockS3Send.mockResolvedValue({
        Body: mockStream,
        ContentType: 'audio/mpeg',
        ContentLength: 1024,
      });

      await expect(
        storageService.downloadFile('uploads/corrupt-file.mp3')
      ).rejects.toThrow('Stream error');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 204 },
      });

      await storageService.deleteFile('uploads/test-file.mp3');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.STORAGE_BUCKET,
        Key: 'uploads/test-file.mp3',
      });

      expect(mockS3Send).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle deletion errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('Delete failed'));

      // Deletion errors should not throw
      await expect(
        storageService.deleteFile('uploads/nonexistent.mp3')
      ).resolves.not.toThrow();
    });

    it('should handle missing file gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('NoSuchKey'));

      await expect(
        storageService.deleteFile('uploads/missing.mp3')
      ).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      mockS3Send.mockResolvedValue({
        ContentLength: 1024,
        LastModified: new Date(),
      });

      const result = await storageService.fileExists('uploads/existing-file.mp3');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.STORAGE_BUCKET,
        Key: 'uploads/existing-file.mp3',
      });

      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      mockS3Send.mockRejectedValue(new Error('NotFound'));

      const result = await storageService.fileExists('uploads/nonexistent.mp3');

      expect(result).toBe(false);
    });

    it('should handle other errors as false', async () => {
      mockS3Send.mockRejectedValue(new Error('Access denied'));

      const result = await storageService.fileExists('uploads/access-denied.mp3');

      expect(result).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const mockDate = new Date('2024-01-01T00:00:00Z');
      mockS3Send.mockResolvedValue({
        ContentLength: 1024,
        ContentType: 'audio/mpeg',
        LastModified: mockDate,
        Metadata: {
          originalName: 'test-audio.mp3',
          uploadedAt: mockDate.toISOString(),
        },
      });

      const result = await storageService.getFileInfo('uploads/test-file.mp3');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.STORAGE_BUCKET,
        Key: 'uploads/test-file.mp3',
      });

      expect(result).toEqual({
        size: 1024,
        contentType: 'audio/mpeg',
        lastModified: mockDate,
        metadata: {
          originalName: 'test-audio.mp3',
          uploadedAt: mockDate.toISOString(),
        },
      });
    });

    it('should return null for non-existing file', async () => {
      mockS3Send.mockRejectedValue(new Error('NotFound'));

      const result = await storageService.getFileInfo('uploads/nonexistent.mp3');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('Access denied'));

      const result = await storageService.getFileInfo('uploads/access-denied.mp3');

      expect(result).toBeNull();
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for download', async () => {
      const mockUrl = 'https://bucket.s3.amazonaws.com/uploads/test.mp3?signature=abc123';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const result = await storageService.getSignedUrl('uploads/test.mp3', 'GET', 3600);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(Object), // GetObjectCommand
        { expiresIn: 3600 }
      );

      expect(result).toBe(mockUrl);
    });

    it('should generate signed URL for upload', async () => {
      const mockUrl = 'https://bucket.s3.amazonaws.com/uploads/test.mp3?signature=def456';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const result = await storageService.getSignedUrl('uploads/test.mp3', 'PUT', 1800);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(Object), // PutObjectCommand
        { expiresIn: 1800 }
      );

      expect(result).toBe(mockUrl);
    });

    it('should use default expiration', async () => {
      const mockUrl = 'https://bucket.s3.amazonaws.com/uploads/test.mp3?signature=ghi789';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      await storageService.getSignedUrl('uploads/test.mp3', 'GET');

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockS3Client,
        expect.any(Object),
        { expiresIn: 3600 } // Default 1 hour
      );
    });

    it('should handle signing errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Signing failed'));

      await expect(
        storageService.getSignedUrl('uploads/test.mp3', 'GET')
      ).rejects.toThrow('Signing failed');
    });
  });

  describe('validateFileType', () => {
    it('should accept valid audio types', () => {
      const validTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/m4a',
        'audio/ogg',
        'audio/webm',
      ];

      validTypes.forEach(type => {
        expect(storageService.validateFileType(type)).toBe(true);
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = [
        'video/mp4',
        'image/jpeg',
        'text/plain',
        'application/pdf',
        'audio/unknown',
      ];

      invalidTypes.forEach(type => {
        expect(storageService.validateFileType(type)).toBe(false);
      });
    });

    it('should handle empty or null types', () => {
      expect(storageService.validateFileType('')).toBe(false);
      expect(storageService.validateFileType(null as any)).toBe(false);
      expect(storageService.validateFileType(undefined as any)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const validSizes = [
        1024,        // 1KB
        1024 * 1024, // 1MB  
        10 * 1024 * 1024, // 10MB
        25 * 1024 * 1024, // 25MB (at limit)
      ];

      validSizes.forEach(size => {
        expect(storageService.validateFileSize(size)).toBe(true);
      });
    });

    it('should reject files over size limit', () => {
      const invalidSizes = [
        26 * 1024 * 1024, // 26MB
        50 * 1024 * 1024, // 50MB
        100 * 1024 * 1024, // 100MB
      ];

      invalidSizes.forEach(size => {
        expect(storageService.validateFileSize(size)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(storageService.validateFileSize(0)).toBe(false); // Empty file
      expect(storageService.validateFileSize(-1)).toBe(false); // Negative size
      expect(storageService.validateFileSize(null as any)).toBe(false);
      expect(storageService.validateFileSize(undefined as any)).toBe(false);
    });
  });

  describe('generateStorageKey', () => {
    it('should generate unique keys', () => {
      const key1 = storageService.generateStorageKey('test.mp3');
      const key2 = storageService.generateStorageKey('test.mp3');

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^uploads\/.*\.mp3$/);
      expect(key2).toMatch(/^uploads\/.*\.mp3$/);
    });

    it('should preserve file extensions', () => {
      const extensions = ['mp3', 'wav', 'm4a', 'ogg'];
      
      extensions.forEach(ext => {
        const key = storageService.generateStorageKey(`test.${ext}`);
        expect(key).toEndWith(`.${ext}`);
        expect(key).toMatch(/^uploads\/.*$/);
      });
    });

    it('should handle files without extensions', () => {
      const key = storageService.generateStorageKey('audiofile');
      expect(key).toMatch(/^uploads\/.*audiofile$/);
    });

    it('should sanitize filenames', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file with spaces.mp3',
        'file@#$%^&*().mp3',
      ];

      dangerousNames.forEach(name => {
        const key = storageService.generateStorageKey(name);
        expect(key).toMatch(/^uploads\/[a-zA-Z0-9_-]+/);
        expect(key).not.toContain('..');
        expect(key).not.toContain('/');
      });
    });
  });
});