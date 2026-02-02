/**
 * Property-based tests for AssetManager
 * Feature: reddit-room-design-game
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { AssetManager } from '../managers/AssetManager.js';
import { AssetCategory } from '../types/models.js';

describe('AssetManager Property Tests', () => {
  let assetManager: AssetManager;

  beforeEach(() => {
    assetManager = new AssetManager();
    assetManager.loadAssets();
  });

  // Feature: reddit-room-design-game, Property 2: Asset Categorization
  // **Validates: Requirements 2.3**
  test('Property 2: Asset Categorization - every asset has exactly one valid category', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'bookshelf_1.png',
          'bookshelf_2.png',
          'bookshelf_3.png',
          'chair_1.png',
          'chair_2.png',
          'chair_3.PNG',
          'chair_4.PNG',
          'chair_5.PNG',
          'clock.png',
          'cup.png',
          'desk.png',
          'lamp.png',
          'laptop.png',
          'mouse.png',
          'rug_1.png',
          'rug_2.png',
          'rug_3.png',
          'trash.png'
        ),
        (filename) => {
          // Load assets to ensure they're categorized
          const assets = assetManager.getAllAssets();
          const asset = assets.find((a) => a.imageUrl.includes(filename));

          // Asset should exist
          expect(asset).toBeDefined();
          if (!asset) return false;

          // Asset should have exactly one valid category
          const validCategories = Object.values(AssetCategory);
          const hasValidCategory = validCategories.includes(asset.category);

          // Verify categorization logic based on filename
          const lowerFilename = filename.toLowerCase();
          let expectedCategory: AssetCategory;

          if (lowerFilename.startsWith('bookshelf')) {
            expectedCategory = AssetCategory.BOOKSHELF;
          } else if (lowerFilename.startsWith('chair')) {
            expectedCategory = AssetCategory.CHAIR;
          } else if (lowerFilename.startsWith('rug')) {
            expectedCategory = AssetCategory.RUG;
          } else {
            expectedCategory = AssetCategory.DECORATION;
          }

          return hasValidCategory && asset.category === expectedCategory;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 25: Asset Search Filtering
  // **Validates: Requirements 16.1, 16.3**
  test('Property 25: Asset Search Filtering - search returns only matching assets', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (query) => {
          const results = assetManager.searchAssets(query);
          const lowerQuery = query.toLowerCase();

          // All results should contain the query string (case-insensitive)
          const allMatch = results.every((asset) =>
            asset.name.toLowerCase().includes(lowerQuery)
          );

          // All matching assets should be included
          const allAssets = assetManager.getAllAssets();
          const expectedMatches = allAssets.filter((asset) =>
            asset.name.toLowerCase().includes(lowerQuery)
          );

          const allIncluded = expectedMatches.every((expected) =>
            results.some((result) => result.id === expected.id)
          );

          return allMatch && allIncluded;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 27: Category Filter Accuracy
  // **Validates: Requirements 16.3**
  test('Property 27: Category Filter Accuracy - category filter returns only assets from that category', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          AssetCategory.BOOKSHELF,
          AssetCategory.CHAIR,
          AssetCategory.DECORATION,
          AssetCategory.RUG
        ),
        (category) => {
          const results = assetManager.getAssetsByCategory(category);

          // All results should belong to the specified category
          const allMatch = results.every((asset) => asset.category === category);

          // All assets from that category should be included
          const allAssets = assetManager.getAllAssets();
          const expectedAssets = allAssets.filter(
            (asset) => asset.category === category
          );

          const allIncluded = expectedAssets.every((expected) =>
            results.some((result) => result.id === expected.id)
          );

          return allMatch && allIncluded && results.length === expectedAssets.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 26: Asset Sorting Correctness
  // **Validates: Requirements 16.2**
  test('Property 26: Asset Sorting Correctness - assets are correctly sorted by criterion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('name' as const, 'category' as const),
        (sortBy) => {
          const allAssets = assetManager.getAllAssets();
          const sorted = assetManager.sortAssets(allAssets, sortBy);

          // Check that the array is sorted according to the criterion
          if (sortBy === 'name') {
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].name.localeCompare(sorted[i + 1].name) > 0) {
                return false;
              }
            }
          } else if (sortBy === 'category') {
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].category.localeCompare(sorted[i + 1].category) > 0) {
                return false;
              }
            }
          }

          // Verify all original assets are present
          const allIncluded = allAssets.every((asset) =>
            sorted.some((s) => s.id === asset.id)
          );

          // Verify no extra assets were added
          const noExtras = sorted.length === allAssets.length;

          return allIncluded && noExtras;
        }
      ),
      { numRuns: 100 }
    );
  });
});
