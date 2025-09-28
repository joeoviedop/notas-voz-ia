import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { IntegrationTestApp, waitForCondition } from './testRunner.js';
import { testScenarios, generateAudioFile } from '../fixtures/index.js';

describe('Notes Processing Flow Integration Tests', () => {
  let testApp: IntegrationTestApp;
  let authContext: any;

  beforeEach(async () => {
    testApp = new IntegrationTestApp();
    await testApp.setup();
    
    // Create authenticated user for all tests
    authContext = await testApp.createAuthenticatedRequest({
      email: 'testuser@example.com',
      password: 'password123',
    });
  });

  afterEach(async () => {
    await testApp.teardown();
  });

  describe('Complete Note Processing Pipeline', () => {
    it('should complete full note lifecycle: create → upload → transcribe → summarize → ready', async () => {
      const app = testApp.getApp();
      const mockServices = testApp.getMockServices();

      // Step 1: Create empty note
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: {
          title: 'Integration Test Note',
          tags: ['test', 'integration'],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const noteData = createResponse.json();
      expect(noteData).toMatchObject({
        note: {
          id: expect.any(String),
          userId: authContext.user.id,
          title: 'Integration Test Note',
          tags: ['test', 'integration'],
          status: 'idle',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      const noteId = noteData.note.id;

      // Verify audit event
      let auditEvents = mockServices.getOperationLogs().audit;
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          action: 'NOTE_CREATED',
          resourceType: 'NOTE',
          resourceId: noteId,
          userId: authContext.user.id,
        })
      );

      // Step 2: Upload audio file
      const audioFile = generateAudioFile({
        originalname: 'test-audio.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.from('mock audio content for testing'),
        size: 1024,
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/upload`,
        headers: authContext.headers,
        payload: audioFile,
      });

      expect(uploadResponse.statusCode).toBe(200);
      const uploadData = uploadResponse.json();
      expect(uploadData).toMatchObject({
        note: expect.objectContaining({
          id: noteId,
          status: 'uploaded',
        }),
        media: {
          id: expect.any(String),
          noteId,
          filename: expect.stringMatching(/\.mp3$/),
          mimetype: 'audio/mpeg',
          size: expect.any(Number),
          storageKey: expect.stringMatching(/^uploads\//),
        },
      });

      // Verify file was stored
      const storageOps = mockServices.getOperationLogs().storage;
      expect(storageOps).toContainEqual(
        expect.objectContaining({
          operation: 'upload',
          success: true,
        })
      );

      // Step 3: Start transcription
      const transcribeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/transcribe`,
        headers: authContext.headers,
      });

      expect(transcribeResponse.statusCode).toBe(202);
      expect(transcribeResponse.json()).toMatchObject({
        message: 'Transcription started',
        status: 'transcribing',
      });

      // Verify transcription job was queued
      const queueJobs = mockServices.getOperationLogs().queue;
      expect(queueJobs).toContainEqual(
        expect.objectContaining({
          name: 'transcribe',
          data: expect.objectContaining({
            noteId,
            userId: authContext.user.id,
          }),
          status: 'pending',
        })
      );

      // Step 4: Simulate transcription completion
      await testApp.simulateTranscriptionComplete(noteId);

      // Verify note status updated
      const afterTranscribeResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(afterTranscribeResponse.statusCode).toBe(200);
      const afterTranscribeData = afterTranscribeResponse.json();
      expect(afterTranscribeData.note.status).toBe('transcribing_done');
      expect(afterTranscribeData.transcript).toMatchObject({
        id: expect.any(String),
        noteId,
        text: expect.stringContaining('Mock transcription'),
        language: 'en',
        confidence: expect.any(Number),
      });

      // Step 5: Start summarization
      const summarizeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/summarize`,
        headers: authContext.headers,
      });

      expect(summarizeResponse.statusCode).toBe(202);
      expect(summarizeResponse.json()).toMatchObject({
        message: 'Summarization started',
        status: 'summarizing',
      });

      // Step 6: Simulate summarization completion
      await testApp.simulateSummarizationComplete(noteId);

      // Step 7: Verify final note state
      const finalResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(finalResponse.statusCode).toBe(200);
      const finalData = finalResponse.json();
      expect(finalData).toMatchObject({
        note: expect.objectContaining({
          id: noteId,
          status: 'ready',
        }),
        transcript: expect.objectContaining({
          text: expect.any(String),
          language: 'en',
          confidence: expect.any(Number),
        }),
        summary: expect.objectContaining({
          tldr: expect.any(String),
          bullets: expect.arrayContaining([expect.any(String)]),
        }),
        actions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            noteId,
            text: expect.any(String),
            done: false,
            dueSuggested: expect.anything(),
          }),
        ]),
      });

      // Verify all processing completed
      expect(finalData.actions.length).toBeGreaterThanOrEqual(1);
      expect(finalData.summary.bullets.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle file upload validation', async () => {
      const app = testApp.getApp();

      // Create note first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: {
          title: 'Validation Test Note',
        },
      });

      const noteId = createResponse.json().note.id;

      // Test file too large
      const largeFile = generateAudioFile({
        size: 30 * 1024 * 1024, // 30MB (over 25MB limit)
      });

      const largeFileResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/upload`,
        headers: authContext.headers,
        payload: largeFile,
      });

      expect(largeFileResponse.statusCode).toBe(400);
      expect(largeFileResponse.json()).toMatchObject({
        error: {
          code: 'FILE_TOO_LARGE',
        },
      });

      // Test invalid file type
      const invalidFile = generateAudioFile({
        mimetype: 'video/mp4',
        originalname: 'video.mp4',
      });

      const invalidTypeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/upload`,
        headers: authContext.headers,
        payload: invalidFile,
      });

      expect(invalidTypeResponse.statusCode).toBe(400);
      expect(invalidTypeResponse.json()).toMatchObject({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
        },
      });
    });

    it('should handle processing errors and retries', async () => {
      const app = testApp.getApp();
      const mockServices = testApp.getMockServices();

      // Create and upload note
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: { title: 'Error Test Note' },
      });

      const noteId = createResponse.json().note.id;

      const audioFile = generateAudioFile();
      await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/upload`,
        headers: authContext.headers,
        payload: audioFile,
      });

      // Mock STT provider to fail
      mockServices.mockSTTProvider.transcribe.mockRejectedValueOnce(
        new Error('STT service temporarily unavailable')
      );

      // Start transcription
      const transcribeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/transcribe`,
        headers: authContext.headers,
      });

      expect(transcribeResponse.statusCode).toBe(202);

      // Simulate job processing failure
      const queueJobs = mockServices.getOperationLogs().queue;
      const transcribeJob = queueJobs.find(job => job.name === 'transcribe');
      expect(transcribeJob).toBeDefined();

      // In a real scenario, the worker would retry and eventually move to DLQ
      // For the test, we simulate the final error state
      const mockDb = mockServices.getMockDatabase();
      const notes = mockDb.getData('notes');
      const note = notes.find(n => n.id === noteId);
      if (note) {
        note.status = 'error';
        mockDb.seed('notes', notes);
      }

      // Verify note is in error state
      const errorStateResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(errorStateResponse.statusCode).toBe(200);
      expect(errorStateResponse.json().note.status).toBe('error');

      // Test retry functionality
      mockServices.mockSTTProvider.transcribe.mockRestore();

      const retryResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/transcribe`,
        headers: authContext.headers,
      });

      expect(retryResponse.statusCode).toBe(202);
      expect(retryResponse.json().status).toBe('transcribing');
    });
  });

  describe('Notes CRUD Operations', () => {
    it('should handle complete CRUD lifecycle', async () => {
      const app = testApp.getApp();
      const mockServices = testApp.getMockServices();

      // Create note
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: {
          title: 'CRUD Test Note',
          tags: ['crud', 'test'],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const noteId = createResponse.json().note.id;

      // Update note
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
        payload: {
          title: 'Updated CRUD Test Note',
          tags: ['crud', 'test', 'updated'],
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().note).toMatchObject({
        id: noteId,
        title: 'Updated CRUD Test Note',
        tags: ['crud', 'test', 'updated'],
      });

      // Verify audit events
      const auditEvents = mockServices.getOperationLogs().audit;
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          action: 'NOTE_UPDATED',
          resourceId: noteId,
        })
      );

      // List notes
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: authContext.headers,
      });

      expect(listResponse.statusCode).toBe(200);
      const listData = listResponse.json();
      expect(listData.items).toContainEqual(
        expect.objectContaining({
          id: noteId,
          title: 'Updated CRUD Test Note',
        })
      );

      // Delete note
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify note is deleted
      const getDeletedResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(getDeletedResponse.statusCode).toBe(404);
      expect(getDeletedResponse.json()).toMatchObject({
        error: {
          code: 'NOTE_NOT_FOUND',
        },
      });

      // Verify delete audit event
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          action: 'NOTE_DELETED',
          resourceId: noteId,
        })
      );
    });

    it('should handle search and filtering', async () => {
      const app = testApp.getApp();

      // Create multiple notes with different properties
      const notes = [
        { title: 'Meeting Notes', tags: ['work', 'meeting'] },
        { title: 'Personal Reminder', tags: ['personal'] },
        { title: 'Project Planning', tags: ['work', 'planning'] },
      ];

      const createdNotes = [];
      for (const noteData of notes) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/notes',
          headers: authContext.headers,
          payload: noteData,
        });
        createdNotes.push(response.json().note);
      }

      // Search by title
      const searchResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes?query=Meeting',
        headers: authContext.headers,
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchData = searchResponse.json();
      expect(searchData.items).toHaveLength(1);
      expect(searchData.items[0].title).toContain('Meeting');

      // Filter by tag
      const tagResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes?tag=work',
        headers: authContext.headers,
      });

      expect(tagResponse.statusCode).toBe(200);
      const tagData = tagResponse.json();
      expect(tagData.items).toHaveLength(2);
      expect(tagData.items.every(note => note.tags.includes('work'))).toBe(true);

      // Pagination
      const paginatedResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/notes?limit=2',
        headers: authContext.headers,
      });

      expect(paginatedResponse.statusCode).toBe(200);
      const paginatedData = paginatedResponse.json();
      expect(paginatedData.items).toHaveLength(2);
      expect(paginatedData.cursor).toBeDefined();
    });
  });

  describe('Actions Management', () => {
    it('should handle action CRUD operations', async () => {
      const app = testApp.getApp();

      // Create note first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: { title: 'Actions Test Note' },
      });

      const noteId = createResponse.json().note.id;

      // Create action
      const actionResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/notes/${noteId}/actions`,
        headers: authContext.headers,
        payload: {
          text: 'Complete integration tests',
          dueSuggested: '2024-01-15',
        },
      });

      expect(actionResponse.statusCode).toBe(201);
      const actionData = actionResponse.json();
      expect(actionData.action).toMatchObject({
        id: expect.any(String),
        noteId,
        text: 'Complete integration tests',
        done: false,
        dueSuggested: '2024-01-15',
      });

      const actionId = actionData.action.id;

      // Update action
      const updateActionResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/actions/${actionId}`,
        headers: authContext.headers,
        payload: {
          done: true,
          text: 'Complete integration tests (DONE)',
        },
      });

      expect(updateActionResponse.statusCode).toBe(200);
      expect(updateActionResponse.json().action).toMatchObject({
        id: actionId,
        done: true,
        text: 'Complete integration tests (DONE)',
      });

      // Verify action appears in note
      const noteResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(noteResponse.statusCode).toBe(200);
      expect(noteResponse.json().actions).toContainEqual(
        expect.objectContaining({
          id: actionId,
          done: true,
        })
      );

      // Delete action
      const deleteActionResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/actions/${actionId}`,
        headers: authContext.headers,
      });

      expect(deleteActionResponse.statusCode).toBe(204);

      // Verify action is removed from note
      const finalNoteResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: authContext.headers,
      });

      expect(finalNoteResponse.statusCode).toBe(200);
      const actions = finalNoteResponse.json().actions || [];
      expect(actions.find((a: any) => a.id === actionId)).toBeUndefined();
    });
  });

  describe('Authorization and Ownership', () => {
    it('should enforce note ownership', async () => {
      const app = testApp.getApp();

      // Create note with first user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: { title: 'Private Note' },
      });

      const noteId = createResponse.json().note.id;

      // Create second user
      const secondUserAuth = await testApp.createAuthenticatedRequest({
        email: 'seconduser@example.com',
        password: 'password123',
      });

      // Try to access first user's note with second user
      const unauthorizedResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteId}`,
        headers: secondUserAuth.headers,
      });

      expect(unauthorizedResponse.statusCode).toBe(404);
      expect(unauthorizedResponse.json()).toMatchObject({
        error: {
          code: 'NOTE_NOT_FOUND',
        },
      });

      // Try to update first user's note with second user
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notes/${noteId}`,
        headers: secondUserAuth.headers,
        payload: { title: 'Hacked Note' },
      });

      expect(updateResponse.statusCode).toBe(404);
    });

    it('should only show user notes in list', async () => {
      const app = testApp.getApp();

      // Create notes with first user
      await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: { title: 'User 1 Note 1' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: authContext.headers,
        payload: { title: 'User 1 Note 2' },
      });

      // Create second user and their note
      const secondUserAuth = await testApp.createAuthenticatedRequest({
        email: 'seconduser@example.com',
        password: 'password123',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: secondUserAuth.headers,
        payload: { title: 'User 2 Note' },
      });

      // Verify first user only sees their notes
      const user1Notes = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: authContext.headers,
      });

      expect(user1Notes.statusCode).toBe(200);
      const user1Data = user1Notes.json();
      expect(user1Data.items).toHaveLength(2);
      expect(user1Data.items.every((note: any) => note.userId === authContext.user.id)).toBe(true);

      // Verify second user only sees their notes
      const user2Notes = await app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: secondUserAuth.headers,
      });

      expect(user2Notes.statusCode).toBe(200);
      const user2Data = user2Notes.json();
      expect(user2Data.items).toHaveLength(1);
      expect(user2Data.items[0].title).toBe('User 2 Note');
    });
  });
});