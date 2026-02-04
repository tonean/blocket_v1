/**
 * Property-based tests for VotingService
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { VotingService, VoteType } from '../services/VotingService.js';
import { RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';
import { MockAuthService } from './mocks/MockAuthService.js';

// Mock Redis client for testing
class MockRedisClient implements RedisClient {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async sAdd(key: string, members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async sMembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async incrBy(key: string, increment: number): Promise<number> {
    const current = this.store.get(key);
    const value = current ? parseInt(current, 10) : 0;
    const newValue = value + increment;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  clear(): void {
    this.store.clear();
    this.sets.clear();
  }
}

// Helper function to create a mock design
function createMockDesign(userId: string, designId: string, themeId: string): Design {
  return {
    id: designId,
    userId,
    username: `user_${userId}`,
    themeId,
    backgroundColor: '#FFFFFF',
    assets: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    submitted: true,
    voteCount: 0
  };
}

// Generators
const userIdGen = fc.string({ minLength: 5, maxLength: 20 });
const designIdGen = fc.uuid();
const themeIdGen = fc.uuid();
const voteTypeGen = fc.constantFrom(VoteType.UPVOTE, VoteType.DOWNVOTE);

describe('VotingService Property Tests', () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  // Feature: reddit-room-design-game, Property 22: Vote Count Updates
  test('Property 22: Vote Count Updates - casting a vote updates vote count by +1 or -1', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGen,
        userIdGen,
        designIdGen,
        themeIdGen,
        voteTypeGen,
        async (voterId, ownerId, designId, themeId, voteType) => {
          // Ensure voter and owner are different
          fc.pre(voterId !== ownerId);

          redis.clear();
          
          // Create auth service for the voter
          const authService = new MockAuthService({ id: voterId, username: 'voter' });
          const votingService = new VotingService(redis, authService);
          
          // Create and save a design
          const design = createMockDesign(ownerId, designId, themeId);
          await redis.set(`design:${designId}`, JSON.stringify(design));

          const initialVoteCount = design.voteCount;

          // Cast a vote
          await votingService.castVote(voterId, designId, voteType);

          // Load the design and check vote count
          const updatedDesignData = await redis.get(`design:${designId}`);
          expect(updatedDesignData).toBeDefined();
          
          const updatedDesign = JSON.parse(updatedDesignData!) as Design;
          const expectedDelta = voteType === VoteType.UPVOTE ? 1 : -1;
          
          expect(updatedDesign.voteCount).toBe(initialVoteCount + expectedDelta);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 23: Self-Vote Prevention
  test('Property 23: Self-Vote Prevention - users cannot vote on their own designs', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGen,
        designIdGen,
        themeIdGen,
        voteTypeGen,
        async (userId, designId, themeId, voteType) => {
          redis.clear();
          
          // Create auth service for the user
          const authService = new MockAuthService({ id: userId, username: 'user' });
          const votingService = new VotingService(redis, authService);
          
          // Create and save a design owned by the user
          const design = createMockDesign(userId, designId, themeId);
          await redis.set(`design:${designId}`, JSON.stringify(design));

          const initialVoteCount = design.voteCount;

          // Attempt to vote on own design - should throw error
          await expect(
            votingService.castVote(userId, designId, voteType)
          ).rejects.toThrow('Users cannot vote on their own designs');

          // Verify vote count remains unchanged
          const updatedDesignData = await redis.get(`design:${designId}`);
          expect(updatedDesignData).toBeDefined();
          
          const updatedDesign = JSON.parse(updatedDesignData!) as Design;
          expect(updatedDesign.voteCount).toBe(initialVoteCount);

          // Verify no vote was stored
          const vote = await votingService.getUserVote(userId, designId);
          expect(vote).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 24: Vote Change Handling
  test('Property 24: Vote Change Handling - changing vote updates count by ±2', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdGen,
        userIdGen,
        designIdGen,
        themeIdGen,
        voteTypeGen,
        async (voterId, ownerId, designId, themeId, initialVoteType) => {
          // Ensure voter and owner are different
          fc.pre(voterId !== ownerId);

          redis.clear();
          
          // Create auth service for the voter
          const authService = new MockAuthService({ id: voterId, username: 'voter' });
          const votingService = new VotingService(redis, authService);
          
          // Create and save a design
          const design = createMockDesign(ownerId, designId, themeId);
          await redis.set(`design:${designId}`, JSON.stringify(design));

          // Cast initial vote
          await votingService.castVote(voterId, designId, initialVoteType);

          // Get vote count after initial vote
          const afterInitialVoteData = await redis.get(`design:${designId}`);
          const afterInitialVote = JSON.parse(afterInitialVoteData!) as Design;
          const voteCountAfterInitial = afterInitialVote.voteCount;

          // Change vote to opposite type
          const newVoteType = initialVoteType === VoteType.UPVOTE ? VoteType.DOWNVOTE : VoteType.UPVOTE;
          await votingService.changeVote(voterId, designId, newVoteType);

          // Get vote count after change
          const afterChangeData = await redis.get(`design:${designId}`);
          const afterChange = JSON.parse(afterChangeData!) as Design;

          // Verify vote count changed by ±2
          const expectedDelta = newVoteType === VoteType.UPVOTE ? 2 : -2;
          expect(afterChange.voteCount).toBe(voteCountAfterInitial + expectedDelta);

          // Verify the vote was updated
          const updatedVote = await votingService.getUserVote(voterId, designId);
          expect(updatedVote).not.toBeNull();
          expect(updatedVote!.voteType).toBe(newVoteType);
        }
      ),
      { numRuns: 100 }
    );
  });
});
