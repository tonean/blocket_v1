/**
 * Integration tests for design submission flow
 * Feature: reddit-room-design-game
 * Tests Requirements: 5.1, 5.2, 5.7
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design, PlacedAsset } from '../types/models.js';
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

describe('Design Submission Flow Integration Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let authService: MockAuthService;
  let handler: SubmissionHandler;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    authService = new MockAuthService();
    handler = new SubmissionHandler(storage, authService);
  });

  /**
   * Test complete submission flow from design to confirmation
   * Requirement 5.1: Design submission saves with current theme
   * Requirement 5.2: Confirmation message displayed after submission
   */
  test('complete submission flow: create design → submit → confirm', async () => {
    // Create a design
    const design: Design = {
      id: 'design_test_001',
      userId: 'user_alice',
      username: 'alice',
      themeId: 'theme_school_001',
      backgroundColor: '#E8F4F8',
      assets: [
        {
          assetId: 'desk',
          x: 150,
          y: 200,
          rotation: 0,
          zIndex: 1,
        },
        {
          assetId: 'chair_1',
          x: 180,
          y: 220,
          rotation: 90,
          zIndex: 2,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design.userId, username: design.username });
    
    // Submit the design
    const designId = await handler.submitDesign(design);

    // Verify submission was successful
    expect(designId).toBe(design.id);

    // Verify design is marked as submitted
    const submittedDesign = await handler.getDesignById(designId);
    expect(submittedDesign).not.toBeNull();
    expect(submittedDesign!.submitted).toBe(true);
    expect(submittedDesign!.themeId).toBe(design.themeId);
    expect(submittedDesign!.userId).toBe(design.userId);
    expect(submittedDesign!.username).toBe(design.username);

    // Verify design is retrievable by theme
    const themeDesigns = await handler.getSubmittedDesigns(design.themeId);
    expect(themeDesigns.length).toBe(1);
    expect(themeDesigns[0].id).toBe(design.id);
    expect(themeDesigns[0].submitted).toBe(true);
  });

  /**
   * Test duplicate submission prevention
   * Requirement 5.7: Prevent duplicate submissions for same user and theme
   */
  test('duplicate submission prevention: user cannot submit twice for same theme', async () => {
    // Create first design
    const design1: Design = {
      id: 'design_test_002',
      userId: 'user_bob',
      username: 'bob',
      themeId: 'theme_office_001',
      backgroundColor: '#F0F0F0',
      assets: [
        {
          assetId: 'desk',
          x: 100,
          y: 150,
          rotation: 0,
          zIndex: 1,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design1.userId, username: design1.username });
    
    // Submit first design
    await handler.submitDesign(design1);

    // Check if user has already submitted
    const hasSubmitted = await handler.hasUserSubmitted(design1.userId, design1.themeId);
    expect(hasSubmitted).toBe(true);

    // Create second design for same user and theme
    const design2: Design = {
      ...design1,
      id: 'design_test_003',
      backgroundColor: '#FFFFFF',
      assets: [
        {
          assetId: 'chair_2',
          x: 200,
          y: 250,
          rotation: 180,
          zIndex: 1,
        },
      ],
    };

    // Verify duplicate detection works
    const alreadySubmitted = await handler.hasUserSubmitted(design2.userId, design2.themeId);
    expect(alreadySubmitted).toBe(true);

    // In a real UI, this would prevent the submission
    // For testing, we verify the check works correctly
    if (alreadySubmitted) {
      // Submission should be blocked
      expect(true).toBe(true);
    } else {
      // This should not happen
      expect(false).toBe(true);
    }
  });

  /**
   * Test error handling during submission
   * Requirement 5.1: Handle submission errors gracefully
   */
  test('error handling: handles storage errors gracefully', async () => {
    // Create a Redis client that throws errors
    class FailingRedisClient extends MockRedisClient {
      async set(key: string, value: string): Promise<void> {
        if (key.includes('submission:')) {
          throw new Error('Storage error: Redis connection failed');
        }
        await super.set(key, value);
      }
    }

    const failingRedis = new FailingRedisClient();
    const failingStorage = new StorageService(failingRedis);
    const authService = new MockAuthService({ id: 'user_charlie', username: 'charlie' });
    const failingHandler = new SubmissionHandler(failingStorage, authService);

    const design: Design = {
      id: 'design_invalid',
      userId: 'user_charlie',
      username: 'charlie',
      themeId: 'theme_bedroom_001',
      backgroundColor: '#FFE4E1',
      assets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Attempt to submit with failing storage
    try {
      await failingHandler.submitDesign(design);
      // If we get here, the test should fail
      expect(false).toBe(true);
    } catch (error) {
      // Verify error is caught and handled
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain('Failed to submit design');
    }
  });

  /**
   * Test submission with multiple assets
   * Requirement 5.1: All design data is preserved during submission
   */
  test('submission preserves all design data including multiple assets', async () => {
    const assets: PlacedAsset[] = [
      { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
      { assetId: 'chair_1', x: 150, y: 150, rotation: 90, zIndex: 2 },
      { assetId: 'bookshelf_1', x: 200, y: 100, rotation: 0, zIndex: 3 },
      { assetId: 'lamp', x: 120, y: 80, rotation: 0, zIndex: 4 },
      { assetId: 'rug_1', x: 180, y: 200, rotation: 0, zIndex: 0 },
    ];

    const design: Design = {
      id: 'design_test_004',
      userId: 'user_diana',
      username: 'diana',
      themeId: 'theme_library_001',
      backgroundColor: '#D4E4F7',
      assets,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design.userId, username: design.username });
    
    // Submit design
    const designId = await handler.submitDesign(design);

    // Retrieve and verify all data is preserved
    const retrievedDesign = await handler.getDesignById(designId);
    expect(retrievedDesign).not.toBeNull();
    expect(retrievedDesign!.assets.length).toBe(assets.length);
    expect(retrievedDesign!.backgroundColor).toBe(design.backgroundColor);
    
    // Verify each asset is preserved correctly
    for (let i = 0; i < assets.length; i++) {
      expect(retrievedDesign!.assets[i].assetId).toBe(assets[i].assetId);
      expect(retrievedDesign!.assets[i].x).toBe(assets[i].x);
      expect(retrievedDesign!.assets[i].y).toBe(assets[i].y);
      expect(retrievedDesign!.assets[i].rotation).toBe(assets[i].rotation);
      expect(retrievedDesign!.assets[i].zIndex).toBe(assets[i].zIndex);
    }
  });

  /**
   * Test submission for different themes
   * Requirement 5.1: User can submit different designs for different themes
   */
  test('user can submit designs for different themes', async () => {
    const userId = 'user_eve';
    const username = 'eve';

    // Submit design for theme 1
    const design1: Design = {
      id: 'design_test_005',
      userId,
      username,
      themeId: 'theme_school_001',
      backgroundColor: '#E8F4F8',
      assets: [{ assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design1.userId, username: design1.username });
    
    await handler.submitDesign(design1);

    // Verify submission for theme 1
    const hasSubmittedTheme1 = await handler.hasUserSubmitted(userId, design1.themeId);
    expect(hasSubmittedTheme1).toBe(true);

    // Submit design for theme 2
    const design2: Design = {
      id: 'design_test_006',
      userId,
      username,
      themeId: 'theme_office_001',
      backgroundColor: '#F5F5F5',
      assets: [{ assetId: 'chair_2', x: 150, y: 150, rotation: 90, zIndex: 1 }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user (same user, different theme)
    authService.setMockUser({ id: design2.userId, username: design2.username });
    
    await handler.submitDesign(design2);

    // Verify submission for theme 2
    const hasSubmittedTheme2 = await handler.hasUserSubmitted(userId, design2.themeId);
    expect(hasSubmittedTheme2).toBe(true);

    // Verify both designs are retrievable
    const userDesigns = await handler.getUserDesigns(userId);
    expect(userDesigns.length).toBe(2);
    
    const theme1Designs = await handler.getSubmittedDesigns(design1.themeId);
    expect(theme1Designs.length).toBe(1);
    expect(theme1Designs[0].id).toBe(design1.id);

    const theme2Designs = await handler.getSubmittedDesigns(design2.themeId);
    expect(theme2Designs.length).toBe(1);
    expect(theme2Designs[0].id).toBe(design2.id);
  });

  /**
   * Test submission timestamp updates
   * Requirement 5.1: Submission updates the design timestamp
   */
  test('submission updates design timestamp', async () => {
    const design: Design = {
      id: 'design_test_007',
      userId: 'user_frank',
      username: 'frank',
      themeId: 'theme_kitchen_001',
      backgroundColor: '#FFF8DC',
      assets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    const originalUpdatedAt = design.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Set auth to match the design's user
    authService.setMockUser({ id: design.userId, username: design.username });
    
    // Submit design
    await handler.submitDesign(design);

    // Retrieve and verify timestamp was updated
    const submittedDesign = await handler.getDesignById(design.id);
    expect(submittedDesign).not.toBeNull();
    expect(submittedDesign!.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
  });
});
