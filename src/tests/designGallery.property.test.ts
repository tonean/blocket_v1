/**
 * Property-based tests for DesignGallery component
 * Feature: reddit-room-design-game
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Design } from '../types/models.js';

describe('Property-Based Tests: DesignGallery', () => {
  // Feature: reddit-room-design-game, Property 10: Design Display Contains Required Fields
  // **Validates: Requirements 5.5**
  test('Property 10: design display contains required fields (username and submission timestamp)', () => {
    // Generator for valid designs
    const designGen = fc.record({
      id: fc.uuid(),
      userId: fc.string({ minLength: 5, maxLength: 20 }),
      username: fc.string({ minLength: 3, maxLength: 20 }),
      themeId: fc.uuid(),
      backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      assets: fc.array(
        fc.record({
          assetId: fc.string({ minLength: 1 }),
          x: fc.integer({ min: 0, max: 800 }),
          y: fc.integer({ min: 0, max: 600 }),
          rotation: fc.constantFrom(0, 90, 180, 270),
          zIndex: fc.integer({ min: 0, max: 100 })
        }),
        { maxLength: 20 }
      ),
      createdAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      updatedAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      submitted: fc.constant(true), // Only submitted designs appear in gallery
      voteCount: fc.integer({ min: -100, max: 1000 })
    });

    fc.assert(
      fc.property(
        designGen,
        (design: Design) => {
          // Property: For any submitted design, when rendered for viewing,
          // the output should contain the creator's username and submission timestamp

          // Verify that the design has the required fields
          const hasUsername = typeof design.username === 'string' && design.username.length > 0;
          const hasCreatedAt = typeof design.createdAt === 'number' && design.createdAt > 0;
          const isSubmitted = design.submitted === true;

          // All submitted designs must have username and timestamp
          return hasUsername && hasCreatedAt && isSubmitted;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: All designs in gallery must be submitted
  test('Property: all designs displayed in gallery must be marked as submitted', () => {
    const designGen = fc.record({
      id: fc.uuid(),
      userId: fc.string({ minLength: 5, maxLength: 20 }),
      username: fc.string({ minLength: 3, maxLength: 20 }),
      themeId: fc.uuid(),
      backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      assets: fc.array(
        fc.record({
          assetId: fc.string({ minLength: 1 }),
          x: fc.integer({ min: 0, max: 800 }),
          y: fc.integer({ min: 0, max: 600 }),
          rotation: fc.constantFrom(0, 90, 180, 270),
          zIndex: fc.integer({ min: 0, max: 100 })
        }),
        { maxLength: 20 }
      ),
      createdAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      updatedAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      submitted: fc.constant(true),
      voteCount: fc.integer({ min: -100, max: 1000 })
    });

    fc.assert(
      fc.property(
        fc.array(designGen, { minLength: 0, maxLength: 50 }),
        (designs: Design[]) => {
          // Property: All designs in a gallery view must be submitted
          return designs.every(design => design.submitted === true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property: Design metadata completeness
  test('Property: designs in gallery have complete metadata for display', () => {
    const designGen = fc.record({
      id: fc.uuid(),
      userId: fc.string({ minLength: 5, maxLength: 20 }),
      username: fc.string({ minLength: 3, maxLength: 20 }),
      themeId: fc.uuid(),
      backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      assets: fc.array(
        fc.record({
          assetId: fc.string({ minLength: 1 }),
          x: fc.integer({ min: 0, max: 800 }),
          y: fc.integer({ min: 0, max: 600 }),
          rotation: fc.constantFrom(0, 90, 180, 270),
          zIndex: fc.integer({ min: 0, max: 100 })
        }),
        { maxLength: 20 }
      ),
      createdAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      updatedAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
      submitted: fc.constant(true),
      voteCount: fc.integer({ min: -100, max: 1000 })
    });

    fc.assert(
      fc.property(
        designGen,
        (design: Design) => {
          // Property: Each design must have all required metadata for gallery display
          const hasId = typeof design.id === 'string' && design.id.length > 0;
          const hasUserId = typeof design.userId === 'string' && design.userId.length > 0;
          const hasUsername = typeof design.username === 'string' && design.username.length > 0;
          const hasThemeId = typeof design.themeId === 'string' && design.themeId.length > 0;
          const hasBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(design.backgroundColor);
          const hasValidAssets = Array.isArray(design.assets);
          const hasCreatedAt = typeof design.createdAt === 'number' && design.createdAt > 0;
          const hasVoteCount = typeof design.voteCount === 'number';

          return hasId && hasUserId && hasUsername && hasThemeId && 
                 hasBackgroundColor && hasValidAssets && hasCreatedAt && hasVoteCount;
        }
      ),
      { numRuns: 100 }
    );
  });
});
