/**
 * ThemeManager - Manages theme rotation, scheduling, and retrieval
 */

import { Theme } from '../types/models.js';
import { StorageService } from '../storage/StorageService.js';

export interface RedditContext {
  reddit?: {
    sendPrivateMessage(options: { to: string; subject: string; text: string }): Promise<void>;
    getSubredditById(id: string): Promise<{ name: string }>;
  };
}

export class ThemeManager {
  private storage: StorageService;
  private context?: RedditContext;

  constructor(storage: StorageService, context?: RedditContext) {
    this.storage = storage;
    this.context = context;
  }

  /**
   * Get the current active theme
   */
  async getCurrentTheme(): Promise<Theme | null> {
    try {
      const theme = await this.storage.getCurrentTheme();
      return theme;
    } catch (error) {
      console.error('Failed to get current theme:', error);
      throw error;
    }
  }

  /**
   * Get a specific theme by ID
   */
  async getThemeById(id: string): Promise<Theme | null> {
    try {
      const theme = await this.storage.loadTheme(id);
      return theme;
    } catch (error) {
      console.error(`Failed to get theme ${id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate time remaining for a theme in milliseconds
   */
  getTimeRemaining(theme: Theme): number {
    const now = Date.now();
    const remaining = theme.endTime - now;
    return Math.max(0, remaining);
  }

  /**
   * Initialize the default "School" theme for testing
   */
  async initializeDefaultTheme(): Promise<Theme> {
    try {
      const now = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      const schoolTheme: Theme = {
        id: 'theme_school_001',
        name: 'School',
        description: 'Design a classroom or study space',
        startTime: now,
        endTime: now + oneDayInMs,
        active: true
      };

      await this.storage.saveTheme(schoolTheme);
      console.log('Default "School" theme initialized');
      return schoolTheme;
    } catch (error) {
      console.error('Failed to initialize default theme:', error);
      throw error;
    }
  }

  /**
   * Schedule the next theme to become active
   * This deactivates the current theme and activates the new one
   */
  async scheduleNextTheme(theme: Theme): Promise<void> {
    try {
      // Get current theme and deactivate it
      const currentTheme = await this.getCurrentTheme();
      if (currentTheme) {
        currentTheme.active = false;
        await this.storage.saveTheme(currentTheme);
        console.log(`Deactivated theme: ${currentTheme.id}`);

        // Archive designs from the previous theme
        await this.archiveThemeDesigns(currentTheme.id);
      }

      // Activate the new theme
      theme.active = true;
      await this.storage.saveTheme(theme);
      console.log(`Activated new theme: ${theme.id}`);

      // Send notifications about the new theme
      await this.notifyThemeChange(theme);
    } catch (error) {
      console.error('Failed to schedule next theme:', error);
      throw error;
    }
  }

  /**
   * Archive designs from a completed theme
   * Marks designs as archived in storage for historical access
   */
  async archiveThemeDesigns(themeId: string): Promise<void> {
    try {
      // Store the theme ID in an archived themes set
      const archiveKey = `theme:archived`;
      await this.storage.redis.sAdd(archiveKey, [themeId]);
      
      console.log(`Archived designs for theme: ${themeId}`);
    } catch (error) {
      console.error(`Failed to archive designs for theme ${themeId}:`, error);
      throw error;
    }
  }

  /**
   * Send Reddit notifications to users about a new theme
   */
  async notifyThemeChange(theme: Theme): Promise<void> {
    try {
      if (!this.context?.reddit) {
        console.log('Reddit context not available, skipping notifications');
        return;
      }

      // In a real implementation, this would:
      // 1. Get list of active users who want notifications
      // 2. Send private messages or create a subreddit post
      // For now, we'll just log the notification
      console.log(`New theme notification: ${theme.name} - ${theme.description}`);
      
      // Example: Create a subreddit post about the new theme
      // This would be implemented when integrated with actual Reddit API
      // await this.context.reddit.submitPost({
      //   title: `New Theme: ${theme.name}`,
      //   text: theme.description,
      //   subredditName: 'roomdesigngame'
      // });
    } catch (error) {
      console.error('Failed to send theme change notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }
}
