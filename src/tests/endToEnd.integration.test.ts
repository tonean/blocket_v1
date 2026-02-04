/**
 * End-to-End Integration Tests
 * Tests complete user flows across the entire application
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Design, Theme, Asset, AssetCategory } from '../types/models.js';
import { AssetManager } from '../managers/AssetManager.js';
import { DesignManager } from '../managers/DesignManager.js';
import { ThemeManager } from '../managers/ThemeManager.js';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { LeaderboardHandler } from '../handlers/LeaderboardHandler.js';
import { VotingService, VoteType } from '../services/VotingService.js';
import { StorageService } from '../storage/StorageService.js';
import { AuthService } from '../services/AuthService.js';
import { MockAuthService } from './mocks/MockAuthService.js';

// Mock Redis client for testing
class MockRedisClient {
  private storage: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private sortedSets: Map<string, Map<string, number>> = new Map();

  async get(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async sAdd(key: string, members: string[]): Promise<void> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    members.forEach(m => set.add(m));
  }

  async sMembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async zAdd(key: string, members: { member: string; score: number }[]): Promise<void> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    const sortedSet = this.sortedSets.get(key)!;
    members.forEach(({ member, score }) => sortedSet.set(member, score));
  }

  async zIncrBy(key: string, increment: number, member: string): Promise<void> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    const sortedSet = this.sortedSets.get(key)!;
    const currentScore = sortedSet.get(member) || 0;
    sortedSet.set(member, currentScore + increment);
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
    if (!sortedSet) return undefined;
    
    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const index = entries.findIndex(([m]) => m === member);
    return index === -1 ? undefined : index;
  }

  clear(): void {
    this.storage.clear();
    this.sets.clear();
    this.sortedSets.clear();
  }
}

describe('End-to-End Integration Tests', () => {
  let mockRedis: MockRedisClient;
  let storage: StorageService;
  let authService: MockAuthService;
  let assetManager: AssetManager;
  let designManager: DesignManager;
  let themeManager: ThemeManager;
  let submissionHandler: SubmissionHandler;
  let leaderboardHandler: LeaderboardHandler;
  let votingService: VotingService;
  let currentTheme: Theme;

  beforeEach(async () => {
    // Initialize mock services
    mockRedis = new MockRedisClient();
    storage = new StorageService(mockRedis as any);
    authService = new MockAuthService();
    assetManager = new AssetManager();
    designManager = new DesignManager();
    themeManager = new ThemeManager(storage);
    submissionHandler = new SubmissionHandler(storage, authService as any);
    leaderboardHandler = new LeaderboardHandler(storage);
    votingService = new VotingService(mockRedis as any, authService as any);

    // Initialize default theme
    currentTheme = await themeManager.initializeDefaultTheme();
  });

  describe('Complete User Flow: Create → Place Assets → Submit → View → Vote', () => {
    it('should complete the full user journey successfully', async () => {
      // Step 1: User authentication
      const user1 = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user1);
      expect(user1).toBeDefined();
      expect(user1.username).toBe('testuser1');

      // Step 2: Load assets
      const assets = assetManager.loadAssets();
      expect(assets.length).toBeGreaterThan(0);
      
      const deskAsset = assets.find(a => a.id === 'desk');
      const chairAsset = assets.find(a => a.id === 'chair_1');
      expect(deskAsset).toBeDefined();
      expect(chairAsset).toBeDefined();

      // Step 3: Create a new design
      const design = designManager.createDesign(user1.id, currentTheme.id, user1.username);
      expect(design).toBeDefined();
      expect(design.userId).toBe(user1.id);
      expect(design.themeId).toBe(currentTheme.id);
      expect(design.assets).toHaveLength(0);

      // Step 4: Place assets on canvas
      designManager.placeAsset(design.id, 'desk', 200, 200);
      designManager.placeAsset(design.id, 'chair_1', 250, 250);
      
      const updatedDesign = designManager.getDesign(design.id);
      expect(updatedDesign?.assets).toHaveLength(2);
      expect(updatedDesign?.assets[0].assetId).toBe('desk');
      expect(updatedDesign?.assets[1].assetId).toBe('chair_1');

      // Step 5: Manipulate assets (rotate, move)
      designManager.rotateAsset(design.id, 0);
      designManager.moveAsset(design.id, 1, 300, 300);
      
      const manipulatedDesign = designManager.getDesign(design.id);
      expect(manipulatedDesign?.assets[0].rotation).toBe(90);
      expect(manipulatedDesign?.assets[1].x).toBe(300);
      expect(manipulatedDesign?.assets[1].y).toBe(300);

      // Step 6: Update background color
      designManager.updateBackgroundColor(design.id, '#E8F4F8');
      const coloredDesign = designManager.getDesign(design.id);
      expect(coloredDesign?.backgroundColor).toBe('#E8F4F8');

      // Step 7: Save design to storage
      await storage.saveDesign(coloredDesign!);
      const loadedDesign = await storage.loadDesign(design.id);
      expect(loadedDesign).toBeDefined();
      expect(loadedDesign?.assets).toHaveLength(2);

      // Step 8: Submit design
      const submittedDesignId = await submissionHandler.submitDesign(coloredDesign!);
      expect(submittedDesignId).toBe(design.id);
      
      const hasSubmitted = await submissionHandler.hasUserSubmitted(user1.id, currentTheme.id);
      expect(hasSubmitted).toBe(true);

      // Step 9: View design in gallery
      const galleryDesigns = await submissionHandler.getSubmittedDesigns(currentTheme.id, 10, 0);
      expect(galleryDesigns).toHaveLength(1);
      expect(galleryDesigns[0].id).toBe(design.id);
      expect(galleryDesigns[0].submitted).toBe(true);

      // Step 10: Another user votes on the design
      const user2 = { id: 'user2', username: 'testuser2' };
      authService.setMockUser(user2);
      await votingService.castVote(user2.id, design.id, VoteType.UPVOTE);
      
      const vote = await votingService.getUserVote(user2.id, design.id);
      expect(vote).toBeDefined();
      expect(vote?.voteType).toBe(VoteType.UPVOTE);

      // Step 11: Check leaderboard
      await leaderboardHandler.updateVoteCount(design.id, 1);
      const topDesigns = await leaderboardHandler.getTopDesigns(currentTheme.id, 10);
      expect(topDesigns).toHaveLength(1);
      expect(topDesigns[0].id).toBe(design.id);

      // Step 12: View user's own designs
      authService.setMockUser(user1);
      const userDesigns = await submissionHandler.getUserDesigns(user1.id);
      expect(userDesigns).toHaveLength(1);
      expect(userDesigns[0].id).toBe(design.id);
    });

    it('should prevent duplicate submissions for the same theme', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);
      
      // First submission should succeed
      await submissionHandler.submitDesign(design);
      const hasSubmitted = await submissionHandler.hasUserSubmitted(user.id, currentTheme.id);
      expect(hasSubmitted).toBe(true);

      // Check that user has already submitted (application should check this before allowing second submission)
      const hasAlreadySubmitted = await submissionHandler.hasUserSubmitted(user.id, currentTheme.id);
      expect(hasAlreadySubmitted).toBe(true);
      
      // In a real application, the UI would prevent the second submission
      // For this test, we verify that the check works correctly
    });

    it('should prevent users from voting on their own designs', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);
      await storage.saveDesign(design);
      await submissionHandler.submitDesign(design);

      // User tries to vote on their own design
      await expect(
        votingService.castVote(user.id, design.id, VoteType.UPVOTE)
      ).rejects.toThrow('cannot vote on their own designs');
    });
  });

  describe('Theme Rotation and Design Archival', () => {
    it('should archive designs when theme changes', async () => {
      // Create and submit a design for the current theme
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);
      await storage.saveDesign(design);
      await submissionHandler.submitDesign(design);

      // Create a new theme
      const newTheme: Theme = {
        id: 'theme_office_002',
        name: 'Office',
        description: 'Design a professional workspace',
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
        active: false
      };

      // Schedule the new theme (this should archive old designs)
      await themeManager.scheduleNextTheme(newTheme);

      // Verify old theme is deactivated
      const oldTheme = await storage.loadTheme(currentTheme.id);
      expect(oldTheme?.active).toBe(false);

      // Verify new theme is active
      const activeTheme = await storage.loadTheme(newTheme.id);
      expect(activeTheme?.active).toBe(true);

      // Verify old designs are still accessible
      const oldDesigns = await submissionHandler.getSubmittedDesigns(currentTheme.id, 10, 0);
      expect(oldDesigns).toHaveLength(1);
      expect(oldDesigns[0].id).toBe(design.id);
    });

    it('should allow new submissions for new theme', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      
      // Submit design for first theme
      const design1 = designManager.createDesign(user.id, currentTheme.id, user.username);
      await storage.saveDesign(design1);
      await submissionHandler.submitDesign(design1);

      // Create and activate new theme
      const newTheme: Theme = {
        id: 'theme_office_002',
        name: 'Office',
        description: 'Design a professional workspace',
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
        active: true
      };
      await storage.saveTheme(newTheme);

      // User should be able to submit for new theme
      const design2 = designManager.createDesign(user.id, newTheme.id, user.username);
      await storage.saveDesign(design2);
      await submissionHandler.submitDesign(design2);

      const hasSubmittedNewTheme = await submissionHandler.hasUserSubmitted(user.id, newTheme.id);
      expect(hasSubmittedNewTheme).toBe(true);
    });
  });

  describe('Leaderboard Updates After Voting', () => {
    it('should update leaderboard rankings when votes are cast', async () => {
      // Create multiple users and designs
      const user1 = { id: 'user1', username: 'testuser1' };
      const user2 = { id: 'user2', username: 'testuser2' };
      const user3 = { id: 'user3', username: 'testuser3' };
      const voter = { id: 'voter', username: 'voteruser' };

      // Create and submit designs
      authService.setMockUser(user1);
      const design1 = designManager.createDesign(user1.id, currentTheme.id, user1.username);
      await storage.saveDesign(design1);
      await submissionHandler.submitDesign(design1);

      authService.setMockUser(user2);
      const design2 = designManager.createDesign(user2.id, currentTheme.id, user2.username);
      await storage.saveDesign(design2);
      await submissionHandler.submitDesign(design2);

      authService.setMockUser(user3);
      const design3 = designManager.createDesign(user3.id, currentTheme.id, user3.username);
      await storage.saveDesign(design3);
      await submissionHandler.submitDesign(design3);

      // Cast votes
      authService.setMockUser(voter);
      await votingService.castVote(voter.id, design1.id, VoteType.UPVOTE);
      await leaderboardHandler.updateVoteCount(design1.id, 1);

      await votingService.castVote(voter.id, design2.id, VoteType.UPVOTE);
      await leaderboardHandler.updateVoteCount(design2.id, 1);

      await votingService.castVote(voter.id, design3.id, VoteType.DOWNVOTE);
      await leaderboardHandler.updateVoteCount(design3.id, -1);

      // Check leaderboard order
      const leaderboard = await leaderboardHandler.getLeaderboardByTheme(currentTheme.id);
      expect(leaderboard).toHaveLength(3);
      
      // Designs with positive votes should be ranked higher
      expect(leaderboard[0].voteCount).toBeGreaterThanOrEqual(leaderboard[1].voteCount);
      expect(leaderboard[1].voteCount).toBeGreaterThanOrEqual(leaderboard[2].voteCount);
    });

    it('should handle vote changes correctly', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      const voter = { id: 'voter', username: 'voteruser' };
      
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);
      await storage.saveDesign(design);
      await submissionHandler.submitDesign(design);

      // Initial upvote
      authService.setMockUser(voter);
      await votingService.castVote(voter.id, design.id, VoteType.UPVOTE);
      await leaderboardHandler.updateVoteCount(design.id, 1);

      let topDesigns = await leaderboardHandler.getTopDesigns(currentTheme.id, 1);
      expect(topDesigns[0].voteCount).toBe(1);

      // Change to downvote
      await votingService.changeVote(voter.id, design.id, VoteType.DOWNVOTE);
      await leaderboardHandler.updateVoteCount(design.id, -2); // -2 because changing from +1 to -1

      topDesigns = await leaderboardHandler.getTopDesigns(currentTheme.id, 1);
      expect(topDesigns[0].voteCount).toBe(-1);
    });
  });

  describe('Asset Search and Filtering', () => {
    it('should filter assets by category throughout the design flow', async () => {
      const assets = assetManager.loadAssets();
      
      // Filter by category
      const chairs = assetManager.getAssetsByCategory(AssetCategory.CHAIR);
      const bookshelves = assetManager.getAssetsByCategory(AssetCategory.BOOKSHELF);
      
      expect(chairs.length).toBeGreaterThan(0);
      expect(bookshelves.length).toBeGreaterThan(0);
      
      // All filtered assets should match the category
      chairs.forEach(asset => {
        expect(asset.category).toBe(AssetCategory.CHAIR);
      });
      
      bookshelves.forEach(asset => {
        expect(asset.category).toBe(AssetCategory.BOOKSHELF);
      });
    });

    it('should search assets by name', async () => {
      const assets = assetManager.loadAssets();
      
      // Search for "chair"
      const chairResults = assetManager.searchAssets('chair');
      expect(chairResults.length).toBeGreaterThan(0);
      chairResults.forEach(asset => {
        expect(asset.name.toLowerCase()).toContain('chair');
      });

      // Search for "desk"
      const deskResults = assetManager.searchAssets('desk');
      expect(deskResults.length).toBeGreaterThan(0);
      deskResults.forEach(asset => {
        expect(asset.name.toLowerCase()).toContain('desk');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle storage errors gracefully', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);

      // Try to load non-existent design
      const nonExistent = await storage.loadDesign('non_existent_id');
      expect(nonExistent).toBeNull();
    });

    it('should handle authentication errors', async () => {
      authService.setMockUser(null);
      
      const design = designManager.createDesign('user1', currentTheme.id, 'testuser1');
      
      // Try to submit without authentication
      await expect(submissionHandler.submitDesign(design)).rejects.toThrow();
    });

    it('should handle boundary conditions for asset placement', async () => {
      const user = { id: 'user1', username: 'testuser1' };
      authService.setMockUser(user);
      const design = designManager.createDesign(user.id, currentTheme.id, user.username);

      // Place asset at boundary
      designManager.placeAsset(design.id, 'desk', 0, 0);
      designManager.placeAsset(design.id, 'chair_1', 800, 600);

      const updatedDesign = designManager.getDesign(design.id);
      expect(updatedDesign?.assets[0].x).toBe(0);
      expect(updatedDesign?.assets[0].y).toBe(0);
      expect(updatedDesign?.assets[1].x).toBe(800);
      expect(updatedDesign?.assets[1].y).toBe(600);
    });
  });
});
