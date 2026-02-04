/**
 * Unit tests for StorageService error handling
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design, Theme } from '../types/models.js';

// Mock Redis client that can simulate errors
class ErrorMockRedisClient implements RedisClient {
  private shouldFail: boolean = false;
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  setFailureMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  async get(key: string): Promise<string | undefined> {
    if (this.shouldFail) {
      throw new Error('Redis get operation failed');
    }
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Redis set operation failed');
    }
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Redis del operation failed');
    }
    this.store.delete(key);
  }

  async sAdd(key: string, members: string[]): Promise<number> {
    if (this.shouldFail) {
      throw new Error('Redis sAdd operation failed');
    }
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
    if (this.shouldFail) {
      throw new Error('Redis sMembers operation failed');
    }
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  clear(): void {
    this.store.clear();
    this.sets.clear();
  }
}

describe('StorageService Error Handling', () => {
  let redis: ErrorMockRedisClient;
  let storage: StorageService;

  const mockDesign: Design = {
    id: 'design-123',
    userId: 'user-456',
    username: 'testuser',
    themeId: 'theme-789',
    backgroundColor: '#FFFFFF',
    assets: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    submitted: false,
    voteCount: 0
  };

  const mockTheme: Theme = {
    id: 'theme-123',
    name: 'School',
    description: 'Design a classroom',
    startTime: Date.now(),
    endTime: Date.now() + 86400000,
    active: true
  };

  beforeEach(() => {
    redis = new ErrorMockRedisClient();
    storage = new StorageService(redis);
  });

  test('saveDesign throws error when Redis set fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.saveDesign(mockDesign)).rejects.toThrow('Failed to save design');
  });

  test('loadDesign throws error when Redis get fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.loadDesign('design-123')).rejects.toThrow('Failed to load design');
  });

  test('loadDesign returns null when design does not exist', async () => {
    const result = await storage.loadDesign('nonexistent-design');

    expect(result).toBeNull();
  });

  test('getUserDesigns throws error when Redis operations fail', async () => {
    redis.setFailureMode(true);

    await expect(storage.getUserDesigns('user-123')).rejects.toThrow('Failed to get user designs');
  });

  test('getUserDesigns returns empty array when user has no designs', async () => {
    const result = await storage.getUserDesigns('user-with-no-designs');

    expect(result).toEqual([]);
  });

  test('saveTheme throws error when Redis set fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.saveTheme(mockTheme)).rejects.toThrow('Failed to save theme');
  });

  test('getCurrentTheme throws error when Redis get fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.getCurrentTheme()).rejects.toThrow('Failed to get current theme');
  });

  test('getCurrentTheme returns null when no current theme is set', async () => {
    const result = await storage.getCurrentTheme();

    expect(result).toBeNull();
  });

  test('loadTheme throws error when Redis get fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.loadTheme('theme-123')).rejects.toThrow('Failed to load theme');
  });

  test('loadTheme returns null when theme does not exist', async () => {
    const result = await storage.loadTheme('nonexistent-theme');

    expect(result).toBeNull();
  });

  test('deleteDesign throws error when Redis del fails', async () => {
    redis.setFailureMode(true);

    await expect(storage.deleteDesign('design-123')).rejects.toThrow('Failed to delete design');
  });

  test('saveDesign handles partial failure gracefully', async () => {
    // First save should succeed
    await storage.saveDesign(mockDesign);

    // Enable failure mode
    redis.setFailureMode(true);

    // Second save should fail
    await expect(storage.saveDesign(mockDesign)).rejects.toThrow('Failed to save design');
  });

  test('getUserDesigns handles missing designs gracefully', async () => {
    // Save a design
    await storage.saveDesign(mockDesign);

    // Manually delete the design but leave it in the user's design list
    await storage.deleteDesign(mockDesign.id);

    // getUserDesigns should skip the missing design
    const designs = await storage.getUserDesigns(mockDesign.userId);

    expect(designs).toEqual([]);
  });

  test('saveTheme sets current theme when active is true', async () => {
    const activeTheme: Theme = { ...mockTheme, active: true };

    await storage.saveTheme(activeTheme);

    const currentTheme = await storage.getCurrentTheme();

    expect(currentTheme).not.toBeNull();
    expect(currentTheme!.id).toBe(activeTheme.id);
  });

  test('saveTheme does not set current theme when active is false', async () => {
    const inactiveTheme: Theme = { ...mockTheme, active: false };

    await storage.saveTheme(inactiveTheme);

    const currentTheme = await storage.getCurrentTheme();

    // Should be null since we didn't set an active theme
    expect(currentTheme).toBeNull();
  });

  test('error messages include context information', async () => {
    redis.setFailureMode(true);

    try {
      await storage.saveDesign(mockDesign);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed to save design');
    }
  });

  test('storage operations are atomic - design and user list updated together', async () => {
    await storage.saveDesign(mockDesign);

    // Verify design was saved
    const loadedDesign = await storage.loadDesign(mockDesign.id);
    expect(loadedDesign).not.toBeNull();

    // Verify design was added to user's list
    const userDesigns = await storage.getUserDesigns(mockDesign.userId);
    expect(userDesigns.length).toBe(1);
    expect(userDesigns[0].id).toBe(mockDesign.id);
  });
});
