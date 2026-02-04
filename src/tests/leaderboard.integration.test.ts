/**
 * Integration tests for Leaderboard component
 * Feature: reddit-room-design-game
 * Tests Requirements: 6.1, 6.3, 6.5
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { LeaderboardHandler } from '../handlers/LeaderboardHandler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';

// Mock Redis client for testing
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
    if (!sortedSet) return [];
    
    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const end = stop === -1 ? entries.length : stop + 1;
    return entries.slice(start, end).map(([member]) => member);
  }

  async zRevRank(key: string, member: string): Promise<number | undefined> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet || !sortedSet.has(member)) return undefined;
    
    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return entries.findIndex(([m]) => m === member);
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

describe('Leaderboard Integration Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let leaderboardHandler: LeaderboardHandler;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    leaderboardHandler = new LeaderboardHandler(storage);
  });

  /**
   * Test leaderboard display with various vote counts
   * Requirement 6.1: Designs ranked by vote count for current theme
   * Requirement 6.3: Display design creator, vote count, and rank
   */
  test('leaderboard displays designs with correct ranking and metadata', async () => {
    const themeId = 'theme_school_001';

    // Create designs with different vote counts
    const designs: Design[] = [
      {
        id: 'design_leader_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [
          { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
          { assetId: 'chair_1', x: 150, y: 150, rotation: 0, zIndex: 2 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 42,
      },
      {
        id: 'design_leader_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [
          { assetId: 'bookshelf_1', x: 200, y: 100, rotation: 0, zIndex: 1 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 15,
      },
      {
        id: 'design_leader_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 28,
      },
      {
        id: 'design_leader_004',
        userId: 'user_diana',
        username: 'diana',
        themeId,
        backgroundColor: '#E0FFE0',
        assets: [
          { assetId: 'lamp', x: 120, y: 80, rotation: 0, zIndex: 1 },
          { assetId: 'rug_1', x: 180, y: 220, rotation: 0, zIndex: 2 },
          { assetId: 'clock', x: 90, y: 50, rotation: 0, zIndex: 3 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 7,
      },
      {
        id: 'design_leader_005',
        userId: 'user_eve',
        username: 'eve',
        themeId,
        backgroundColor: '#FFF0E0',
        assets: [
          { assetId: 'desk', x: 100, y: 100, rotation: 90, zIndex: 1 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: -3,
      },
    ];

    // Save designs and add to leaderboard
    for (const design of designs) {
      await storage.saveDesign(design);
      await redis.zAdd(`leaderboard:${themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get leaderboard entries
    const entries = await leaderboardHandler.getLeaderboardByTheme(themeId);

    // Verify correct number of entries
    expect(entries.length).toBe(5);

    // Verify ranking order (Requirement 6.1)
    expect(entries[0].design.id).toBe('design_leader_001'); // 42 votes
    expect(entries[1].design.id).toBe('design_leader_003'); // 28 votes
    expect(entries[2].design.id).toBe('design_leader_002'); // 15 votes
    expect(entries[3].design.id).toBe('design_leader_004'); // 7 votes
    expect(entries[4].design.id).toBe('design_leader_005'); // -3 votes

    // Verify ranks are sequential (Requirement 6.3)
    expect(entries[0].rank).toBe(1);
    expect(entries[1].rank).toBe(2);
    expect(entries[2].rank).toBe(3);
    expect(entries[3].rank).toBe(4);
    expect(entries[4].rank).toBe(5);

    // Verify vote counts match (Requirement 6.3)
    expect(entries[0].voteCount).toBe(42);
    expect(entries[1].voteCount).toBe(28);
    expect(entries[2].voteCount).toBe(15);
    expect(entries[3].voteCount).toBe(7);
    expect(entries[4].voteCount).toBe(-3);

    // Verify usernames are present (Requirement 6.3)
    expect(entries[0].username).toBe('alice');
    expect(entries[1].username).toBe('charlie');
    expect(entries[2].username).toBe('bob');
    expect(entries[3].username).toBe('diana');
    expect(entries[4].username).toBe('eve');

    // Verify all entries have required metadata
    for (const entry of entries) {
      expect(entry.rank).toBeGreaterThan(0);
      expect(entry.design).toBeDefined();
      expect(entry.username).toBeDefined();
      expect(entry.username.length).toBeGreaterThan(0);
      expect(typeof entry.voteCount).toBe('number');
    }
  });

  /**
   * Test theme filtering
   * Requirement 6.5: Allow filtering by current theme or past themes
   */
  test('leaderboard filters designs by theme correctly', async () => {
    const theme1 = 'theme_school_001';
    const theme2 = 'theme_office_001';
    const theme3 = 'theme_bedroom_001';

    // Create designs for theme 1
    const theme1Designs: Design[] = [
      {
        id: 'design_theme1_001',
        userId: 'user_alice',
        username: 'alice',
        themeId: theme1,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 25,
      },
      {
        id: 'design_theme1_002',
        userId: 'user_bob',
        username: 'bob',
        themeId: theme1,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 18,
      },
      {
        id: 'design_theme1_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId: theme1,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 10,
      },
    ];

    // Create designs for theme 2
    const theme2Designs: Design[] = [
      {
        id: 'design_theme2_001',
        userId: 'user_diana',
        username: 'diana',
        themeId: theme2,
        backgroundColor: '#E0FFE0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 30,
      },
      {
        id: 'design_theme2_002',
        userId: 'user_eve',
        username: 'eve',
        themeId: theme2,
        backgroundColor: '#FFF0E0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 12,
      },
    ];

    // Create designs for theme 3
    const theme3Designs: Design[] = [
      {
        id: 'design_theme3_001',
        userId: 'user_frank',
        username: 'frank',
        themeId: theme3,
        backgroundColor: '#F0E0FF',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 5,
      },
    ];

    // Save all designs and add to respective leaderboards
    for (const design of [...theme1Designs, ...theme2Designs, ...theme3Designs]) {
      await storage.saveDesign(design);
      await redis.zAdd(`leaderboard:${design.themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get leaderboard for theme 1
    const leaderboard1 = await leaderboardHandler.getLeaderboardByTheme(theme1);
    expect(leaderboard1.length).toBe(3);
    expect(leaderboard1.every(e => e.design.themeId === theme1)).toBe(true);
    expect(leaderboard1[0].design.id).toBe('design_theme1_001'); // Highest votes
    expect(leaderboard1[1].design.id).toBe('design_theme1_002');
    expect(leaderboard1[2].design.id).toBe('design_theme1_003');

    // Get leaderboard for theme 2
    const leaderboard2 = await leaderboardHandler.getLeaderboardByTheme(theme2);
    expect(leaderboard2.length).toBe(2);
    expect(leaderboard2.every(e => e.design.themeId === theme2)).toBe(true);
    expect(leaderboard2[0].design.id).toBe('design_theme2_001'); // Highest votes
    expect(leaderboard2[1].design.id).toBe('design_theme2_002');

    // Get leaderboard for theme 3
    const leaderboard3 = await leaderboardHandler.getLeaderboardByTheme(theme3);
    expect(leaderboard3.length).toBe(1);
    expect(leaderboard3.every(e => e.design.themeId === theme3)).toBe(true);
    expect(leaderboard3[0].design.id).toBe('design_theme3_001');

    // Verify no cross-contamination between themes
    const theme1Ids = new Set(leaderboard1.map(e => e.design.id));
    const theme2Ids = new Set(leaderboard2.map(e => e.design.id));
    const theme3Ids = new Set(leaderboard3.map(e => e.design.id));

    for (const id of theme2Ids) {
      expect(theme1Ids.has(id)).toBe(false);
    }
    for (const id of theme3Ids) {
      expect(theme1Ids.has(id)).toBe(false);
      expect(theme2Ids.has(id)).toBe(false);
    }
  });

  /**
   * Test leaderboard with tied vote counts
   * Requirement 6.1: Consistent ranking for tied designs
   */
  test('leaderboard handles tied vote counts consistently', async () => {
    const themeId = 'theme_tied_001';

    // Create designs with tied vote counts
    const designs: Design[] = [
      {
        id: 'design_tied_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now() - 3000,
        updatedAt: Date.now() - 3000,
        submitted: true,
        voteCount: 20,
      },
      {
        id: 'design_tied_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now() - 2000,
        updatedAt: Date.now() - 2000,
        submitted: true,
        voteCount: 20,
      },
      {
        id: 'design_tied_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        submitted: true,
        voteCount: 15,
      },
    ];

    // Save designs and add to leaderboard
    for (const design of designs) {
      await storage.saveDesign(design);
      await redis.zAdd(`leaderboard:${themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get leaderboard entries
    const entries = await leaderboardHandler.getLeaderboardByTheme(themeId);

    // Verify correct number of entries
    expect(entries.length).toBe(3);

    // Verify tied designs both have higher rank than lower-voted design
    expect(entries[0].voteCount).toBe(20);
    expect(entries[1].voteCount).toBe(20);
    expect(entries[2].voteCount).toBe(15);

    // Verify ranks are sequential
    expect(entries[0].rank).toBe(1);
    expect(entries[1].rank).toBe(2);
    expect(entries[2].rank).toBe(3);
  });

  /**
   * Test leaderboard with negative vote counts
   * Requirement 6.1: Designs with negative votes ranked correctly
   */
  test('leaderboard handles negative vote counts correctly', async () => {
    const themeId = 'theme_negative_001';

    // Create designs with mix of positive, zero, and negative votes
    const designs: Design[] = [
      {
        id: 'design_neg_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 10,
      },
      {
        id: 'design_neg_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 0,
      },
      {
        id: 'design_neg_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: -5,
      },
      {
        id: 'design_neg_004',
        userId: 'user_diana',
        username: 'diana',
        themeId,
        backgroundColor: '#E0FFE0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: -10,
      },
    ];

    // Save designs and add to leaderboard
    for (const design of designs) {
      await storage.saveDesign(design);
      await redis.zAdd(`leaderboard:${themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get leaderboard entries
    const entries = await leaderboardHandler.getLeaderboardByTheme(themeId);

    // Verify correct ranking order
    expect(entries[0].voteCount).toBe(10);
    expect(entries[1].voteCount).toBe(0);
    expect(entries[2].voteCount).toBe(-5);
    expect(entries[3].voteCount).toBe(-10);

    // Verify all designs are included
    expect(entries.length).toBe(4);
  });

  /**
   * Test empty leaderboard
   * Requirement 6.1: Handle empty leaderboard gracefully
   */
  test('leaderboard handles empty state when no designs submitted', async () => {
    const themeId = 'theme_empty_001';

    // Get leaderboard for theme with no submissions
    const entries = await leaderboardHandler.getLeaderboardByTheme(themeId);

    // Verify empty array is returned
    expect(entries).toBeDefined();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(0);
  });

  /**
   * Test leaderboard updates when votes change
   * Requirement 6.1: Rankings update as votes are cast
   */
  test('leaderboard rankings update when vote counts change', async () => {
    const themeId = 'theme_update_001';

    // Create initial designs
    const designs: Design[] = [
      {
        id: 'design_update_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 10,
      },
      {
        id: 'design_update_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 5,
      },
    ];

    // Save designs and add to leaderboard
    for (const design of designs) {
      await storage.saveDesign(design);
      await redis.zAdd(`leaderboard:${themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get initial leaderboard
    let entries = await leaderboardHandler.getLeaderboardByTheme(themeId);
    expect(entries[0].design.id).toBe('design_update_001'); // alice first
    expect(entries[1].design.id).toBe('design_update_002'); // bob second

    // Update vote count for bob's design (increase by 10)
    await leaderboardHandler.updateVoteCount('design_update_002', 10);

    // Update the design in storage
    const bobDesign = await storage.loadDesign('design_update_002');
    if (bobDesign) {
      bobDesign.voteCount = 15;
      await storage.saveDesign(bobDesign);
    }

    // Get updated leaderboard
    entries = await leaderboardHandler.getLeaderboardByTheme(themeId);
    expect(entries[0].design.id).toBe('design_update_002'); // bob now first
    expect(entries[1].design.id).toBe('design_update_001'); // alice now second
    expect(entries[0].voteCount).toBe(15);
    expect(entries[1].voteCount).toBe(10);
  });

  /**
   * Test user rank retrieval
   * Requirement 6.3: Users can see their rank in leaderboard
   */
  test('leaderboard provides user rank correctly', async () => {
    const themeId = 'theme_rank_001';

    // Create designs with different vote counts
    const designs: Design[] = [
      {
        id: 'design_rank_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 30,
      },
      {
        id: 'design_rank_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 20,
      },
      {
        id: 'design_rank_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 10,
      },
    ];

    // Save designs and add to leaderboard
    for (const design of designs) {
      await storage.saveDesign(design);
      await storage['redis'].sAdd(`user:${design.userId}:designs`, [design.id]);
      await redis.zAdd(`leaderboard:${themeId}`, [
        { member: design.id, score: design.voteCount }
      ]);
    }

    // Get user ranks
    const aliceRank = await leaderboardHandler.getUserRank('user_alice', themeId);
    const bobRank = await leaderboardHandler.getUserRank('user_bob', themeId);
    const charlieRank = await leaderboardHandler.getUserRank('user_charlie', themeId);

    // Verify ranks
    expect(aliceRank).toBe(1);
    expect(bobRank).toBe(2);
    expect(charlieRank).toBe(3);

    // Test user with no submission
    const noSubmissionRank = await leaderboardHandler.getUserRank('user_nobody', themeId);
    expect(noSubmissionRank).toBe(-1);
  });
});
