/**
 * Property-based tests for core data models
 * Feature: reddit-room-design-game
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { rotateAsset, PlacedAsset } from '../types/models';

describe('Property-Based Tests: Core Data Models', () => {
  // Feature: reddit-room-design-game, Property 5: Asset Rotation Cycles
  test('Property 5: rotating asset 4 times returns to original rotation', () => {
    fc.assert(
      fc.property(
        fc.record({
          assetId: fc.string({ minLength: 1 }),
          x: fc.integer({ min: 0, max: 800 }),
          y: fc.integer({ min: 0, max: 600 }),
          rotation: fc.constantFrom(0, 90, 180, 270),
          zIndex: fc.integer({ min: 0, max: 100 })
        }),
        (asset: PlacedAsset) => {
          let currentRotation = asset.rotation;
          for (let i = 0; i < 4; i++) {
            currentRotation = rotateAsset(currentRotation);
          }
          return currentRotation === asset.rotation;
        }
      ),
      { numRuns: 100 }
    );
  });
});
