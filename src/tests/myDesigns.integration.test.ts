/**
 * Integration tests for MyDesigns component
 * Feature: reddit-room-design-game
 * Tests Requirements: 7.4
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';
import { MockAuthService } from './mocks/MockAuthService.js';

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

describe('MyDesigns Integration Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let submissionHandler: SubmissionHandler;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    const authService = new MockAuthService();
    submissionHandler = new SubmissionHandler(storage, authService);
  });

  /**
   * Test design loading for specific user
   * Requirement 7.4: User can view all their previous submissions
   */
  test('loads all designs for a specific user', async () => {
    const userId = 'user_alice';
    const username = 'alice';

    // Create multiple designs for the user across different themes
    const designs: Design[] = [
      {
        id: 'design_alice_001',
        userId,
        username,
        themeId: 'theme_school_001',
        backgroundColor: '#E8F4F8',
        assets: [
          { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
        ],
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now() - 86400000,
        submitted: true,
        voteCount: 5,
      },
      {
        id: 'design_alice_002',
        userId,
        username,
        themeId: 'theme_office_001',
        backgroundColor: '#F0F0F0',
        assets: [
          { assetId: 'chair_1', x: 150, y: 150, rotation: 90, zIndex: 1 },
          { assetId: 'lamp', x: 120, y: 80, rotation: 0, zIndex: 2 },
        ],
        createdAt: Date.now() - 43200000, // 12 hours ago
        updatedAt: Date.now() - 43200000,
        submitted: true,
        voteCount: 12,
      },
      {
        id: 'design_alice_003',
        userId,
        username,
        themeId: 'theme_bedroom_001',
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 3600000,
        submitted: true,
        voteCount: 3,
      },
    ];

    // Save all designs
    for (const design of designs) {
      await storage.saveDesign(design);
    }

    // Load user's designs
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify all designs are loaded
    expect(userDesigns.length).toBe(3);

    // Verify all designs belong to the user
    for (const design of userDesigns) {
      expect(design.userId).toBe(userId);
      expect(design.username).toBe(username);
    }

    // Verify all design IDs are present
    const designIds = new Set(userDesigns.map(d => d.id));
    expect(designIds.has('design_alice_001')).toBe(true);
    expect(designIds.has('design_alice_002')).toBe(true);
    expect(designIds.has('design_alice_003')).toBe(true);

    // Verify designs have required metadata
    for (const design of userDesigns) {
      expect(design.themeId).toBeDefined();
      expect(design.createdAt).toBeGreaterThan(0);
      expect(design.voteCount).toBeGreaterThanOrEqual(0);
      expect(design.submitted).toBe(true);
    }
  });

  /**
   * Test empty state display
   * Requirement 7.4: Show empty state if user has no designs
   */
  test('returns empty array when user has no designs', async () => {
    const userId = 'user_newbie';

    // Load designs for user with no submissions
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify empty array is returned
    expect(userDesigns).toBeDefined();
    expect(Array.isArray(userDesigns)).toBe(true);
    expect(userDesigns.length).toBe(0);
  });

  /**
   * Test user design isolation
   * Requirement 7.4: Only show designs from the specific user
   */
  test('only returns designs from the specific user, not other users', async () => {
    const user1Id = 'user_alice';
    const user2Id = 'user_bob';
    const themeId = 'theme_school_001';

    // Create designs for user 1
    const user1Designs: Design[] = [
      {
        id: 'design_alice_001',
        userId: user1Id,
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 5,
      },
      {
        id: 'design_alice_002',
        userId: user1Id,
        username: 'alice',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 3,
      },
    ];

    // Create designs for user 2
    const user2Designs: Design[] = [
      {
        id: 'design_bob_001',
        userId: user2Id,
        username: 'bob',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 8,
      },
    ];

    // Save all designs
    for (const design of [...user1Designs, ...user2Designs]) {
      await storage.saveDesign(design);
    }

    // Load designs for user 1
    const aliceDesigns = await submissionHandler.getUserDesigns(user1Id);
    expect(aliceDesigns.length).toBe(2);
    expect(aliceDesigns.every(d => d.userId === user1Id)).toBe(true);
    expect(aliceDesigns.some(d => d.id === 'design_alice_001')).toBe(true);
    expect(aliceDesigns.some(d => d.id === 'design_alice_002')).toBe(true);
    expect(aliceDesigns.some(d => d.userId === user2Id)).toBe(false);

    // Load designs for user 2
    const bobDesigns = await submissionHandler.getUserDesigns(user2Id);
    expect(bobDesigns.length).toBe(1);
    expect(bobDesigns.every(d => d.userId === user2Id)).toBe(true);
    expect(bobDesigns[0].id).toBe('design_bob_001');
    expect(bobDesigns.some(d => d.userId === user1Id)).toBe(false);
  });

  /**
   * Test designs from multiple themes
   * Requirement 7.4: Show all user designs regardless of theme
   */
  test('returns designs from multiple themes for the same user', async () => {
    const userId = 'user_charlie';
    const username = 'charlie';

    // Create designs across different themes
    const themes = ['theme_school_001', 'theme_office_001', 'theme_bedroom_001', 'theme_kitchen_001'];
    const designs: Design[] = themes.map((themeId, index) => ({
      id: `design_charlie_${index}`,
      userId,
      username,
      themeId,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: Date.now() - (index * 1000),
      updatedAt: Date.now() - (index * 1000),
      submitted: true,
      voteCount: index,
    }));

    // Save all designs
    for (const design of designs) {
      await storage.saveDesign(design);
    }

    // Load user's designs
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify all designs are loaded
    expect(userDesigns.length).toBe(themes.length);

    // Verify designs span multiple themes
    const themeIds = new Set(userDesigns.map(d => d.themeId));
    expect(themeIds.size).toBe(themes.length);
    for (const themeId of themes) {
      expect(themeIds.has(themeId)).toBe(true);
    }
  });

  /**
   * Test designs with varying vote counts
   * Requirement 7.4: Display vote count for each design
   */
  test('displays correct vote counts for each design', async () => {
    const userId = 'user_diana';
    const username = 'diana';
    const themeId = 'theme_school_001';

    // Create designs with different vote counts
    const designs: Design[] = [
      {
        id: 'design_diana_001',
        userId,
        username,
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 25, // Positive votes
      },
      {
        id: 'design_diana_002',
        userId,
        username,
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: 0, // No votes
      },
      {
        id: 'design_diana_003',
        userId,
        username,
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true,
        voteCount: -5, // Negative votes
      },
    ];

    // Save all designs
    for (const design of designs) {
      await storage.saveDesign(design);
    }

    // Load user's designs
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify vote counts are preserved
    expect(userDesigns.length).toBe(3);
    
    const design1 = userDesigns.find(d => d.id === 'design_diana_001');
    expect(design1?.voteCount).toBe(25);

    const design2 = userDesigns.find(d => d.id === 'design_diana_002');
    expect(design2?.voteCount).toBe(0);

    const design3 = userDesigns.find(d => d.id === 'design_diana_003');
    expect(design3?.voteCount).toBe(-5);
  });

  /**
   * Test designs with submission timestamps
   * Requirement 7.4: Show submission time for each design
   */
  test('displays correct submission timestamps for each design', async () => {
    const userId = 'user_eve';
    const username = 'eve';
    const themeId = 'theme_office_001';

    const now = Date.now();
    const timestamps = [
      now - 86400000, // 1 day ago
      now - 3600000,  // 1 hour ago
      now - 60000,    // 1 minute ago
    ];

    // Create designs with different timestamps
    const designs: Design[] = timestamps.map((timestamp, index) => ({
      id: `design_eve_${index}`,
      userId,
      username,
      themeId,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      submitted: true,
      voteCount: 0,
    }));

    // Save all designs
    for (const design of designs) {
      await storage.saveDesign(design);
    }

    // Load user's designs
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify timestamps are preserved
    expect(userDesigns.length).toBe(3);
    
    for (let i = 0; i < timestamps.length; i++) {
      const design = userDesigns.find(d => d.id === `design_eve_${i}`);
      expect(design?.createdAt).toBe(timestamps[i]);
    }
  });

  /**
   * Test designs include both submitted and draft status
   * Requirement 7.4: Show all user designs with their submission status
   */
  test('returns all user designs including submission status', async () => {
    const userId = 'user_frank';
    const username = 'frank';
    const themeId = 'theme_bedroom_001';

    // Create mix of submitted and draft designs
    const designs: Design[] = [
      {
        id: 'design_frank_001',
        userId,
        username,
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true, // Submitted
        voteCount: 5,
      },
      {
        id: 'design_frank_002',
        userId,
        username,
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: false, // Draft
        voteCount: 0,
      },
      {
        id: 'design_frank_003',
        userId,
        username,
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: true, // Submitted
        voteCount: 3,
      },
    ];

    // Save all designs
    for (const design of designs) {
      await storage.saveDesign(design);
    }

    // Load user's designs
    const userDesigns = await submissionHandler.getUserDesigns(userId);

    // Verify all designs are returned with correct submission status
    expect(userDesigns.length).toBe(3);
    expect(userDesigns.some(d => d.id === 'design_frank_001' && d.submitted === true)).toBe(true);
    expect(userDesigns.some(d => d.id === 'design_frank_002' && d.submitted === false)).toBe(true);
    expect(userDesigns.some(d => d.id === 'design_frank_003' && d.submitted === true)).toBe(true);
    
    // Verify submitted count
    const submittedCount = userDesigns.filter(d => d.submitted).length;
    expect(submittedCount).toBe(2);
  });
});
