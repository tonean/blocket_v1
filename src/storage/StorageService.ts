/**
 * StorageService - Wraps Devvit Redis operations for design and theme persistence
 */

import { Design, Theme } from '../types/models.js';

export interface RedisClient {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  sAdd(key: string, members: string[]): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  incrBy?(key: string, increment: number): Promise<number>;
  zAdd(key: string, members: { member: string; score: number }[]): Promise<number>;
  zRevRange(key: string, start: number, stop: number): Promise<string[]>;
  zRevRank(key: string, member: string): Promise<number | undefined>;
  zIncrBy(key: string, increment: number, member: string): Promise<number>;
}

export class StorageService {
  public redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  /**
   * Save a design to Redis with key pattern: design:{designId}
   */
  async saveDesign(design: Design): Promise<void> {
    try {
      const key = `design:${design.id}`;
      const value = JSON.stringify(design);
      await this.redis.set(key, value);

      // Also add to user's design list
      const userKey = `user:${design.userId}:designs`;
      await this.redis.sAdd(userKey, [design.id]);

      console.log(`Design ${design.id} saved successfully`);
    } catch (error) {
      console.error(`Failed to save design ${design.id}:`, error);
      throw new Error(`Failed to save design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a design from Redis by design ID
   */
  async loadDesign(designId: string): Promise<Design | null> {
    try {
      const key = `design:${designId}`;
      const value = await this.redis.get(key);

      if (!value) {
        console.log(`Design ${designId} not found`);
        return null;
      }

      const design = JSON.parse(value) as Design;
      console.log(`Design ${designId} loaded successfully`);
      return design;
    } catch (error) {
      console.error(`Failed to load design ${designId}:`, error);
      throw new Error(`Failed to load design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all design IDs for a specific user
   */
  async getUserDesigns(userId: string): Promise<Design[]> {
    try {
      const userKey = `user:${userId}:designs`;
      const designIds = await this.redis.sMembers(userKey);

      if (designIds.length === 0) {
        console.log(`No designs found for user ${userId}`);
        return [];
      }

      // Load all designs for this user
      const designs: Design[] = [];
      for (const designId of designIds) {
        const design = await this.loadDesign(designId);
        if (design) {
          designs.push(design);
        }
      }

      console.log(`Loaded ${designs.length} designs for user ${userId}`);
      return designs;
    } catch (error) {
      console.error(`Failed to get designs for user ${userId}:`, error);
      throw new Error(`Failed to get user designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a theme to Redis with key pattern: theme:{themeId}
   */
  async saveTheme(theme: Theme): Promise<void> {
    try {
      const key = `theme:${theme.id}`;
      const value = JSON.stringify(theme);
      await this.redis.set(key, value);

      // If this theme is active, also set it as current
      if (theme.active) {
        await this.redis.set('theme:current', theme.id);
      }

      console.log(`Theme ${theme.id} saved successfully`);
    } catch (error) {
      console.error(`Failed to save theme ${theme.id}:`, error);
      throw new Error(`Failed to save theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current active theme
   */
  async getCurrentTheme(): Promise<Theme | null> {
    try {
      const currentThemeId = await this.redis.get('theme:current');

      if (!currentThemeId) {
        console.log('No current theme set');
        return null;
      }

      const themeKey = `theme:${currentThemeId}`;
      const value = await this.redis.get(themeKey);

      if (!value) {
        console.log(`Current theme ${currentThemeId} not found`);
        return null;
      }

      const theme = JSON.parse(value) as Theme;
      console.log(`Current theme ${theme.id} loaded successfully`);
      return theme;
    } catch (error) {
      console.error('Failed to get current theme:', error);
      throw new Error(`Failed to get current theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a specific theme by ID
   */
  async loadTheme(themeId: string): Promise<Theme | null> {
    try {
      const key = `theme:${themeId}`;
      const value = await this.redis.get(key);

      if (!value) {
        console.log(`Theme ${themeId} not found`);
        return null;
      }

      const theme = JSON.parse(value) as Theme;
      console.log(`Theme ${themeId} loaded successfully`);
      return theme;
    } catch (error) {
      console.error(`Failed to load theme ${themeId}:`, error);
      throw new Error(`Failed to load theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a design from Redis
   */
  async deleteDesign(designId: string): Promise<void> {
    try {
      const key = `design:${designId}`;
      await this.redis.del(key);
      console.log(`Design ${designId} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete design ${designId}:`, error);
      throw new Error(`Failed to delete design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
