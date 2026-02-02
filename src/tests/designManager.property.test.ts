/**
 * Property-based tests for DesignManager
 * Feature: reddit-room-design-game
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { DesignManager } from '../managers/DesignManager.js';

// Generators
const hexColorGen = fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`);

describe('DesignManager Property Tests', () => {
  // Feature: reddit-room-design-game, Property 1: Background Color Application
  test('Property 1: Background Color Application - selecting a color updates backgroundColor', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        hexColorGen,
        (userId, themeId, username, color) => {
          const manager = new DesignManager();
          const design = manager.createDesign(userId, themeId, username);
          
          manager.updateBackgroundColor(design.id, color);
          
          const updatedDesign = manager.getDesign(design.id);
          expect(updatedDesign?.backgroundColor).toBe(color);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 3: Asset List Modification Invariant
  test('Property 3: Asset List Modification Invariant - placing asset increases count by 1, removing decreases by 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        (userId, themeId, username, assetId, x, y) => {
          const manager = new DesignManager();
          const design = manager.createDesign(userId, themeId, username);
          
          const initialCount = design.assets.length;
          
          // Place an asset
          manager.placeAsset(design.id, assetId, x, y);
          const afterPlaceDesign = manager.getDesign(design.id);
          expect(afterPlaceDesign?.assets.length).toBe(initialCount + 1);
          
          // Remove the asset
          manager.removeAsset(design.id, 0);
          const afterRemoveDesign = manager.getDesign(design.id);
          expect(afterRemoveDesign?.assets.length).toBe(initialCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 4: Asset Position Updates
  test('Property 4: Asset Position Updates - moving asset updates coordinates to exact position', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        (userId, themeId, username, assetId, initialX, initialY, newX, newY) => {
          const manager = new DesignManager();
          const design = manager.createDesign(userId, themeId, username);
          
          // Place an asset
          manager.placeAsset(design.id, assetId, initialX, initialY);
          
          // Move the asset
          manager.moveAsset(design.id, 0, newX, newY);
          
          const updatedDesign = manager.getDesign(design.id);
          expect(updatedDesign?.assets[0].x).toBe(newX);
          expect(updatedDesign?.assets[0].y).toBe(newY);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 18: Canvas Boundary Enforcement
  test('Property 18: Canvas Boundary Enforcement - positions outside boundaries are clamped', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        fc.integer({ min: -1000, max: 2000 }),
        fc.integer({ min: -1000, max: 2000 }),
        (userId, themeId, username, assetId, x, y) => {
          const manager = new DesignManager({ canvasWidth: 800, canvasHeight: 600 });
          const design = manager.createDesign(userId, themeId, username);
          
          // Place an asset with potentially out-of-bounds coordinates
          manager.placeAsset(design.id, assetId, x, y);
          
          const updatedDesign = manager.getDesign(design.id);
          const asset = updatedDesign?.assets[0];
          
          // Verify coordinates are within bounds
          expect(asset?.x).toBeGreaterThanOrEqual(0);
          expect(asset?.x).toBeLessThanOrEqual(800);
          expect(asset?.y).toBeGreaterThanOrEqual(0);
          expect(asset?.y).toBeLessThanOrEqual(600);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 19: Z-Index Layering
  test('Property 19: Z-Index Layering - higher z-index means rendered on top', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        (userId, themeId, username, assetId1, assetId2) => {
          const manager = new DesignManager();
          const design = manager.createDesign(userId, themeId, username);
          
          // Place two assets
          manager.placeAsset(design.id, assetId1, 100, 100);
          manager.placeAsset(design.id, assetId2, 150, 150);
          
          const updatedDesign = manager.getDesign(design.id);
          const asset1 = updatedDesign?.assets[0];
          const asset2 = updatedDesign?.assets[1];
          
          // Second asset should have higher z-index (placed later)
          expect(asset2?.zIndex).toBeGreaterThan(asset1?.zIndex || 0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 20: Z-Index Adjustment
  test('Property 20: Z-Index Adjustment - adjusting up increases, down decreases z-index', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 5 }),
        fc.string({ minLength: 3 }),
        fc.string({ minLength: 3 }),
        (userId, themeId, username, assetId) => {
          const manager = new DesignManager();
          const design = manager.createDesign(userId, themeId, username);
          
          // Place an asset
          manager.placeAsset(design.id, assetId, 100, 100);
          
          const initialDesign = manager.getDesign(design.id);
          const initialZIndex = initialDesign?.assets[0].zIndex || 0;
          
          // Adjust z-index up
          manager.adjustZIndex(design.id, 0, 'up');
          const afterUpDesign = manager.getDesign(design.id);
          expect(afterUpDesign?.assets[0].zIndex).toBe(initialZIndex + 1);
          
          // Adjust z-index down
          manager.adjustZIndex(design.id, 0, 'down');
          const afterDownDesign = manager.getDesign(design.id);
          expect(afterDownDesign?.assets[0].zIndex).toBe(initialZIndex);
        }
      ),
      { numRuns: 100 }
    );
  });
});
