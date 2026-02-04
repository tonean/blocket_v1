/**
 * Integration tests for asset manipulation controls
 * Tests complete flow: place asset → move → rotate → delete
 * Tests boundary enforcement during drag
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DesignManager } from '../managers/DesignManager.js';
import { Design, PlacedAsset } from '../types/models.js';

describe('Asset Manipulation Integration Tests', () => {
  let designManager: DesignManager;
  let testDesign: Design;

  beforeEach(() => {
    // Initialize design manager with standard canvas dimensions
    designManager = new DesignManager({
      canvasWidth: 800,
      canvasHeight: 600,
    });

    // Create a test design
    testDesign = designManager.createDesign('user_123', 'theme_school_001', 'testuser');
  });

  describe('Complete Asset Manipulation Flow', () => {
    test('should complete full flow: place → move → rotate → delete', () => {
      // Step 1: Place an asset
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      let design = designManager.getDesign(testDesign.id);
      
      expect(design).toBeDefined();
      expect(design!.assets.length).toBe(1);
      expect(design!.assets[0].assetId).toBe('desk');
      expect(design!.assets[0].x).toBe(100);
      expect(design!.assets[0].y).toBe(100);
      expect(design!.assets[0].rotation).toBe(0);

      // Step 2: Move the asset
      designManager.moveAsset(testDesign.id, 0, 200, 150);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].x).toBe(200);
      expect(design!.assets[0].y).toBe(150);
      expect(design!.assets[0].assetId).toBe('desk'); // Asset ID unchanged

      // Step 3: Rotate the asset
      designManager.rotateAsset(testDesign.id, 0);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].rotation).toBe(90);
      expect(design!.assets[0].x).toBe(200); // Position unchanged
      expect(design!.assets[0].y).toBe(150);

      // Step 4: Rotate again
      designManager.rotateAsset(testDesign.id, 0);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].rotation).toBe(180);

      // Step 5: Delete the asset
      designManager.removeAsset(testDesign.id, 0);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(0);
    });

    test('should handle multiple assets in manipulation flow', () => {
      // Place multiple assets
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      designManager.placeAsset(testDesign.id, 'chair_1', 200, 200);
      designManager.placeAsset(testDesign.id, 'lamp', 300, 300);
      
      let design = designManager.getDesign(testDesign.id);
      expect(design!.assets.length).toBe(3);

      // Move second asset
      designManager.moveAsset(testDesign.id, 1, 250, 250);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[1].x).toBe(250);
      expect(design!.assets[1].y).toBe(250);
      expect(design!.assets[1].assetId).toBe('chair_1');

      // Rotate third asset
      designManager.rotateAsset(testDesign.id, 2);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[2].rotation).toBe(90);
      expect(design!.assets[2].assetId).toBe('lamp');

      // Delete first asset
      designManager.removeAsset(testDesign.id, 0);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(2);
      // After deletion, indices shift
      expect(design!.assets[0].assetId).toBe('chair_1');
      expect(design!.assets[1].assetId).toBe('lamp');
    });

    test('should maintain z-index during manipulation', () => {
      // Place assets with specific z-indices
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      designManager.placeAsset(testDesign.id, 'chair_1', 200, 200);
      
      let design = designManager.getDesign(testDesign.id);
      const initialZIndex1 = design!.assets[0].zIndex;
      const initialZIndex2 = design!.assets[1].zIndex;

      // Move asset - z-index should remain unchanged
      designManager.moveAsset(testDesign.id, 0, 150, 150);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].zIndex).toBe(initialZIndex1);

      // Rotate asset - z-index should remain unchanged
      designManager.rotateAsset(testDesign.id, 1);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[1].zIndex).toBe(initialZIndex2);
    });

    test('should handle rapid successive operations', () => {
      // Place asset
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      // Perform rapid operations
      designManager.moveAsset(testDesign.id, 0, 150, 150);
      designManager.rotateAsset(testDesign.id, 0);
      designManager.moveAsset(testDesign.id, 0, 200, 200);
      designManager.rotateAsset(testDesign.id, 0);
      designManager.rotateAsset(testDesign.id, 0);
      
      const design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(1);
      expect(design!.assets[0].x).toBe(200);
      expect(design!.assets[0].y).toBe(200);
      expect(design!.assets[0].rotation).toBe(270); // 0 + 90 + 90 + 90
    });
  });

  describe('Boundary Enforcement During Drag', () => {
    test('should clamp asset position to canvas boundaries when placing', () => {
      // Try to place asset outside right boundary
      designManager.placeAsset(testDesign.id, 'desk', 900, 300);
      let design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].x).toBe(800); // Clamped to canvas width
      expect(design!.assets[0].y).toBe(300);

      // Try to place asset outside bottom boundary
      designManager.placeAsset(testDesign.id, 'chair_1', 400, 700);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[1].x).toBe(400);
      expect(design!.assets[1].y).toBe(600); // Clamped to canvas height
    });

    test('should clamp asset position to canvas boundaries when moving', () => {
      // Place asset within bounds
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      // Try to move outside left boundary
      designManager.moveAsset(testDesign.id, 0, -50, 100);
      let design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].x).toBe(0); // Clamped to 0
      expect(design!.assets[0].y).toBe(100);

      // Try to move outside top boundary
      designManager.moveAsset(testDesign.id, 0, 100, -50);
      design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets[0].x).toBe(100);
      expect(design!.assets[0].y).toBe(0); // Clamped to 0
    });

    test('should handle boundary clamping at all edges', () => {
      designManager.placeAsset(testDesign.id, 'desk', 400, 300);
      
      // Test all four boundaries
      const testCases = [
        { x: -100, y: 300, expectedX: 0, expectedY: 300, edge: 'left' },
        { x: 1000, y: 300, expectedX: 800, expectedY: 300, edge: 'right' },
        { x: 400, y: -100, expectedX: 400, expectedY: 0, edge: 'top' },
        { x: 400, y: 1000, expectedX: 400, expectedY: 600, edge: 'bottom' },
      ];

      testCases.forEach(({ x, y, expectedX, expectedY, edge }) => {
        designManager.moveAsset(testDesign.id, 0, x, y);
        const design = designManager.getDesign(testDesign.id);
        
        expect(design!.assets[0].x).toBe(expectedX);
        expect(design!.assets[0].y).toBe(expectedY);
      });
    });

    test('should handle corner positions correctly', () => {
      designManager.placeAsset(testDesign.id, 'desk', 400, 300);
      
      // Test corners
      const corners = [
        { x: -50, y: -50, expectedX: 0, expectedY: 0, corner: 'top-left' },
        { x: 900, y: -50, expectedX: 800, expectedY: 0, corner: 'top-right' },
        { x: -50, y: 700, expectedX: 0, expectedY: 600, corner: 'bottom-left' },
        { x: 900, y: 700, expectedX: 800, expectedY: 600, corner: 'bottom-right' },
      ];

      corners.forEach(({ x, y, expectedX, expectedY, corner }) => {
        designManager.moveAsset(testDesign.id, 0, x, y);
        const design = designManager.getDesign(testDesign.id);
        
        expect(design!.assets[0].x).toBe(expectedX);
        expect(design!.assets[0].y).toBe(expectedY);
      });
    });

    test('should allow movement within valid boundaries', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      // Move to various valid positions
      const validPositions = [
        { x: 0, y: 0 },
        { x: 400, y: 300 },
        { x: 800, y: 600 },
        { x: 200, y: 500 },
        { x: 700, y: 100 },
      ];

      validPositions.forEach(({ x, y }) => {
        designManager.moveAsset(testDesign.id, 0, x, y);
        const design = designManager.getDesign(testDesign.id);
        
        expect(design!.assets[0].x).toBe(x);
        expect(design!.assets[0].y).toBe(y);
      });
    });
  });

  describe('Rotation Behavior', () => {
    test('should rotate through all four orientations', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      const rotations = [0, 90, 180, 270, 0]; // Full cycle
      
      rotations.forEach((expectedRotation, index) => {
        if (index > 0) {
          designManager.rotateAsset(testDesign.id, 0);
        }
        
        const design = designManager.getDesign(testDesign.id);
        expect(design!.assets[0].rotation).toBe(expectedRotation);
      });
    });

    test('should maintain position during rotation', () => {
      designManager.placeAsset(testDesign.id, 'desk', 250, 350);
      
      const initialX = 250;
      const initialY = 350;
      
      // Rotate multiple times
      for (let i = 0; i < 4; i++) {
        designManager.rotateAsset(testDesign.id, 0);
        const design = designManager.getDesign(testDesign.id);
        
        expect(design!.assets[0].x).toBe(initialX);
        expect(design!.assets[0].y).toBe(initialY);
      }
    });
  });

  describe('Deletion Behavior', () => {
    test('should remove correct asset when multiple assets exist', () => {
      // Place three assets
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      designManager.placeAsset(testDesign.id, 'chair_1', 200, 200);
      designManager.placeAsset(testDesign.id, 'lamp', 300, 300);
      
      // Delete middle asset
      designManager.removeAsset(testDesign.id, 1);
      const design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(2);
      expect(design!.assets[0].assetId).toBe('desk');
      expect(design!.assets[1].assetId).toBe('lamp');
    });

    test('should handle deletion of last remaining asset', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      designManager.removeAsset(testDesign.id, 0);
      const design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(0);
    });

    test('should allow placing new asset after deletion', () => {
      // Place and delete
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      designManager.removeAsset(testDesign.id, 0);
      
      // Place new asset
      designManager.placeAsset(testDesign.id, 'chair_1', 200, 200);
      const design = designManager.getDesign(testDesign.id);
      
      expect(design!.assets.length).toBe(1);
      expect(design!.assets[0].assetId).toBe('chair_1');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when moving non-existent asset', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      expect(() => {
        designManager.moveAsset(testDesign.id, 5, 200, 200);
      }).toThrow('Invalid asset index');
    });

    test('should throw error when rotating non-existent asset', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      expect(() => {
        designManager.rotateAsset(testDesign.id, 10);
      }).toThrow('Invalid asset index');
    });

    test('should throw error when deleting non-existent asset', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      
      expect(() => {
        designManager.removeAsset(testDesign.id, -1);
      }).toThrow('Invalid asset index');
    });

    test('should throw error when operating on non-existent design', () => {
      expect(() => {
        designManager.placeAsset('non_existent_design', 'desk', 100, 100);
      }).toThrow('Design not found');
    });
  });

  describe('State Consistency', () => {
    test('should maintain consistent state after complex operations', () => {
      // Perform complex sequence of operations
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      designManager.placeAsset(testDesign.id, 'chair_1', 200, 200);
      designManager.placeAsset(testDesign.id, 'lamp', 300, 300);
      
      designManager.moveAsset(testDesign.id, 1, 250, 250);
      designManager.rotateAsset(testDesign.id, 0);
      designManager.removeAsset(testDesign.id, 2);
      designManager.rotateAsset(testDesign.id, 1);
      
      const design = designManager.getDesign(testDesign.id);
      
      // Verify final state
      expect(design!.assets.length).toBe(2);
      expect(design!.assets[0].assetId).toBe('desk');
      expect(design!.assets[0].rotation).toBe(90);
      expect(design!.assets[1].assetId).toBe('chair_1');
      expect(design!.assets[1].x).toBe(250);
      expect(design!.assets[1].y).toBe(250);
      expect(design!.assets[1].rotation).toBe(90);
    });

    test('should update timestamp on each operation', () => {
      designManager.placeAsset(testDesign.id, 'desk', 100, 100);
      const design1 = designManager.getDesign(testDesign.id);
      const timestamp1 = design1!.updatedAt;
      
      // Small delay to ensure timestamp difference
      const delay = () => new Promise(resolve => setTimeout(resolve, 10));
      
      return delay().then(() => {
        designManager.moveAsset(testDesign.id, 0, 200, 200);
        const design2 = designManager.getDesign(testDesign.id);
        const timestamp2 = design2!.updatedAt;
        
        expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
      });
    });
  });
});
