/**
 * VotingService - Manages voting operations for designs
 */

import { RedisClient } from '../storage/StorageService.js';
import { AuthService } from './AuthService.js';

export enum VoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote'
}

export interface Vote {
  userId: string;
  designId: string;
  voteType: VoteType;
  timestamp: number;
}

export class VotingService {
  private redis: RedisClient;
  private authService: AuthService;

  constructor(redis: RedisClient, authService: AuthService) {
    this.redis = redis;
    this.authService = authService;
  }

  /**
   * Cast a vote on a design
   * Requires authentication
   * @param userId - The ID of the user casting the vote
   * @param designId - The ID of the design being voted on
   * @param voteType - The type of vote (upvote or downvote)
   * @throws Error if user tries to vote on their own design or is not authenticated
   */
  async castVote(userId: string, designId: string, voteType: VoteType): Promise<void> {
    // Check authentication
    const user = await this.authService.requireAuth();

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      throw new Error('Cannot cast vote for another user');
    }

    // Prevent self-voting
    await this.preventSelfVote(userId, designId);

    // Check if user has already voted
    const existingVote = await this.getUserVote(userId, designId);
    
    if (existingVote) {
      throw new Error('User has already voted on this design. Use changeVote to modify the vote.');
    }

    // Store the vote
    const voteKey = `votes:${designId}:${userId}`;
    const vote: Vote = {
      userId,
      designId,
      voteType,
      timestamp: Date.now()
    };
    await this.redis.set(voteKey, JSON.stringify(vote));

    // Update vote count atomically
    await this.updateVoteCount(designId, voteType === VoteType.UPVOTE ? 1 : -1);

    console.log(`Vote cast: ${userId} ${voteType} on ${designId}`);
  }

  /**
   * Change an existing vote on a design
   * Requires authentication
   * @param userId - The ID of the user changing their vote
   * @param designId - The ID of the design
   * @param newVoteType - The new vote type
   */
  async changeVote(userId: string, designId: string, newVoteType: VoteType): Promise<void> {
    // Check authentication
    const user = await this.authService.requireAuth();

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      throw new Error('Cannot change vote for another user');
    }

    // Get existing vote
    const existingVote = await this.getUserVote(userId, designId);
    
    if (!existingVote) {
      throw new Error('No existing vote found. Use castVote to create a new vote.');
    }

    // If the vote type is the same, no change needed
    if (existingVote.voteType === newVoteType) {
      return;
    }

    // Update the vote
    const voteKey = `votes:${designId}:${userId}`;
    const updatedVote: Vote = {
      userId,
      designId,
      voteType: newVoteType,
      timestamp: Date.now()
    };
    await this.redis.set(voteKey, JSON.stringify(updatedVote));

    // Update vote count: changing from upvote to downvote is -2, downvote to upvote is +2
    const delta = newVoteType === VoteType.UPVOTE ? 2 : -2;
    await this.updateVoteCount(designId, delta);

    console.log(`Vote changed: ${userId} changed to ${newVoteType} on ${designId}`);
  }

  /**
   * Get a user's vote on a specific design
   * @param userId - The ID of the user
   * @param designId - The ID of the design
   * @returns The user's vote, or null if they haven't voted
   */
  async getUserVote(userId: string, designId: string): Promise<Vote | null> {
    const voteKey = `votes:${designId}:${userId}`;
    const voteData = await this.redis.get(voteKey);
    
    if (!voteData) {
      return null;
    }

    return JSON.parse(voteData) as Vote;
  }

  /**
   * Prevent a user from voting on their own design
   * @param userId - The ID of the user attempting to vote
   * @param designId - The ID of the design
   * @throws Error if the user is the owner of the design
   */
  async preventSelfVote(userId: string, designId: string): Promise<void> {
    // Load the design to check ownership
    const designKey = `design:${designId}`;
    const designData = await this.redis.get(designKey);
    
    if (!designData) {
      throw new Error('Design not found');
    }

    const design = JSON.parse(designData);
    
    if (design.userId === userId) {
      throw new Error('Users cannot vote on their own designs');
    }
  }

  /**
   * Update the vote count for a design atomically
   * @param designId - The ID of the design
   * @param delta - The change in vote count (+1, -1, +2, -2)
   */
  private async updateVoteCount(designId: string, delta: number): Promise<void> {
    // Load the design
    const designKey = `design:${designId}`;
    const designData = await this.redis.get(designKey);
    
    if (!designData) {
      throw new Error('Design not found');
    }

    const design = JSON.parse(designData);
    design.voteCount = (design.voteCount || 0) + delta;
    design.updatedAt = Date.now();

    // Save the updated design
    await this.redis.set(designKey, JSON.stringify(design));

    console.log(`Vote count updated for ${designId}: ${delta > 0 ? '+' : ''}${delta}`);
  }

  /**
   * Remove a vote from a design
   * @param userId - The ID of the user removing their vote
   * @param designId - The ID of the design
   */
  async removeVote(userId: string, designId: string): Promise<void> {
    const existingVote = await this.getUserVote(userId, designId);
    
    if (!existingVote) {
      throw new Error('No vote found to remove');
    }

    // Remove the vote
    const voteKey = `votes:${designId}:${userId}`;
    await this.redis.del(voteKey);

    // Update vote count
    const delta = existingVote.voteType === VoteType.UPVOTE ? -1 : 1;
    await this.updateVoteCount(designId, delta);

    console.log(`Vote removed: ${userId} removed ${existingVote.voteType} from ${designId}`);
  }
}
