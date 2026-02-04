/**
 * Integration tests for authentication in submission and voting flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { VotingService, VoteType } from '../services/VotingService.js';
import { AuthService } from '../services/AuthService.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';
import { Context } from '@devvit/public-api';

describe('Authentication Integration Tests', () => {
  let mockRedis: RedisClient;
  let mockContext: Context;
  let storage: StorageService;
  let authService: AuthService;

  beforeEach(() => {
    // Create mock Redis client
    const redisStore = new Map<string, string>();
    const redisSetStore = new Map<string, Set<string>>();

    mockRedis = {
      get: vi.fn(async (key: string) => redisStore.get(key)),
      set: vi.fn(async (key: string, value: string) => {
        redisStore.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        redisStore.delete(key);
      }),
      sAdd: vi.fn(async (key: string, members: string[]) => {
        if (!redisSetStore.has(key)) {
          redisSetStore.set(key, new Set());
        }
        members.forEach(m => redisSetStore.get(key)!.add(m));
      }),
      sMembers: vi.fn(async (key: string) => {
        return Array.from(redisSetStore.get(key) || []);
      }),
      zAdd: vi.fn(),
      zRevRange: vi.fn(),
      zRevRank: vi.fn(),
      zIncrBy: vi.fn(),
    };

    // Create mock context
    mockContext = {
      reddit: {
        getCurrentUser: vi.fn(),
      },
    } as unknown as Context;

    storage = new StorageService(mockRedis);
    authService = new AuthService(mockContext);
  });

  describe('SubmissionHandler with Authentication', () => {
    it('should successfully submit design when user is authenticated', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const submissionHandler = new SubmissionHandler(storage, authService);

      const design: Design = {
        id: 'design_1',
        userId: 'user_123',
        username: 'testuser',
        themeId: 'theme_1',
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: false,
        voteCount: 0,
      };

      const designId = await submissionHandler.submitDesign(design);

      expect(designId).toBe('design_1');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should reject submission when user is not authenticated', async () => {
      // Mock unauthenticated user
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const submissionHandler = new SubmissionHandler(storage, authService);

      const design: Design = {
        id: 'design_1',
        userId: 'user_123',
        username: 'testuser',
        themeId: 'theme_1',
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: false,
        voteCount: 0,
      };

      await expect(submissionHandler.submitDesign(design)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('should reject submission when design does not belong to authenticated user', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const submissionHandler = new SubmissionHandler(storage, authService);

      const design: Design = {
        id: 'design_1',
        userId: 'user_456', // Different user
        username: 'otheruser',
        themeId: 'theme_1',
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: false,
        voteCount: 0,
      };

      await expect(submissionHandler.submitDesign(design)).rejects.toThrow(
        'Cannot submit a design that does not belong to you'
      );
    });
  });

  describe('VotingService with Authentication', () => {
    it('should successfully cast vote when user is authenticated', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      // Create a design owned by another user
      const design: Design = {
        id: 'design_1',
        userId: 'user_456',
        username: 'otheruser',
        themeId: 'theme_1',
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 0,
      };

      await storage.saveDesign(design);

      const votingService = new VotingService(mockRedis, authService);

      await votingService.castVote('user_123', 'design_1', VoteType.UPVOTE);

      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should reject vote when user is not authenticated', async () => {
      // Mock unauthenticated user
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const votingService = new VotingService(mockRedis, authService);

      await expect(
        votingService.castVote('user_123', 'design_1', VoteType.UPVOTE)
      ).rejects.toThrow('Authentication required');
    });

    it('should reject vote when userId does not match authenticated user', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const votingService = new VotingService(mockRedis, authService);

      await expect(
        votingService.castVote('user_456', 'design_1', VoteType.UPVOTE)
      ).rejects.toThrow('Cannot cast vote for another user');
    });

    it('should successfully change vote when user is authenticated', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      // Create a design owned by another user
      const design: Design = {
        id: 'design_1',
        userId: 'user_456',
        username: 'otheruser',
        themeId: 'theme_1',
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 1,
      };

      await storage.saveDesign(design);

      const votingService = new VotingService(mockRedis, authService);

      // Cast initial vote
      await votingService.castVote('user_123', 'design_1', VoteType.UPVOTE);

      // Change vote
      await votingService.changeVote('user_123', 'design_1', VoteType.DOWNVOTE);

      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should reject vote change when user is not authenticated', async () => {
      // Mock unauthenticated user
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const votingService = new VotingService(mockRedis, authService);

      await expect(
        votingService.changeVote('user_123', 'design_1', VoteType.DOWNVOTE)
      ).rejects.toThrow('Authentication required');
    });
  });
});
