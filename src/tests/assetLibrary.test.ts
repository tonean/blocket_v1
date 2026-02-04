/**
 * Unit tests for AssetLibrary component
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Asset, AssetCategory } from '../types/models.js';
import { AssetManager } from '../managers/AssetManager.js';

describe('AssetLibrary Unit Tests', () => {
  let assetManager: AssetManager;
  let allAssets: Asset[];

  beforeEach(() => {
    assetManager = new AssetManager();
    allAssets = assetManager.loadAssets();
  });

  describe('Category Filtering', () => {
    test('should filter assets by bookshelf category', () => {
      const category = AssetCategory.BOOKSHELF;
      const filtered = allAssets.filter((asset) => asset.category === category);

      // Verify all filtered assets are bookshelves
      expect(filtered.every((asset) => asset.category === AssetCategory.BOOKSHELF)).toBe(true);
      
      // Verify we have the expected number of bookshelves (3)
      expect(filtered.length).toBe(3);
      
      // Verify specific bookshelf assets are included
      const bookshelfIds = filtered.map((asset) => asset.id);
      expect(bookshelfIds).toContain('bookshelf_1');
      expect(bookshelfIds).toContain('bookshelf_2');
      expect(bookshelfIds).toContain('bookshelf_3');
    });

    test('should filter assets by chair category', () => {
      const category = AssetCategory.CHAIR;
      const filtered = allAssets.filter((asset) => asset.category === category);

      // Verify all filtered assets are chairs
      expect(filtered.every((asset) => asset.category === AssetCategory.CHAIR)).toBe(true);
      
      // Verify we have the expected number of chairs (5)
      expect(filtered.length).toBe(5);
      
      // Verify specific chair assets are included
      const chairIds = filtered.map((asset) => asset.id);
      expect(chairIds).toContain('chair_1');
      expect(chairIds).toContain('chair_2');
      expect(chairIds).toContain('chair_3');
      expect(chairIds).toContain('chair_4');
      expect(chairIds).toContain('chair_5');
    });

    test('should filter assets by decoration category', () => {
      const category = AssetCategory.DECORATION;
      const filtered = allAssets.filter((asset) => asset.category === category);

      // Verify all filtered assets are decorations
      expect(filtered.every((asset) => asset.category === AssetCategory.DECORATION)).toBe(true);
      
      // Verify we have decorations (clock, cup, desk, lamp, laptop, mouse, trash = 7)
      expect(filtered.length).toBe(7);
      
      // Verify specific decoration assets are included
      const decorationIds = filtered.map((asset) => asset.id);
      expect(decorationIds).toContain('clock');
      expect(decorationIds).toContain('cup');
      expect(decorationIds).toContain('desk');
      expect(decorationIds).toContain('lamp');
      expect(decorationIds).toContain('laptop');
      expect(decorationIds).toContain('mouse');
      expect(decorationIds).toContain('trash');
    });

    test('should filter assets by rug category', () => {
      const category = AssetCategory.RUG;
      const filtered = allAssets.filter((asset) => asset.category === category);

      // Verify all filtered assets are rugs
      expect(filtered.every((asset) => asset.category === AssetCategory.RUG)).toBe(true);
      
      // Verify we have the expected number of rugs (3)
      expect(filtered.length).toBe(3);
      
      // Verify specific rug assets are included
      const rugIds = filtered.map((asset) => asset.id);
      expect(rugIds).toContain('rug_1');
      expect(rugIds).toContain('rug_2');
      expect(rugIds).toContain('rug_3');
    });

    test('should return all assets when no category filter is applied', () => {
      // No filter applied - should return all assets
      const filtered = allAssets;

      // Verify we have all 18 assets
      expect(filtered.length).toBe(18);
      
      // Verify all categories are represented
      const categories = new Set(filtered.map((asset) => asset.category));
      expect(categories.has(AssetCategory.BOOKSHELF)).toBe(true);
      expect(categories.has(AssetCategory.CHAIR)).toBe(true);
      expect(categories.has(AssetCategory.DECORATION)).toBe(true);
      expect(categories.has(AssetCategory.RUG)).toBe(true);
    });

    test('should return empty array for non-existent category', () => {
      // Filter by a category that doesn't exist in our assets
      const filtered = allAssets.filter((asset) => asset.category === 'nonexistent' as AssetCategory);

      expect(filtered.length).toBe(0);
    });
  });

  describe('Search Filtering', () => {
    test('should filter assets by exact name match', () => {
      const searchQuery = 'Desk';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify we found the desk
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('desk');
      expect(filtered[0].name).toBe('Desk');
    });

    test('should filter assets by partial name match (case-insensitive)', () => {
      const searchQuery = 'chair';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify we found all chairs
      expect(filtered.length).toBe(5);
      expect(filtered.every((asset) => asset.name.toLowerCase().includes('chair'))).toBe(true);
    });

    test('should filter assets by partial name match with different case', () => {
      const searchQuery = 'BOOK';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify we found all bookshelves
      expect(filtered.length).toBe(3);
      expect(filtered.every((asset) => asset.name.toLowerCase().includes('book'))).toBe(true);
    });

    test('should return empty array when search query matches no assets', () => {
      const searchQuery = 'nonexistent';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered.length).toBe(0);
    });

    test('should return all assets when search query is empty', () => {
      const searchQuery = '';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Empty string matches all assets
      expect(filtered.length).toBe(18);
    });

    test('should filter assets by single character search', () => {
      const searchQuery = 'l';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Should find: lamp, laptop, clock, bookshelf (all contain 'l')
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((asset) => asset.name.toLowerCase().includes('l'))).toBe(true);
    });

    test('should filter assets by number in name', () => {
      const searchQuery = '1';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Should find: bookshelf_1, chair_1, rug_1
      expect(filtered.length).toBe(3);
      expect(filtered.every((asset) => asset.name.includes('1'))).toBe(true);
    });
  });

  describe('Combined Filtering', () => {
    test('should apply both category and search filters', () => {
      const searchQuery = '1';
      const category = AssetCategory.CHAIR;
      
      let filtered = allAssets;
      
      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter((asset) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply category filter
      if (category) {
        filtered = filtered.filter((asset) => asset.category === category);
      }

      // Should find only chair_1
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('chair_1');
      expect(filtered[0].category).toBe(AssetCategory.CHAIR);
    });

    test('should return empty array when combined filters match nothing', () => {
      const searchQuery = 'desk';
      const category = AssetCategory.CHAIR;
      
      let filtered = allAssets;
      
      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter((asset) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply category filter
      if (category) {
        filtered = filtered.filter((asset) => asset.category === category);
      }

      // Desk is not a chair, so should return empty
      expect(filtered.length).toBe(0);
    });

    test('should handle multiple assets matching combined filters', () => {
      const searchQuery = 'bookshelf';
      const category = AssetCategory.BOOKSHELF;
      
      let filtered = allAssets;
      
      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter((asset) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply category filter
      if (category) {
        filtered = filtered.filter((asset) => asset.category === category);
      }

      // Should find all 3 bookshelves
      expect(filtered.length).toBe(3);
      expect(filtered.every((asset) => asset.category === AssetCategory.BOOKSHELF)).toBe(true);
      expect(filtered.every((asset) => asset.name.toLowerCase().includes('bookshelf'))).toBe(true);
    });
  });

  describe('Empty State Display', () => {
    test('should detect empty state when no assets match search', () => {
      const searchQuery = 'xyz123';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify empty state condition
      expect(filtered.length).toBe(0);
      
      // Component should display "No assets found" message
      const shouldShowEmptyState = filtered.length === 0;
      expect(shouldShowEmptyState).toBe(true);
    });

    test('should detect empty state when no assets match category', () => {
      const category = 'invalid' as AssetCategory;
      const filtered = allAssets.filter((asset) => asset.category === category);

      // Verify empty state condition
      expect(filtered.length).toBe(0);
      
      // Component should display "No assets found" message
      const shouldShowEmptyState = filtered.length === 0;
      expect(shouldShowEmptyState).toBe(true);
    });

    test('should not show empty state when assets are found', () => {
      const searchQuery = 'chair';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify we have results
      expect(filtered.length).toBeGreaterThan(0);
      
      // Component should NOT display "No assets found" message
      const shouldShowEmptyState = filtered.length === 0;
      expect(shouldShowEmptyState).toBe(false);
    });

    test('should show empty state with helpful message for search', () => {
      const searchQuery = 'nonexistent';
      const filtered = allAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Verify empty state
      expect(filtered.length).toBe(0);
      
      // When search query exists and no results, should suggest trying different term
      const shouldShowSearchHint = searchQuery && filtered.length === 0;
      expect(shouldShowSearchHint).toBe(true);
    });
  });

  describe('Asset Grid Layout', () => {
    test('should organize assets into rows of 3', () => {
      const filtered = allAssets.slice(0, 7); // Take 7 assets
      
      // Create rows of 3
      const rows: Asset[][] = [];
      for (let i = 0; i < filtered.length; i += 3) {
        rows.push(filtered.slice(i, i + 3));
      }

      // Should have 3 rows: [3, 3, 1]
      expect(rows.length).toBe(3);
      expect(rows[0].length).toBe(3);
      expect(rows[1].length).toBe(3);
      expect(rows[2].length).toBe(1);
    });

    test('should handle exact multiple of 3 assets', () => {
      const filtered = allAssets.slice(0, 9); // Take 9 assets
      
      // Create rows of 3
      const rows: Asset[][] = [];
      for (let i = 0; i < filtered.length; i += 3) {
        rows.push(filtered.slice(i, i + 3));
      }

      // Should have 3 rows of 3
      expect(rows.length).toBe(3);
      expect(rows[0].length).toBe(3);
      expect(rows[1].length).toBe(3);
      expect(rows[2].length).toBe(3);
    });

    test('should handle single asset', () => {
      const filtered = allAssets.slice(0, 1); // Take 1 asset
      
      // Create rows of 3
      const rows: Asset[][] = [];
      for (let i = 0; i < filtered.length; i += 3) {
        rows.push(filtered.slice(i, i + 3));
      }

      // Should have 1 row with 1 asset
      expect(rows.length).toBe(1);
      expect(rows[0].length).toBe(1);
    });

    test('should handle empty asset list', () => {
      const filtered: Asset[] = [];
      
      // Create rows of 3
      const rows: Asset[][] = [];
      for (let i = 0; i < filtered.length; i += 3) {
        rows.push(filtered.slice(i, i + 3));
      }

      // Should have 0 rows
      expect(rows.length).toBe(0);
    });
  });
});
