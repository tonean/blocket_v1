/**
 * Unit tests for ThemeManager
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../managers/ThemeManager.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';

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

  clear(): void {
    this.store.clear();
    this.sets.clear();
  }
}

describe('ThemeManager Unit Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let themeManager: ThemeManager;

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    themeManager = new ThemeManager(storage);
  });

  // Feature: reddit-room-design-game, Requirement 8.5
  test('initializeDefaultTheme creates "School" theme correctly', async () => {
    const theme = await themeManager.initializeDefaultTheme();

    // Verify theme properties
    expect(theme).toBeDefined();
    expect(theme.id).toBe('theme_school_001');
    expect(theme.name).toBe('School');
    expect(theme.description).toBe('Design a classroom or study space');
    expect(theme.active).toBe(true);

    // Verify timing
    expect(theme.startTime).toBeLessThanOrEqual(Date.now());
    expect(theme.endTime).toBeGreaterThan(theme.startTime);
    
    // Verify duration is approximately 1 day (24 hours)
    const duration = theme.endTime - theme.startTime;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    expect(duration).toBeGreaterThanOrEqual(oneDayInMs - 1000); // Allow 1 second tolerance
    expect(duration).toBeLessThanOrEqual(oneDayInMs + 1000);
  });

  test('initializeDefaultTheme saves theme to storage', async () => {
    const theme = await themeManager.initializeDefaultTheme();

    // Verify theme can be retrieved from storage
    const loadedTheme = await storage.loadTheme(theme.id);
    expect(loadedTheme).not.toBeNull();
    expect(loadedTheme).toEqual(theme);
  });

  test('initializeDefaultTheme sets theme as current', async () => {
    const theme = await themeManager.initializeDefaultTheme();

    // Verify theme is set as current
    const currentTheme = await storage.getCurrentTheme();
    expect(currentTheme).not.toBeNull();
    expect(currentTheme!.id).toBe(theme.id);
    expect(currentTheme).toEqual(theme);
  });

  test('getCurrentTheme returns null when no theme is set', async () => {
    const theme = await themeManager.getCurrentTheme();
    expect(theme).toBeNull();
  });

  test('getThemeById returns null for non-existent theme', async () => {
    const theme = await themeManager.getThemeById('non_existent_theme');
    expect(theme).toBeNull();
  });

  test('getTimeRemaining returns 0 for expired theme', async () => {
    const expiredTheme = {
      id: 'theme_expired',
      name: 'Expired',
      description: 'An expired theme',
      startTime: Date.now() - 2000,
      endTime: Date.now() - 1000,
      active: false
    };

    const remaining = themeManager.getTimeRemaining(expiredTheme);
    expect(remaining).toBe(0);
  });

  test('getTimeRemaining calculates correct remaining time', async () => {
    const futureTime = Date.now() + 10000; // 10 seconds in future
    const activeTheme = {
      id: 'theme_active',
      name: 'Active',
      description: 'An active theme',
      startTime: Date.now(),
      endTime: futureTime,
      active: true
    };

    const remaining = themeManager.getTimeRemaining(activeTheme);
    expect(remaining).toBeGreaterThan(9000); // Should be close to 10 seconds
    expect(remaining).toBeLessThanOrEqual(10000);
  });

  test('scheduleNextTheme deactivates current theme', async () => {
    // Initialize default theme
    const oldTheme = await themeManager.initializeDefaultTheme();
    expect(oldTheme.active).toBe(true);

    // Create new theme
    const newTheme = {
      id: 'theme_new',
      name: 'New Theme',
      description: 'A new theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: false
    };

    // Schedule next theme
    await themeManager.scheduleNextTheme(newTheme);

    // Verify old theme is deactivated
    const loadedOldTheme = await storage.loadTheme(oldTheme.id);
    expect(loadedOldTheme).not.toBeNull();
    expect(loadedOldTheme!.active).toBe(false);
  });

  test('scheduleNextTheme activates new theme', async () => {
    // Create new theme
    const newTheme = {
      id: 'theme_new',
      name: 'New Theme',
      description: 'A new theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: false
    };

    // Schedule next theme
    await themeManager.scheduleNextTheme(newTheme);

    // Verify new theme is activated
    const loadedNewTheme = await storage.loadTheme(newTheme.id);
    expect(loadedNewTheme).not.toBeNull();
    expect(loadedNewTheme!.active).toBe(true);

    // Verify new theme is current
    const currentTheme = await storage.getCurrentTheme();
    expect(currentTheme).not.toBeNull();
    expect(currentTheme!.id).toBe(newTheme.id);
  });

  // Feature: reddit-room-design-game, Requirement 8.2
  test('scheduleNextTheme archives previous theme designs', async () => {
    // Initialize default theme
    const oldTheme = await themeManager.initializeDefaultTheme();

    // Create new theme
    const newTheme = {
      id: 'theme_new',
      name: 'New Theme',
      description: 'A new theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: false
    };

    // Schedule next theme (should archive old theme)
    await themeManager.scheduleNextTheme(newTheme);

    // Verify old theme is in archived set
    const archivedThemes = await redis.sMembers('theme:archived');
    expect(archivedThemes).toContain(oldTheme.id);
  });

  // Feature: reddit-room-design-game, Requirement 8.6
  test('theme rotation preserves historical designs', async () => {
    // Initialize default theme
    const oldTheme = await themeManager.initializeDefaultTheme();

    // Create new theme
    const newTheme = {
      id: 'theme_new',
      name: 'New Theme',
      description: 'A new theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: false
    };

    // Schedule next theme
    await themeManager.scheduleNextTheme(newTheme);

    // Verify old theme is still accessible by ID
    const loadedOldTheme = await storage.loadTheme(oldTheme.id);
    expect(loadedOldTheme).not.toBeNull();
    expect(loadedOldTheme!.id).toBe(oldTheme.id);
    expect(loadedOldTheme!.name).toBe('School');
    
    // Verify old theme is marked as inactive but still exists
    expect(loadedOldTheme!.active).toBe(false);
  });

  // Feature: reddit-room-design-game, Requirement 8.2
  test('archiveThemeDesigns adds theme to archived set', async () => {
    const themeId = 'theme_test_123';

    // Archive the theme
    await themeManager.archiveThemeDesigns(themeId);

    // Verify theme is in archived set
    const archivedThemes = await redis.sMembers('theme:archived');
    expect(archivedThemes).toContain(themeId);
  });

  test('archiveThemeDesigns handles multiple themes', async () => {
    const themeIds = ['theme_1', 'theme_2', 'theme_3'];

    // Archive multiple themes
    for (const themeId of themeIds) {
      await themeManager.archiveThemeDesigns(themeId);
    }

    // Verify all themes are in archived set
    const archivedThemes = await redis.sMembers('theme:archived');
    for (const themeId of themeIds) {
      expect(archivedThemes).toContain(themeId);
    }
  });

  test('notifyThemeChange logs notification when no context', async () => {
    const theme = {
      id: 'theme_test',
      name: 'Test Theme',
      description: 'A test theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: true
    };

    // Should not throw when context is not available
    await expect(themeManager.notifyThemeChange(theme)).resolves.not.toThrow();
  });

  test('scheduleNextTheme works when no current theme exists', async () => {
    // Create new theme without initializing a current theme
    const newTheme = {
      id: 'theme_first',
      name: 'First Theme',
      description: 'The first theme',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
      active: false
    };

    // Should not throw
    await expect(themeManager.scheduleNextTheme(newTheme)).resolves.not.toThrow();

    // Verify new theme is activated
    const currentTheme = await storage.getCurrentTheme();
    expect(currentTheme).not.toBeNull();
    expect(currentTheme!.id).toBe(newTheme.id);
    expect(currentTheme!.active).toBe(true);
  });
});
