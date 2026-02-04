/**
 * Property-based tests for ThemeManager
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ThemeManager } from '../managers/ThemeManager.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Theme, Design } from '../types/models.js';

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
const themeGen = fc.record({
  id: fc.uuid(),
  name: fc.constantFrom('School', 'Office', 'Bedroom', 'Kitchen', 'Living Room'),
  description: fc.string({ minLength: 10, maxLength: 100 }),
  startTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  endTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  active: fc.boolean()
}).filter(theme => theme.endTime > theme.startTime);

describe('ThemeManager Property Tests', () => {
  // Feature: reddit-room-design-game, Property 16: Theme Countdown Accuracy
  test('Property 16: countdown timer accurately calculates remaining time', () => {
    fc.assert(
      fc.property(themeGen, (theme) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);
        const themeManager = new ThemeManager(storage);

        // Mock Date.now() to control current time
        const mockNow = theme.startTime + Math.floor((theme.endTime - theme.startTime) / 2);
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        // Calculate time remaining
        const timeRemaining = themeManager.getTimeRemaining(theme);

        // Expected remaining time
        const expectedRemaining = theme.endTime - mockNow;

        // Verify countdown accuracy
        expect(timeRemaining).toBe(expectedRemaining);
        expect(timeRemaining).toBeGreaterThanOrEqual(0);
        expect(timeRemaining).toBeLessThanOrEqual(theme.endTime - theme.startTime);

        // Restore Date.now()
        vi.restoreAllMocks();
      }),
      { numRuns: 100 }
    );
  });

  test('Property 16: countdown returns 0 when theme has ended', () => {
    fc.assert(
      fc.property(themeGen, (theme) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);
        const themeManager = new ThemeManager(storage);

        // Mock Date.now() to be after theme end time
        const mockNow = theme.endTime + 1000;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        // Calculate time remaining
        const timeRemaining = themeManager.getTimeRemaining(theme);

        // Should return 0 when theme has ended
        expect(timeRemaining).toBe(0);

        // Restore Date.now()
        vi.restoreAllMocks();
      }),
      { numRuns: 100 }
    );
  });

  test('Property 16: countdown returns full duration at start time', () => {
    fc.assert(
      fc.property(themeGen, (theme) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);
        const themeManager = new ThemeManager(storage);

        // Mock Date.now() to be at theme start time
        vi.spyOn(Date, 'now').mockReturnValue(theme.startTime);

        // Calculate time remaining
        const timeRemaining = themeManager.getTimeRemaining(theme);

        // Should return full duration at start
        const expectedDuration = theme.endTime - theme.startTime;
        expect(timeRemaining).toBe(expectedDuration);

        // Restore Date.now()
        vi.restoreAllMocks();
      }),
      { numRuns: 100 }
    );
  });
});

// Generators for designs
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

describe('ThemeManager Theme Transition Tests', () => {
  // Feature: reddit-room-design-game, Property 17: Theme Change Preserves Historical Designs
  test('Property 17: theme transition preserves all designs from previous theme', async () => {
    await fc.assert(
      fc.asyncProperty(
        themeGen,
        themeGen,
        fc.array(designGen, { minLength: 1, maxLength: 10 }),
        async (oldTheme, newTheme, designs) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);
          const themeManager = new ThemeManager(storage);

          // Ensure themes have different IDs
          if (oldTheme.id === newTheme.id) {
            newTheme = { ...newTheme, id: `${newTheme.id}_new` };
          }

          // Set old theme as active
          oldTheme.active = true;
          await storage.saveTheme(oldTheme);

          // Create designs associated with old theme
          const oldThemeDesigns = designs.map(d => ({ ...d, themeId: oldTheme.id }));
          for (const design of oldThemeDesigns) {
            await storage.saveDesign(design);
          }

          // Schedule next theme (this should deactivate old theme and activate new theme)
          await themeManager.scheduleNextTheme(newTheme);

          // Verify old theme is deactivated
          const loadedOldTheme = await storage.loadTheme(oldTheme.id);
          expect(loadedOldTheme).not.toBeNull();
          expect(loadedOldTheme!.active).toBe(false);

          // Verify new theme is active
          const loadedNewTheme = await storage.loadTheme(newTheme.id);
          expect(loadedNewTheme).not.toBeNull();
          expect(loadedNewTheme!.active).toBe(true);

          // Verify all designs from old theme are still accessible
          for (const design of oldThemeDesigns) {
            const loadedDesign = await storage.loadDesign(design.id);
            expect(loadedDesign).not.toBeNull();
            expect(loadedDesign!.themeId).toBe(oldTheme.id);
            expect(loadedDesign).toEqual(design);
          }

          // Verify designs can be queried by their theme ID
          for (const design of oldThemeDesigns) {
            const loadedDesign = await storage.loadDesign(design.id);
            expect(loadedDesign).not.toBeNull();
            expect(loadedDesign!.themeId).toBe(oldTheme.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 17: multiple theme transitions preserve all historical designs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(themeGen, { minLength: 3, maxLength: 5 }),
        fc.array(designGen, { minLength: 5, maxLength: 15 }),
        async (themes, designs) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);
          const themeManager = new ThemeManager(storage);

          // Ensure all themes have unique IDs
          const uniqueThemes = themes.map((theme, index) => ({
            ...theme,
            id: `theme_${index}_${theme.id}`
          }));

          // Ensure all designs have unique IDs and distribute across themes
          const designsByTheme = new Map<string, Design[]>();
          uniqueThemes.forEach((theme, index) => {
            const themeDesigns = designs
              .slice(index, designs.length)
              .filter((_, i) => i % uniqueThemes.length === index)
              .map((d, designIndex) => ({ 
                ...d, 
                id: `design_${index}_${designIndex}_${d.id}`,
                themeId: theme.id 
              }));
            designsByTheme.set(theme.id, themeDesigns);
          });

          // Activate themes sequentially
          for (let i = 0; i < uniqueThemes.length; i++) {
            const theme = uniqueThemes[i];
            
            if (i === 0) {
              // First theme - just activate it
              theme.active = true;
              await storage.saveTheme(theme);
            } else {
              // Subsequent themes - use scheduleNextTheme
              await themeManager.scheduleNextTheme(theme);
            }

            // Save designs for this theme
            const themeDesigns = designsByTheme.get(theme.id) || [];
            for (const design of themeDesigns) {
              await storage.saveDesign(design);
            }
          }

          // Verify all designs from all themes are still accessible
          for (const [themeId, themeDesigns] of designsByTheme.entries()) {
            for (const design of themeDesigns) {
              const loadedDesign = await storage.loadDesign(design.id);
              expect(loadedDesign).not.toBeNull();
              expect(loadedDesign!.themeId).toBe(themeId);
              expect(loadedDesign).toEqual(design);
            }
          }

          // Verify only the last theme is active
          for (let i = 0; i < uniqueThemes.length; i++) {
            const theme = uniqueThemes[i];
            const loadedTheme = await storage.loadTheme(theme.id);
            expect(loadedTheme).not.toBeNull();
            
            if (i === uniqueThemes.length - 1) {
              expect(loadedTheme!.active).toBe(true);
            } else {
              expect(loadedTheme!.active).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
