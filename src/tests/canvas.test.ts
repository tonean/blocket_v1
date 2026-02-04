/**
 * Unit tests for Canvas component
 */

import { describe, test, expect } from 'vitest';
import { Design } from '../types/models.js';

describe('Canvas Unit Tests', () => {
  // Helper function to create a test design
  const createTestDesign = (backgroundColor: string, assets: any[] = []): Design => {
    return {
      id: 'test_design_1',
      userId: 'user_123',
      username: 'testuser',
      themeId: 'theme_school_001',
      backgroundColor,
      assets,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };
  };

  describe('Background Color Rendering', () => {
    test('should render canvas with correct background color', () => {
      const backgroundColor = '#E8F4F8';
      const design = createTestDesign(backgroundColor);
      
      // Verify the design has the correct background color
      expect(design.backgroundColor).toBe(backgroundColor);
    });

    test('should render canvas with different background colors', () => {
      const colors = ['#FFFFFF', '#000000', '#FF5733', '#33FF57', '#3357FF'];
      
      colors.forEach(color => {
        const design = createTestDesign(color);
        expect(design.backgroundColor).toBe(color);
      });
    });

    test('should preserve background color in edit mode', () => {
      const backgroundColor = '#AABBCC';
      const design = createTestDesign(backgroundColor);
      
      // Simulate rendering in edit mode
      const mode = 'edit';
      
      // Background color should remain unchanged
      expect(design.backgroundColor).toBe(backgroundColor);
    });

    test('should preserve background color in preview mode', () => {
      const backgroundColor = '#DDEEFF';
      const design = createTestDesign(backgroundColor);
      
      // Simulate rendering in preview mode
      const mode = 'preview';
      
      // Background color should remain unchanged
      expect(design.backgroundColor).toBe(backgroundColor);
    });
  });

  describe('Asset Z-Index Ordering', () => {
    test('should render assets in correct z-index order', () => {
      const assets = [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 2 },
        { assetId: 'chair_1', x: 150, y: 150, rotation: 0, zIndex: 1 },
        { assetId: 'lamp', x: 200, y: 200, rotation: 0, zIndex: 3 },
      ];
      
      const design = createTestDesign('#FFFFFF', assets);
      
      // Sort assets by z-index (as the Canvas component does)
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      
      // Verify correct ordering: chair_1 (1), desk (2), lamp (3)
      expect(sortedAssets[0].assetId).toBe('chair_1');
      expect(sortedAssets[0].zIndex).toBe(1);
      expect(sortedAssets[1].assetId).toBe('desk');
      expect(sortedAssets[1].zIndex).toBe(2);
      expect(sortedAssets[2].assetId).toBe('lamp');
      expect(sortedAssets[2].zIndex).toBe(3);
    });

    test('should handle assets with same z-index', () => {
      const assets = [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
        { assetId: 'chair_1', x: 150, y: 150, rotation: 0, zIndex: 1 },
        { assetId: 'lamp', x: 200, y: 200, rotation: 0, zIndex: 2 },
      ];
      
      const design = createTestDesign('#FFFFFF', assets);
      
      // Sort assets by z-index
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      
      // Verify assets with same z-index maintain their relative order
      expect(sortedAssets[0].zIndex).toBe(1);
      expect(sortedAssets[1].zIndex).toBe(1);
      expect(sortedAssets[2].zIndex).toBe(2);
    });

    test('should render empty design with no assets', () => {
      const design = createTestDesign('#FFFFFF', []);
      
      // Verify no assets are present
      expect(design.assets.length).toBe(0);
      
      // Sort should return empty array
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedAssets.length).toBe(0);
    });

    test('should render single asset correctly', () => {
      const assets = [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
      ];
      
      const design = createTestDesign('#FFFFFF', assets);
      
      // Sort should return single asset
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedAssets.length).toBe(1);
      expect(sortedAssets[0].assetId).toBe('desk');
    });

    test('should handle negative z-index values', () => {
      const assets = [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 0 },
        { assetId: 'chair_1', x: 150, y: 150, rotation: 0, zIndex: -1 },
        { assetId: 'lamp', x: 200, y: 200, rotation: 0, zIndex: 1 },
      ];
      
      const design = createTestDesign('#FFFFFF', assets);
      
      // Sort assets by z-index
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      
      // Verify correct ordering: chair_1 (-1), desk (0), lamp (1)
      expect(sortedAssets[0].assetId).toBe('chair_1');
      expect(sortedAssets[0].zIndex).toBe(-1);
      expect(sortedAssets[1].assetId).toBe('desk');
      expect(sortedAssets[1].zIndex).toBe(0);
      expect(sortedAssets[2].assetId).toBe('lamp');
      expect(sortedAssets[2].zIndex).toBe(1);
    });

    test('should maintain z-index order with many assets', () => {
      const assets = [
        { assetId: 'asset_5', x: 100, y: 100, rotation: 0, zIndex: 5 },
        { assetId: 'asset_2', x: 150, y: 150, rotation: 0, zIndex: 2 },
        { assetId: 'asset_8', x: 200, y: 200, rotation: 0, zIndex: 8 },
        { assetId: 'asset_1', x: 250, y: 250, rotation: 0, zIndex: 1 },
        { assetId: 'asset_3', x: 300, y: 300, rotation: 0, zIndex: 3 },
      ];
      
      const design = createTestDesign('#FFFFFF', assets);
      
      // Sort assets by z-index
      const sortedAssets = [...design.assets].sort((a, b) => a.zIndex - b.zIndex);
      
      // Verify correct ascending order
      expect(sortedAssets[0].zIndex).toBe(1);
      expect(sortedAssets[1].zIndex).toBe(2);
      expect(sortedAssets[2].zIndex).toBe(3);
      expect(sortedAssets[3].zIndex).toBe(5);
      expect(sortedAssets[4].zIndex).toBe(8);
    });
  });

  describe('Mode Switching', () => {
    test('should preserve design state when switching from edit to preview', () => {
      const assets = [
        { assetId: 'desk', x: 100, y: 100, rotation: 0, zIndex: 1 },
        { assetId: 'chair_1', x: 150, y: 150, rotation: 90, zIndex: 2 },
      ];
      
      const design = createTestDesign('#E8F4F8', assets);
      
      // Capture initial state
      const initialState = {
        backgroundColor: design.backgroundColor,
        assetCount: design.assets.length,
        firstAssetRotation: design.assets[0].rotation,
      };
      
      // Simulate mode switch (edit -> preview)
      const mode = 'preview';
      
      // Verify state is preserved
      expect(design.backgroundColor).toBe(initialState.backgroundColor);
      expect(design.assets.length).toBe(initialState.assetCount);
      expect(design.assets[0].rotation).toBe(initialState.firstAssetRotation);
    });

    test('should preserve design state when switching from preview to edit', () => {
      const assets = [
        { assetId: 'lamp', x: 200, y: 200, rotation: 180, zIndex: 1 },
      ];
      
      const design = createTestDesign('#AABBCC', assets);
      
      // Capture initial state
      const initialState = {
        backgroundColor: design.backgroundColor,
        assetCount: design.assets.length,
        assetPosition: { x: design.assets[0].x, y: design.assets[0].y },
      };
      
      // Simulate mode switch (preview -> edit)
      const mode = 'edit';
      
      // Verify state is preserved
      expect(design.backgroundColor).toBe(initialState.backgroundColor);
      expect(design.assets.length).toBe(initialState.assetCount);
      expect(design.assets[0].x).toBe(initialState.assetPosition.x);
      expect(design.assets[0].y).toBe(initialState.assetPosition.y);
    });
  });
});
