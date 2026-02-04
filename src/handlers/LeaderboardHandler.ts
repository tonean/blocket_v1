/**
 * LeaderboardHandler - Manages leaderboard rankings and vote aggregation
 */

import { Design, LeaderboardEntry } from '../types/models.js';
import { StorageService } from '../storage/StorageService.js';

export class LeaderboardHandler {
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  /**
   * Get top designs for a theme sorted by vote count descending
   * @param themeId - The theme ID to filter by
   * @param limit - Maximum number of designs to return
   * @returns Array of designs sorted by vote count (highest first)
   */
  async getTopDesigns(themeId: string, limit: number = 10): Promise<Design[]> {
    try {
      const leaderboardKey = `leaderboard:${themeId}`;
      
      // Get top design IDs from sorted set (highest scores first)
      const designIds = await this.storage['redis'].zRevRange(leaderboardKey, 0, limit - 1);

      if (designIds.length === 0) {
        console.log(`No designs found in leaderboard for theme ${themeId}`);
        return [];
      }

      // Load all designs
      const designs: Design[] = [];
      for (const designId of designIds) {
        const design = await this.storage.loadDesign(designId);
        if (design) {
          designs.push(design);
        }
      }

      console.log(`Retrieved ${designs.length} top designs for theme ${themeId}`);
      return designs;
    } catch (error) {
      console.error(`Failed to get top designs for theme ${themeId}:`, error);
      throw new Error(`Failed to get top designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update the vote count for a design in the leaderboard
   * @param designId - The design ID
   * @param delta - The change in vote count (+1, -1, +2, -2)
   */
  async updateVoteCount(designId: string, delta: number): Promise<void> {
    try {
      // Load the design to get its theme
      const design = await this.storage.loadDesign(designId);
      
      if (!design) {
        throw new Error(`Design ${designId} not found`);
      }

      // Update the sorted set score
      const leaderboardKey = `leaderboard:${design.themeId}`;
      await this.storage['redis'].zIncrBy(leaderboardKey, delta, designId);

      console.log(`Updated leaderboard for design ${designId}: ${delta > 0 ? '+' : ''}${delta}`);
    } catch (error) {
      console.error(`Failed to update vote count for design ${designId}:`, error);
      throw new Error(`Failed to update vote count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a user's rank for a specific theme
   * @param userId - The user ID
   * @param themeId - The theme ID
   * @returns The user's rank (1-based), or -1 if not found
   */
  async getUserRank(userId: string, themeId: string): Promise<number> {
    try {
      // Get all user's designs
      const userDesigns = await this.storage.getUserDesigns(userId);
      
      // Find the design for this theme
      const userDesign = userDesigns.find(d => d.themeId === themeId && d.submitted);
      
      if (!userDesign) {
        console.log(`No submitted design found for user ${userId} in theme ${themeId}`);
        return -1;
      }

      // Get rank from sorted set (0-based, so add 1)
      const leaderboardKey = `leaderboard:${themeId}`;
      const rank = await this.storage['redis'].zRevRank(leaderboardKey, userDesign.id);

      if (rank === undefined) {
        console.log(`Design ${userDesign.id} not found in leaderboard`);
        return -1;
      }

      const oneBasedRank = rank + 1;
      console.log(`User ${userId} rank in theme ${themeId}: ${oneBasedRank}`);
      return oneBasedRank;
    } catch (error) {
      console.error(`Failed to get user rank for user ${userId} in theme ${themeId}:`, error);
      throw new Error(`Failed to get user rank: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get full leaderboard entries for a theme
   * @param themeId - The theme ID
   * @returns Array of leaderboard entries with rank, design, username, and vote count
   */
  async getLeaderboardByTheme(themeId: string): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardKey = `leaderboard:${themeId}`;
      
      // Get all design IDs from sorted set (highest scores first)
      const designIds = await this.storage['redis'].zRevRange(leaderboardKey, 0, -1);

      if (designIds.length === 0) {
        console.log(`No designs found in leaderboard for theme ${themeId}`);
        return [];
      }

      // Load all designs and create leaderboard entries
      const entries: LeaderboardEntry[] = [];
      let rank = 1;

      for (const designId of designIds) {
        const design = await this.storage.loadDesign(designId);
        if (design) {
          const entry: LeaderboardEntry = {
            rank,
            design,
            username: design.username,
            voteCount: design.voteCount
          };
          entries.push(entry);
          rank++;
        }
      }

      console.log(`Retrieved ${entries.length} leaderboard entries for theme ${themeId}`);
      return entries;
    } catch (error) {
      console.error(`Failed to get leaderboard for theme ${themeId}:`, error);
      throw new Error(`Failed to get leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
