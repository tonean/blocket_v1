/**
 * Integration tests for DesignGallery component
 * Feature: reddit-room-design-game
 * Tests Requirements: 5.4, 5.5, 14.2
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { VotingService, VoteType } from '../services/VotingService.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { MockAuthService } from './mocks/MockAuthService.js';
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

describe('DesignGallery Integration Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let authService: MockAuthService;
  let submissionHandler: SubmissionHandler;
  let votingService: VotingService;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    authService = new MockAuthService();
    submissionHandler = new SubmissionHandler(storage, authService);
    votingService = new VotingService(redis, authService);
  });

  /**
   * Test design loading and display
   * Requirement 5.4: Submitted designs are viewable by other players
   * Requirement 5.5: Display creator username and submission time
   */
  test('gallery loads and displays submitted designs with required metadata', async () => {
    const themeId = 'theme_school_001';

    // Create and submit multiple designs
    const designs: Design[] = [
      {
        id: 'design_gallery_001',
        userId: 'user_alice',
        username: 'alice',
        themeId,
        backgroundColor: '#E8F4F8',
        assets: [
          { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
        ],
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 3600000,
        submitted: false,
        voteCount: 0,
      },
      {
        id: 'design_gallery_002',
        userId: 'user_bob',
        username: 'bob',
        themeId,
        backgroundColor: '#F0F0F0',
        assets: [
          { assetId: 'chair_1', x: 150, y: 150, rotation: 90, zIndex: 1 },
          { assetId: 'lamp', x: 120, y: 80, rotation: 0, zIndex: 2 },
        ],
        createdAt: Date.now() - 1800000, // 30 minutes ago
        updatedAt: Date.now() - 1800000,
        submitted: false,
        voteCount: 0,
      },
      {
        id: 'design_gallery_003',
        userId: 'user_charlie',
        username: 'charlie',
        themeId,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now() - 600000, // 10 minutes ago
        updatedAt: Date.now() - 600000,
        submitted: false,
        voteCount: 0,
      },
    ];

    // Submit all designs
    for (const design of designs) {
      // Set auth to match the design's user
      authService.setMockUser({ id: design.userId, username: design.username });
      await submissionHandler.submitDesign(design);
    }

    // Load designs for gallery
    const submittedDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);

    // Verify all designs are loaded
    expect(submittedDesigns.length).toBe(3);

    // Verify each design has required metadata (Requirement 5.5)
    for (const design of submittedDesigns) {
      expect(design.username).toBeDefined();
      expect(design.username.length).toBeGreaterThan(0);
      expect(design.createdAt).toBeDefined();
      expect(design.createdAt).toBeGreaterThan(0);
      expect(design.submitted).toBe(true);
      expect(design.userId).toBeDefined();
      expect(design.themeId).toBe(themeId);
    }

    // Verify designs are sorted by creation time (newest first)
    expect(submittedDesigns[0].id).toBe('design_gallery_003'); // Most recent
    expect(submittedDesigns[1].id).toBe('design_gallery_002');
    expect(submittedDesigns[2].id).toBe('design_gallery_001'); // Oldest
  });

  /**
   * Test pagination functionality
   * Requirement 5.4: Gallery supports pagination for large result sets
   */
  test('gallery pagination works correctly with multiple pages', async () => {
    const themeId = 'theme_office_001';
    const pageSize = 5;

    // Create 12 designs to test pagination
    const designs: Design[] = [];
    for (let i = 0; i < 12; i++) {
      designs.push({
        id: `design_page_${i.toString().padStart(3, '0')}`,
        userId: `user_${i}`,
        username: `user${i}`,
        themeId,
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now() - (i * 60000), // Stagger creation times
        updatedAt: Date.now() - (i * 60000),
        submitted: false,
        voteCount: 0,
      });
    }

    // Submit all designs
    for (const design of designs) {
      // Set auth to match the design's user
      authService.setMockUser({ id: design.userId, username: design.username });
      await submissionHandler.submitDesign(design);
    }

    // Load first page
    const page1 = await submissionHandler.getSubmittedDesigns(themeId, pageSize, 0);
    expect(page1.length).toBe(pageSize);
    expect(page1[0].id).toBe('design_page_000'); // Newest

    // Load second page
    const page2 = await submissionHandler.getSubmittedDesigns(themeId, pageSize, pageSize);
    expect(page2.length).toBe(pageSize);
    expect(page2[0].id).toBe('design_page_005');

    // Load third page (partial)
    const page3 = await submissionHandler.getSubmittedDesigns(themeId, pageSize, pageSize * 2);
    expect(page3.length).toBe(2); // Only 2 remaining
    expect(page3[0].id).toBe('design_page_010');

    // Verify no overlap between pages
    const page1Ids = new Set(page1.map(d => d.id));
    const page2Ids = new Set(page2.map(d => d.id));
    const page3Ids = new Set(page3.map(d => d.id));

    for (const id of page2Ids) {
      expect(page1Ids.has(id)).toBe(false);
    }
    for (const id of page3Ids) {
      expect(page1Ids.has(id)).toBe(false);
      expect(page2Ids.has(id)).toBe(false);
    }
  });

  /**
   * Test voting integration with gallery
   * Requirement 14.2: Gallery displays voting controls and updates vote counts
   */
  test('gallery integrates with voting system and displays vote counts', async () => {
    const themeId = 'theme_bedroom_001';

    // Create and submit a design
    const design: Design = {
      id: 'design_vote_001',
      userId: 'user_designer',
      username: 'designer',
      themeId,
      backgroundColor: '#FFE4E1',
      assets: [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design.userId, username: design.username });
    await submissionHandler.submitDesign(design);

    // Load design in gallery
    let galleryDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(galleryDesigns.length).toBe(1);
    expect(galleryDesigns[0].voteCount).toBe(0);

    // User 1 upvotes
    authService.setMockUser({ id: 'user_voter1', username: 'voter1' });
    await votingService.castVote('user_voter1', design.id, VoteType.UPVOTE);

    // Reload gallery and verify vote count updated
    galleryDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(galleryDesigns[0].voteCount).toBe(1);

    // User 2 upvotes
    authService.setMockUser({ id: 'user_voter2', username: 'voter2' });
    await votingService.castVote('user_voter2', design.id, VoteType.UPVOTE);

    // Reload gallery
    galleryDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(galleryDesigns[0].voteCount).toBe(2);

    // User 3 downvotes
    authService.setMockUser({ id: 'user_voter3', username: 'voter3' });
    await votingService.castVote('user_voter3', design.id, VoteType.DOWNVOTE);

    // Reload gallery
    galleryDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(galleryDesigns[0].voteCount).toBe(1); // 2 upvotes - 1 downvote

    // User 1 changes vote to downvote
    authService.setMockUser({ id: 'user_voter1', username: 'voter1' });
    await votingService.changeVote('user_voter1', design.id, VoteType.DOWNVOTE);

    // Reload gallery
    galleryDesigns = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(galleryDesigns[0].voteCount).toBe(-1); // 1 upvote - 2 downvotes
  });

  /**
   * Test gallery filters designs by theme
   * Requirement 5.4: Gallery only shows designs for current theme
   */
  test('gallery filters designs by theme correctly', async () => {
    const theme1 = 'theme_school_001';
    const theme2 = 'theme_office_001';

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
        submitted: false,
        voteCount: 0,
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
        submitted: false,
        voteCount: 0,
      },
    ];

    // Create designs for theme 2
    const theme2Designs: Design[] = [
      {
        id: 'design_theme2_001',
        userId: 'user_charlie',
        username: 'charlie',
        themeId: theme2,
        backgroundColor: '#FFE4E1',
        assets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        submitted: false,
        voteCount: 0,
      },
    ];

    // Submit all designs
    for (const design of [...theme1Designs, ...theme2Designs]) {
      // Set auth to match the design's user
      authService.setMockUser({ id: design.userId, username: design.username });
      await submissionHandler.submitDesign(design);
    }

    // Load gallery for theme 1
    const gallery1 = await submissionHandler.getSubmittedDesigns(theme1, 10, 0);
    expect(gallery1.length).toBe(2);
    expect(gallery1.every(d => d.themeId === theme1)).toBe(true);
    expect(gallery1.some(d => d.id === 'design_theme1_001')).toBe(true);
    expect(gallery1.some(d => d.id === 'design_theme1_002')).toBe(true);

    // Load gallery for theme 2
    const gallery2 = await submissionHandler.getSubmittedDesigns(theme2, 10, 0);
    expect(gallery2.length).toBe(1);
    expect(gallery2.every(d => d.themeId === theme2)).toBe(true);
    expect(gallery2[0].id).toBe('design_theme2_001');

    // Verify no cross-contamination
    expect(gallery1.some(d => d.themeId === theme2)).toBe(false);
    expect(gallery2.some(d => d.themeId === theme1)).toBe(false);
  });

  /**
   * Test empty gallery state
   * Requirement 5.4: Gallery handles empty state gracefully
   */
  test('gallery handles empty state when no designs submitted', async () => {
    const themeId = 'theme_empty_001';

    // Load gallery for theme with no submissions
    const designs = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);

    // Verify empty array is returned
    expect(designs).toBeDefined();
    expect(Array.isArray(designs)).toBe(true);
    expect(designs.length).toBe(0);
  });

  /**
   * Test gallery with designs from multiple users
   * Requirement 5.4: Gallery displays designs from all users
   */
  test('gallery displays designs from multiple users', async () => {
    const themeId = 'theme_multi_001';
    const usernames = ['alice', 'bob', 'charlie', 'diana', 'eve'];

    // Create and submit designs from different users
    for (let i = 0; i < usernames.length; i++) {
      const design: Design = {
        id: `design_multi_${i}`,
        userId: `user_${usernames[i]}`,
        username: usernames[i],
        themeId,
        backgroundColor: '#FFFFFF',
        assets: [],
        createdAt: Date.now() - (i * 1000),
        updatedAt: Date.now() - (i * 1000),
        submitted: false,
        voteCount: 0,
      };
      // Set auth to match the design's user
      authService.setMockUser({ id: design.userId, username: design.username });
      await submissionHandler.submitDesign(design);
    }

    // Load gallery
    const designs = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);

    // Verify all users' designs are present
    expect(designs.length).toBe(usernames.length);
    
    const displayedUsernames = new Set(designs.map(d => d.username));
    for (const username of usernames) {
      expect(displayedUsernames.has(username)).toBe(true);
    }
  });

  /**
   * Test user cannot vote on their own design in gallery
   * Requirement 14.2: Self-voting is prevented
   */
  test('gallery prevents users from voting on their own designs', async () => {
    const themeId = 'theme_selfvote_001';

    // Create and submit a design
    const design: Design = {
      id: 'design_selfvote_001',
      userId: 'user_owner',
      username: 'owner',
      themeId,
      backgroundColor: '#E8F4F8',
      assets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Set auth to match the design's user
    authService.setMockUser({ id: design.userId, username: design.username });
    await submissionHandler.submitDesign(design);

    // Attempt to vote on own design
    try {
      await votingService.castVote(design.userId, design.id, VoteType.UPVOTE);
      // Should not reach here
      expect(false).toBe(true);
    } catch (error) {
      // Verify error is thrown
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain('cannot vote on their own designs');
    }

    // Verify vote count remains 0
    const designs = await submissionHandler.getSubmittedDesigns(themeId, 10, 0);
    expect(designs[0].voteCount).toBe(0);
  });
});
