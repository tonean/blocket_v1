/**
 * Integration tests for auto-save functionality
 * Tests that changes trigger auto-save and debouncing behavior
 * Validates: Requirements 13.1
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { AutoSaveManager, SaveStatus } from '../utils/AutoSaveManager.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';

// Mock Redis client for testing
class MockRedisClient implements RedisClient {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  public saveCount: number = 0;

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    if (key.startsWith('design:')) {
      this.saveCount++;
    }
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
    this.saveCount = 0;
  }

  getSaveCount(): number {
    return this.saveCount;
  }
}

// Helper to wait for a specific duration
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

describe('AutoSave Integration Tests', () => {
  let redis: MockRedisClient;
  let storage: StorageService;
  let autoSaveManager: AutoSaveManager;

  const createMockDesign = (id: string = 'design-1'): Design => ({
    id,
    userId: 'user-123',
    username: 'testuser',
    themeId: 'theme-456',
    backgroundColor: '#FFFFFF',
    assets: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    submitted: false,
    voteCount: 0,
  });

  beforeEach(() => {
    redis = new MockRedisClient();
    storage = new StorageService(redis);
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (autoSaveManager) {
      autoSaveManager.destroy();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('scheduleAutoSave triggers save after debounce period', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Schedule auto-save
    autoSaveManager.scheduleAutoSave(design);

    // Verify save hasn't happened yet
    expect(redis.getSaveCount()).toBe(0);
    expect(autoSaveManager.getStatus()).toBe('idle');

    // Fast-forward time by 2 seconds and run all timers
    await vi.advanceTimersByTimeAsync(2000);

    // Verify save happened
    expect(redis.getSaveCount()).toBe(1);
    expect(autoSaveManager.getStatus()).toBe('saved');
  });

  test('multiple scheduleAutoSave calls debounce correctly', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Schedule multiple saves rapidly
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(500);
    
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(500);
    
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(500);

    // Only 1.5 seconds have passed, no save yet
    expect(redis.getSaveCount()).toBe(0);

    // Fast-forward remaining time (2 seconds from last schedule)
    await vi.advanceTimersByTimeAsync(1500);

    // Verify only one save happened (debounced)
    expect(redis.getSaveCount()).toBe(1);
  });

  test('design changes trigger auto-save after inactivity', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Simulate multiple design changes
    design.backgroundColor = '#FF0000';
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(500);

    design.backgroundColor = '#00FF00';
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(500);

    design.backgroundColor = '#0000FF';
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);

    // Wait for debounce period
    await vi.advanceTimersByTimeAsync(2000);

    // Verify only one save with final state
    expect(redis.getSaveCount()).toBe(1);
    
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.backgroundColor).toBe('#0000FF');
  });

  test('forceSave bypasses debouncing', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Schedule auto-save
    autoSaveManager.scheduleAutoSave(design);

    // Immediately force save (should cancel pending save and save immediately)
    await autoSaveManager.forceSave(design);

    // Verify save happened immediately (the key test)
    expect(redis.getSaveCount()).toBe(1);

    // Fast-forward time to ensure no duplicate save from the scheduled one
    await vi.advanceTimersByTimeAsync(3000);

    // Still only one save (scheduled save was cancelled)
    expect(redis.getSaveCount()).toBe(1);
  });

  test('cancelPendingSave prevents scheduled save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Schedule auto-save
    autoSaveManager.scheduleAutoSave(design);

    // Cancel before debounce completes
    await vi.advanceTimersByTimeAsync(1000);
    autoSaveManager.cancelPendingSave();

    // Fast-forward remaining time
    await vi.advanceTimersByTimeAsync(2000);

    // Verify no save happened
    expect(redis.getSaveCount()).toBe(0);
    expect(autoSaveManager.getStatus()).toBe('idle');
  });

  test('save status transitions correctly', async () => {
    const statusChanges: SaveStatus[] = [];
    
    autoSaveManager = new AutoSaveManager(storage, {
      debounceMs: 2000,
      onStatusChange: (status) => statusChanges.push(status),
    });

    const design = createMockDesign();

    // Schedule save
    autoSaveManager.scheduleAutoSave(design);
    expect(statusChanges).toContain('idle');

    // Wait for save to complete
    await vi.advanceTimersByTimeAsync(2000);

    // Verify status transitions: idle -> saving -> saved
    expect(statusChanges).toContain('saving');
    expect(statusChanges).toContain('saved');
  });

  test('save error is handled gracefully', async () => {
    // Create a storage service that fails
    const failingRedis = new MockRedisClient();
    failingRedis.set = async () => {
      throw new Error('Storage failure');
    };
    const failingStorage = new StorageService(failingRedis);

    let errorMessage: string | undefined;
    autoSaveManager = new AutoSaveManager(failingStorage, {
      debounceMs: 2000,
      onStatusChange: (status, error) => {
        if (status === 'error') {
          errorMessage = error;
        }
      },
    });

    const design = createMockDesign();

    // Schedule save
    autoSaveManager.scheduleAutoSave(design);

    // Wait for save attempt
    await vi.advanceTimersByTimeAsync(2000);

    // Verify error status
    expect(autoSaveManager.getStatus()).toBe('error');
    expect(errorMessage).toBeDefined();
    expect(errorMessage).toContain('Storage failure');
  });

  test('lastSaveTime is updated after successful save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    const beforeSave = Date.now();

    // Schedule and complete save
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(2000);

    const lastSaveTime = autoSaveManager.getLastSaveTime();
    expect(lastSaveTime).toBeGreaterThanOrEqual(beforeSave);
  });

  test('asset placement triggers auto-save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Add an asset
    design.assets.push({
      assetId: 'desk',
      x: 100,
      y: 200,
      rotation: 0,
      zIndex: 1,
    });
    design.updatedAt = Date.now();

    autoSaveManager.scheduleAutoSave(design);

    // Wait for save
    await vi.advanceTimersByTimeAsync(2000);

    // Verify design with asset was saved
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.assets.length).toBe(1);
    expect(savedDesign!.assets[0].assetId).toBe('desk');
  });

  test('asset movement triggers auto-save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Add and move an asset
    design.assets.push({
      assetId: 'chair',
      x: 100,
      y: 100,
      rotation: 0,
      zIndex: 1,
    });

    // Move the asset
    design.assets[0].x = 200;
    design.assets[0].y = 250;
    design.updatedAt = Date.now();

    autoSaveManager.scheduleAutoSave(design);

    // Wait for save
    await vi.advanceTimersByTimeAsync(2000);

    // Verify updated position was saved
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.assets[0].x).toBe(200);
    expect(savedDesign!.assets[0].y).toBe(250);
  });

  test('asset rotation triggers auto-save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Add and rotate an asset
    design.assets.push({
      assetId: 'desk',
      x: 150,
      y: 150,
      rotation: 0,
      zIndex: 1,
    });

    // Rotate the asset
    design.assets[0].rotation = 90;
    design.updatedAt = Date.now();

    autoSaveManager.scheduleAutoSave(design);

    // Wait for save
    await vi.advanceTimersByTimeAsync(2000);

    // Verify rotation was saved
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.assets[0].rotation).toBe(90);
  });

  test('asset deletion triggers auto-save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Add two assets
    design.assets.push(
      { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
      { assetId: 'chair', x: 150, y: 150, rotation: 0, zIndex: 2 }
    );

    // Remove one asset
    design.assets.splice(0, 1);
    design.updatedAt = Date.now();

    autoSaveManager.scheduleAutoSave(design);

    // Wait for save
    await vi.advanceTimersByTimeAsync(2000);

    // Verify deletion was saved
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.assets.length).toBe(1);
    expect(savedDesign!.assets[0].assetId).toBe('chair');
  });

  test('color change triggers auto-save', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Change background color
    design.backgroundColor = '#FF5733';
    design.updatedAt = Date.now();

    autoSaveManager.scheduleAutoSave(design);

    // Wait for save
    await vi.advanceTimersByTimeAsync(2000);

    // Verify color change was saved
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.backgroundColor).toBe('#FF5733');
  });

  test('rapid changes result in single save with final state', async () => {
    autoSaveManager = new AutoSaveManager(storage, { debounceMs: 2000 });
    const design = createMockDesign();

    // Simulate rapid changes (place, move, rotate, color change)
    design.assets.push({
      assetId: 'desk',
      x: 100,
      y: 100,
      rotation: 0,
      zIndex: 1,
    });
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(300);

    design.assets[0].x = 150;
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(300);

    design.assets[0].rotation = 90;
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);
    await vi.advanceTimersByTimeAsync(300);

    design.backgroundColor = '#00FF00';
    design.updatedAt = Date.now();
    autoSaveManager.scheduleAutoSave(design);

    // Wait for debounce
    await vi.advanceTimersByTimeAsync(2000);

    // Verify only one save with all changes
    expect(redis.getSaveCount()).toBe(1);
    
    const savedDesign = await storage.loadDesign(design.id);
    expect(savedDesign).not.toBeNull();
    expect(savedDesign!.assets[0].x).toBe(150);
    expect(savedDesign!.assets[0].rotation).toBe(90);
    expect(savedDesign!.backgroundColor).toBe('#00FF00');
  });
});
