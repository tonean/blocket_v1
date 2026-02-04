/**
 * Property-based tests for StorageService
 * Feature: reddit-room-design-game
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design, Theme } from '../types/models.js';

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

// Generators for property-based testing
const placedAssetGen = fc.record({
  assetId: fc.string({ minLength: 1, maxLength: 20 }),
  x: fc.integer({ min: 0, max: 800 }),
  y: fc.integer({ min: 0, max: 600 }),
  rotation: fc.constantFrom(0, 90, 180, 270),
  zIndex: fc.integer({ min: 0, max: 100 })
});

const designGen = fc.record({
  id: fc.uuid(),
  userId: fc.string({ minLength: 5, maxLength: 20 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  themeId: fc.uuid(),
  backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`),
  assets: fc.array(placedAssetGen, { maxLength: 20 }),
  createdAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  updatedAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  submitted: fc.boolean(),
  voteCount: fc.integer({ min: 0, max: 1000 })
});

const themeGen = fc.record({
  id: fc.uuid(),
  name: fc.constantFrom('School', 'Office', 'Bedroom', 'Kitchen', 'Living Room'),
  description: fc.string({ minLength: 10, maxLength: 100 }),
  startTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  endTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  active: fc.boolean()
}).filter(theme => theme.endTime > theme.startTime);

describe('StorageService Property Tests', () => {
  // Feature: reddit-room-design-game, Property 6: Design State Persistence Round-Trip
  test('Property 6: saving and loading a design preserves all properties', async () => {
    await fc.assert(
      fc.asyncProperty(designGen, async (design) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);

        // Save the design
        await storage.saveDesign(design);

        // Load the design
        const loadedDesign = await storage.loadDesign(design.id);

        // Verify all properties are preserved
        expect(loadedDesign).not.toBeNull();
        expect(loadedDesign).toEqual(design);
        expect(loadedDesign!.id).toBe(design.id);
        expect(loadedDesign!.userId).toBe(design.userId);
        expect(loadedDesign!.username).toBe(design.username);
        expect(loadedDesign!.themeId).toBe(design.themeId);
        expect(loadedDesign!.backgroundColor).toBe(design.backgroundColor);
        expect(loadedDesign!.assets).toEqual(design.assets);
        expect(loadedDesign!.createdAt).toBe(design.createdAt);
        expect(loadedDesign!.updatedAt).toBe(design.updatedAt);
        expect(loadedDesign!.submitted).toBe(design.submitted);
        expect(loadedDesign!.voteCount).toBe(design.voteCount);

        // Verify assets are preserved correctly
        expect(loadedDesign!.assets.length).toBe(design.assets.length);
        for (let i = 0; i < design.assets.length; i++) {
          expect(loadedDesign!.assets[i]).toEqual(design.assets[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 21: Submitted Design Persistence
  test('Property 21: submitted designs are permanently stored and retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        designGen.map(d => ({ ...d, submitted: true })),
        async (design) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);

          // Save the submitted design
          await storage.saveDesign(design);

          // Verify it can be retrieved at any time
          const loadedDesign = await storage.loadDesign(design.id);

          expect(loadedDesign).not.toBeNull();
          expect(loadedDesign!.submitted).toBe(true);
          expect(loadedDesign!.id).toBe(design.id);

          // Verify it persists across multiple retrievals
          const loadedAgain = await storage.loadDesign(design.id);
          expect(loadedAgain).not.toBeNull();
          expect(loadedAgain).toEqual(loadedDesign);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: getUserDesigns returns all designs for a user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(designGen, { minLength: 1, maxLength: 10 }),
        async (designs) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);

          // Use the same userId for all designs
          const userId = designs[0].userId;
          const userDesigns = designs.map(d => ({ ...d, userId }));

          // Save all designs
          for (const design of userDesigns) {
            await storage.saveDesign(design);
          }

          // Retrieve user's designs
          const loadedDesigns = await storage.getUserDesigns(userId);

          // Verify all designs are returned
          expect(loadedDesigns.length).toBe(userDesigns.length);
          
          // Verify each design is present
          for (const design of userDesigns) {
            const found = loadedDesigns.find(d => d.id === design.id);
            expect(found).toBeDefined();
            expect(found).toEqual(design);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: theme persistence round-trip preserves all properties', async () => {
    await fc.assert(
      fc.asyncProperty(themeGen, async (theme) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);

        // Save the theme
        await storage.saveTheme(theme);

        // Load the theme
        const loadedTheme = await storage.loadTheme(theme.id);

        // Verify all properties are preserved
        expect(loadedTheme).not.toBeNull();
        expect(loadedTheme).toEqual(theme);
        expect(loadedTheme!.id).toBe(theme.id);
        expect(loadedTheme!.name).toBe(theme.name);
        expect(loadedTheme!.description).toBe(theme.description);
        expect(loadedTheme!.startTime).toBe(theme.startTime);
        expect(loadedTheme!.endTime).toBe(theme.endTime);
        expect(loadedTheme!.active).toBe(theme.active);
      }),
      { numRuns: 100 }
    );
  });

  test('Property: active theme is set as current theme', async () => {
    await fc.assert(
      fc.asyncProperty(
        themeGen.map(t => ({ ...t, active: true })),
        async (theme) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);

          // Save the active theme
          await storage.saveTheme(theme);

          // Get current theme
          const currentTheme = await storage.getCurrentTheme();

          // Verify it's the same theme
          expect(currentTheme).not.toBeNull();
          expect(currentTheme!.id).toBe(theme.id);
          expect(currentTheme).toEqual(theme);
        }
      ),
      { numRuns: 100 }
    );
  });
});
