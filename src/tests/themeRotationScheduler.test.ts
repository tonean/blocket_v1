/**
 * Unit tests for ThemeRotationScheduler
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { handleThemeRotation } from '../schedulers/ThemeRotationScheduler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { ScheduledJobEvent } from '@devvit/public-api';

// Mock Redis client for testing
class MockRedisClient implements RedisClient {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

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

  async zAdd(): Promise<number> {
    return 0;
  }

  async zRevRange(): Promise<string[]> {
    return [];
  }

  async zRevRank(): Promise<number | undefined> {
    return undefined;
  }

  async zIncrBy(): Promise<number> {
    return 0;
  }

  clear(): void {
    this.store.clear();
    this.sets.clear();
  }
}

describe('ThemeRotationScheduler Unit Tests', () => {
  let redis: MockRedisClient;
  let mockContext: any;
  let mockEvent: ScheduledJobEvent;

  beforeEach(() => {
    redis = new MockRedisClient();
    mockContext = {
      redis,
      reddit: undefined,
    };
    mockEvent = {} as ScheduledJobEvent;
  });

  // Feature: reddit-room-design-game, Requirement 8.2
  test('handleThemeRotation initializes default theme when none exists', async () => {
    await handleThemeRotation(mockEvent, mockContext);

    // Verify default theme was created
    const currentThemeId = await redis.get('theme:current');
    expect(currentThemeId).toBe('theme_school_001');

    const themeData = await redis.get('theme:theme_school_001');
    expect(themeData).toBeDefined();
    
    const theme = JSON.parse(themeData!);
    expect(theme.name).toBe('School');
    expect(theme.active).toBe(true);
  });

  // Feature: reddit-room-design-game, Requirement 8.2
  test('handleThemeRotation does not rotate active theme', async () => {
    // Create an active theme that hasn't expired
    const storage = new StorageService(redis);
    const futureTime = Date.now() + 86400000; // 24 hours in future
    const activeTheme = {
      id: 'theme_active',
      name: 'Active Theme',
      description: 'Still active',
      startTime: Date.now(),
      endTime: futureTime,
      active: true,
    };
    await storage.saveTheme(activeTheme);

    // Run rotation
    await handleThemeRotation(mockEvent, mockContext);

    // Verify theme is still current
    const currentThemeId = await redis.get('theme:current');
    expect(currentThemeId).toBe('theme_active');

    // Verify theme is still active
    const themeData = await redis.get('theme:theme_active');
    const theme = JSON.parse(themeData!);
    expect(theme.active).toBe(true);
  });

  // Feature: reddit-room-design-game, Requirement 8.2, 8.6
  test('handleThemeRotation rotates expired theme', async () => {
    // Create an expired theme
    const storage = new StorageService(redis);
    const pastTime = Date.now() - 1000; // 1 second ago
    const expiredTheme = {
      id: 'theme_expired',
      name: 'School',
      description: 'Expired theme',
      startTime: Date.now() - 86400000,
      endTime: pastTime,
      active: true,
    };
    await storage.saveTheme(expiredTheme);

    // Run rotation
    await handleThemeRotation(mockEvent, mockContext);

    // Verify old theme is deactivated
    const oldThemeData = await redis.get('theme:theme_expired');
    const oldTheme = JSON.parse(oldThemeData!);
    expect(oldTheme.active).toBe(false);

    // Verify new theme is current
    const currentThemeId = await redis.get('theme:current');
    expect(currentThemeId).not.toBe('theme_expired');

    // Verify new theme exists and is active
    const newThemeData = await redis.get(`theme:${currentThemeId}`);
    expect(newThemeData).toBeDefined();
    const newTheme = JSON.parse(newThemeData!);
    expect(newTheme.active).toBe(true);
    expect(newTheme.name).toBe('Office'); // Next in rotation after School
  });

  // Feature: reddit-room-design-game, Requirement 8.6
  test('handleThemeRotation archives previous theme', async () => {
    // Create an expired theme
    const storage = new StorageService(redis);
    const pastTime = Date.now() - 1000;
    const expiredTheme = {
      id: 'theme_expired',
      name: 'School',
      description: 'Expired theme',
      startTime: Date.now() - 86400000,
      endTime: pastTime,
      active: true,
    };
    await storage.saveTheme(expiredTheme);

    // Run rotation
    await handleThemeRotation(mockEvent, mockContext);

    // Verify theme was archived
    const archivedThemes = await redis.sMembers('theme:archived');
    expect(archivedThemes).toContain('theme_expired');
  });

  test('handleThemeRotation handles errors gracefully', async () => {
    // Create a context that will cause an error
    const badContext = {
      redis: {
        get: async () => {
          throw new Error('Redis error');
        },
      },
    };

    // Should throw the error
    await expect(handleThemeRotation(mockEvent, badContext as any)).rejects.toThrow();
  });

  test('theme rotation cycles through predefined themes', async () => {
    const storage = new StorageService(redis);
    const themes = ['School', 'Office', 'Bedroom', 'Kitchen', 'Living Room', 'Library'];

    // Start with School theme (expired)
    let currentTheme = {
      id: 'theme_start',
      name: 'School',
      description: 'Starting theme',
      startTime: Date.now() - 86400000,
      endTime: Date.now() - 1000,
      active: true,
    };
    await storage.saveTheme(currentTheme);

    // Rotate through all themes
    for (let i = 0; i < themes.length; i++) {
      await handleThemeRotation(mockEvent, mockContext);

      const currentThemeId = await redis.get('theme:current');
      const themeData = await redis.get(`theme:${currentThemeId}`);
      const theme = JSON.parse(themeData!);

      // Verify next theme in rotation
      const expectedTheme = themes[(i + 1) % themes.length];
      expect(theme.name).toBe(expectedTheme);

      // Make theme expired for next rotation
      theme.endTime = Date.now() - 1000;
      await storage.saveTheme(theme);
    }
  });
});
