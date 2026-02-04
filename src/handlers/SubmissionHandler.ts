/**
 * SubmissionHandler - Manages design submissions and retrieval
 */

import { Design } from '../types/models.js';
import { StorageService } from '../storage/StorageService.js';
import { AuthService } from '../services/AuthService.js';

export class SubmissionHandler {
  private storage: StorageService;
  private authService: AuthService;

  constructor(storage: StorageService, authService: AuthService) {
    this.storage = storage;
    this.authService = authService;
  }

  /**
   * Submit a design - saves it and marks as submitted
   * Requires authentication
   */
  async submitDesign(design: Design): Promise<string> {
    try {
      // Check authentication
      const user = await this.authService.requireAuth();

      // Verify the design belongs to the authenticated user
      if (design.userId !== user.id) {
        throw new Error('Cannot submit a design that does not belong to you');
      }

      // Mark design as submitted
      const submittedDesign: Design = {
        ...design,
        username: user.username, // Ensure username is from authenticated user
        submitted: true,
        updatedAt: Date.now()
      };

      // Save the design
      await this.storage.saveDesign(submittedDesign);

      // Track submission for duplicate prevention
      const submissionKey = `submission:${design.userId}:${design.themeId}`;
      await this.storage['redis'].set(submissionKey, design.id);

      // Add to theme's submitted designs list
      const themeSubmissionsKey = `theme:${design.themeId}:submissions`;
      await this.storage['redis'].sAdd(themeSubmissionsKey, [design.id]);

      console.log(`Design ${design.id} submitted successfully by user ${design.userId}`);
      return design.id;
    } catch (error) {
      console.error(`Failed to submit design ${design.id}:`, error);
      throw new Error(`Failed to submit design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a user has already submitted for a specific theme
   */
  async hasUserSubmitted(userId: string, themeId: string): Promise<boolean> {
    try {
      const submissionKey = `submission:${userId}:${themeId}`;
      const designId = await this.storage['redis'].get(submissionKey);
      return designId !== undefined;
    } catch (error) {
      console.error(`Failed to check submission for user ${userId} and theme ${themeId}:`, error);
      throw new Error(`Failed to check submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get submitted designs for a theme with pagination
   */
  async getSubmittedDesigns(themeId: string, limit: number = 10, offset: number = 0): Promise<Design[]> {
    try {
      const themeSubmissionsKey = `theme:${themeId}:submissions`;
      const designIds = await this.storage['redis'].sMembers(themeSubmissionsKey);

      if (designIds.length === 0) {
        console.log(`No submitted designs found for theme ${themeId}`);
        return [];
      }

      // Load all designs
      const designs: Design[] = [];
      for (const designId of designIds) {
        const design = await this.storage.loadDesign(designId);
        if (design && design.submitted) {
          designs.push(design);
        }
      }

      // Sort by creation time (newest first)
      designs.sort((a, b) => b.createdAt - a.createdAt);

      // Apply pagination
      const paginatedDesigns = designs.slice(offset, offset + limit);

      console.log(`Retrieved ${paginatedDesigns.length} submitted designs for theme ${themeId}`);
      return paginatedDesigns;
    } catch (error) {
      console.error(`Failed to get submitted designs for theme ${themeId}:`, error);
      throw new Error(`Failed to get submitted designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all designs for a specific user
   */
  async getUserDesigns(userId: string): Promise<Design[]> {
    try {
      const designs = await this.storage.getUserDesigns(userId);
      console.log(`Retrieved ${designs.length} designs for user ${userId}`);
      return designs;
    } catch (error) {
      console.error(`Failed to get designs for user ${userId}:`, error);
      throw new Error(`Failed to get user designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single design by ID
   */
  async getDesignById(designId: string): Promise<Design | null> {
    try {
      const design = await this.storage.loadDesign(designId);
      if (design) {
        console.log(`Retrieved design ${designId}`);
      } else {
        console.log(`Design ${designId} not found`);
      }
      return design;
    } catch (error) {
      console.error(`Failed to get design ${designId}:`, error);
      throw new Error(`Failed to get design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
