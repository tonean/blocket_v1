/**
 * Property-based tests for LeaderboardHandler
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { LeaderboardHandler } from '../handlers/LeaderboardHandler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design, LeaderboardEntry } from '../types/models.js';

// Mock Redis client with sorted set support
class MockRedisClient implements RedisClient {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private sortedSets: Map<string, Map<string, number>> = new Map();

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

  async zAdd(key: string, members: { member: string; score: number }[]): Promise<number> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    const sortedSet = this.sortedSets.get(key)!;
    let added = 0;
    for (const { member, score } of members) {
      if (!sortedSet.has(member)) {
        added++;
      }
      sortedSet.set(member, score);
    }
    return added;
  }

  async zRevRange(key: string, start: number, stop: number): Promise<string[]> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) {
      return [];
    }

    // Sort by score descending
    const entries = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
    
    // Handle negative indices
    const length = entries.length;
    const actualStart = start < 0 ? Math.max(0, length + start) : start;
    const actualStop = stop < 0 ? length + stop : stop;

    return entries.slice(actualStart, actualStop + 1).map(([member]) => member);
  }

  async zRevRank(key: string, member: string): Promise<number | undefined> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet || !sortedSet.has(member)) {
      return undefined;
    }

    // Sort by score descending
    const entries = Array.from(sortedSet.entries()).sort((a, b) => b[1] - a[1]);
    
    // Find the rank (0-based)
    const rank = entries.findIndex(([m]) => m === member);
    return rank >= 0 ? rank : undefined;
  }

  async zIncrBy(key: string, increment: number, member: string): Promise<number> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    const sortedSet = this.sortedSets.get(key)!;
    const currentScore = sortedSet.get(member) || 0;
    const newScore = currentScore + increment;
    sortedSet.set(member, newScore);
    return newScore;
  }

  clear(): void {
    this.store.clear();
    this.sets.clear();
    this.sortedSets.clear();
  }
}

// Helper function to create a mock design
function createMockDesign(
  userId: string,
  designId: string,
  themeId: string,
  voteCount: number = 0
): Design {
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
    voteCount
  };
}

// Generators
const userIdGen = fc.string({ minLength: 5, maxLength: 20 });
const designIdGen = fc.uuid();
const themeIdGen = fc.uuid();
const voteCountGen = fc.integer({ min: -100, max: 1000 });

describe('LeaderboardHandler Property Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let leaderboardHandler: LeaderboardHandler;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    leaderboardHandler = new LeaderboardHandler(storage);
  });

  // Feature: reddit-room-design-game, Property 12: Leaderboard Ranking Order
  test('Property 12: Leaderboard Ranking Order - designs sorted by vote count descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        themeIdGen,
        fc.array(
          fc.record({
            userId: userIdGen,
            designId: designIdGen,
            voteCount: voteCountGen
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (themeId, designData) => {
          // Ensure unique design IDs
          const uniqueDesigns = Array.from(
            new Map(designData.map(d => [d.designId, d])).values()
          );
          fc.pre(uniqueDesigns.length >= 2);

          redis.clear();

          // Create and save designs, add to leaderboard
          for (const { userId, designId, voteCount } of uniqueDesigns) {
            const design = createMockDesign(userId, designId, themeId, voteCount);
            await storage.saveDesign(design);
            
            // Add to leaderboard sorted set
            await redis.zAdd(`leaderboard:${themeId}`, [
              { member: designId, score: voteCount }
            ]);
          }

          // Get top designs
          const topDesigns = await leaderboardHandler.getTopDesigns(themeId, uniqueDesigns.length);

          // Verify designs are sorted by vote count descending
          for (let i = 0; i < topDesigns.length - 1; i++) {
            expect(topDesigns[i].voteCount).toBeGreaterThanOrEqual(topDesigns[i + 1].voteCount);
          }

          // Verify all designs are included
          expect(topDesigns.length).toBe(uniqueDesigns.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 13: Leaderboard Entry Completeness
  test('Property 13: Leaderboard Entry Completeness - entries contain required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        themeIdGen,
        fc.array(
          fc.record({
            userId: userIdGen,
            designId: designIdGen,
            voteCount: voteCountGen
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (themeId, designData) => {
          // Ensure unique design IDs
          const uniqueDesigns = Array.from(
            new Map(designData.map(d => [d.designId, d])).values()
          );

          redis.clear();

          // Create and save designs, add to leaderboard
          for (const { userId, designId, voteCount } of uniqueDesigns) {
            const design = createMockDesign(userId, designId, themeId, voteCount);
            await storage.saveDesign(design);
            
            // Add to leaderboard sorted set
            await redis.zAdd(`leaderboard:${themeId}`, [
              { member: designId, score: voteCount }
            ]);
          }

          // Get leaderboard entries
          const entries = await leaderboardHandler.getLeaderboardByTheme(themeId);

          // Verify each entry has required fields
          for (const entry of entries) {
            expect(entry).toHaveProperty('rank');
            expect(entry).toHaveProperty('design');
            expect(entry).toHaveProperty('username');
            expect(entry).toHaveProperty('voteCount');

            // Verify rank is a positive integer
            expect(entry.rank).toBeGreaterThan(0);
            expect(Number.isInteger(entry.rank)).toBe(true);

            // Verify username matches design username
            expect(entry.username).toBe(entry.design.username);

            // Verify vote count matches design vote count
            expect(entry.voteCount).toBe(entry.design.voteCount);

            // Verify design is valid
            expect(entry.design.id).toBeDefined();
            expect(entry.design.userId).toBeDefined();
            expect(entry.design.themeId).toBe(themeId);
          }

          // Verify ranks are sequential starting from 1
          for (let i = 0; i < entries.length; i++) {
            expect(entries[i].rank).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 14: Theme-Based Filtering
  test('Property 14: Theme-Based Filtering - only designs from specified theme are returned', async () => {
    await fc.assert(
      fc.asyncProperty(
        themeIdGen,
        themeIdGen,
        fc.array(
          fc.record({
            userId: userIdGen,
            designId: designIdGen,
            voteCount: voteCountGen
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.record({
            userId: userIdGen,
            designId: designIdGen,
            voteCount: voteCountGen
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (targetThemeId, otherThemeId, targetDesigns, otherDesigns) => {
          // Ensure themes are different
          fc.pre(targetThemeId !== otherThemeId);

          // Ensure unique design IDs within each theme
          const uniqueTargetDesigns = Array.from(
            new Map(targetDesigns.map(d => [d.designId, d])).values()
          );
          const uniqueOtherDesigns = Array.from(
            new Map(otherDesigns.map(d => [d.designId, d])).values()
          );

          // Ensure no overlap between design IDs
          const allDesignIds = new Set([
            ...uniqueTargetDesigns.map(d => d.designId),
            ...uniqueOtherDesigns.map(d => d.designId)
          ]);
          fc.pre(allDesignIds.size === uniqueTargetDesigns.length + uniqueOtherDesigns.length);

          redis.clear();

          // Create and save designs for target theme
          for (const { userId, designId, voteCount } of uniqueTargetDesigns) {
            const design = createMockDesign(userId, designId, targetThemeId, voteCount);
            await storage.saveDesign(design);
            await redis.zAdd(`leaderboard:${targetThemeId}`, [
              { member: designId, score: voteCount }
            ]);
          }

          // Create and save designs for other theme
          for (const { userId, designId, voteCount } of uniqueOtherDesigns) {
            const design = createMockDesign(userId, designId, otherThemeId, voteCount);
            await storage.saveDesign(design);
            await redis.zAdd(`leaderboard:${otherThemeId}`, [
              { member: designId, score: voteCount }
            ]);
          }

          // Get leaderboard for target theme
          const targetLeaderboard = await leaderboardHandler.getLeaderboardByTheme(targetThemeId);

          // Verify all returned designs belong to target theme
          for (const entry of targetLeaderboard) {
            expect(entry.design.themeId).toBe(targetThemeId);
          }

          // Verify no designs from other theme are included
          const targetDesignIds = new Set(targetLeaderboard.map(e => e.design.id));
          for (const { designId } of uniqueOtherDesigns) {
            expect(targetDesignIds.has(designId)).toBe(false);
          }

          // Verify all target theme designs are included
          expect(targetLeaderboard.length).toBe(uniqueTargetDesigns.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
