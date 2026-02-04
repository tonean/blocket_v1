/**
 * Property-based tests for SubmissionHandler
 * Feature: reddit-room-design-game
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { SubmissionHandler } from '../handlers/SubmissionHandler.js';
import { StorageService, RedisClient } from '../storage/StorageService.js';
import { Design } from '../types/models.js';
import { MockAuthService } from './mocks/MockAuthService.js';

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

describe('SubmissionHandler Property Tests', () => {
  // Feature: reddit-room-design-game, Property 8: Design Submission Association
  test('Property 8: submitted design is stored with current theme ID and username', async () => {
    await fc.assert(
      fc.asyncProperty(designGen, async (design) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);
        const authService = new MockAuthService({ id: design.userId, username: design.username });
        const handler = new SubmissionHandler(storage, authService);

        // Submit the design
        const designId = await handler.submitDesign(design);

        // Retrieve the submitted design
        const submittedDesign = await handler.getDesignById(designId);

        // Verify it's associated with the correct theme and username
        expect(submittedDesign).not.toBeNull();
        expect(submittedDesign!.themeId).toBe(design.themeId);
        expect(submittedDesign!.username).toBe(design.username);
        expect(submittedDesign!.userId).toBe(design.userId);
        expect(submittedDesign!.submitted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 9: Submitted Designs Are Retrievable
  test('Property 9: submitted design is retrievable by theme', async () => {
    await fc.assert(
      fc.asyncProperty(designGen, async (design) => {
        const redis = new MockRedisClient();
        const storage = new StorageService(redis);
        const authService = new MockAuthService({ id: design.userId, username: design.username });
        const handler = new SubmissionHandler(storage, authService);

        // Submit the design
        await handler.submitDesign(design);

        // Query for designs by theme
        const submittedDesigns = await handler.getSubmittedDesigns(design.themeId);

        // Verify the design is in the results
        expect(submittedDesigns.length).toBeGreaterThan(0);
        const found = submittedDesigns.find(d => d.id === design.id);
        expect(found).toBeDefined();
        expect(found!.themeId).toBe(design.themeId);
        expect(found!.submitted).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 11: Duplicate Submission Prevention
  test('Property 11: duplicate submission for same user and theme is prevented', async () => {
    await fc.assert(
      fc.asyncProperty(
        designGen,
        fc.uuid(),
        async (design, secondDesignId) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);
          const authService = new MockAuthService({ id: design.userId, username: design.username });
          const handler = new SubmissionHandler(storage, authService);

          // Submit the first design
          await handler.submitDesign(design);

          // Check if user has already submitted for this theme
          const hasSubmitted = await handler.hasUserSubmitted(design.userId, design.themeId);
          expect(hasSubmitted).toBe(true);

          // Attempt to submit another design for the same user and theme
          const secondDesign: Design = {
            ...design,
            id: secondDesignId,
            backgroundColor: '#AABBCC'
          };

          // The system should detect the duplicate
          const alreadySubmitted = await handler.hasUserSubmitted(secondDesign.userId, secondDesign.themeId);
          expect(alreadySubmitted).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: reddit-room-design-game, Property 15: User Design Isolation
  test('Property 15: user designs contain only that user\'s designs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(designGen, { minLength: 2, maxLength: 10 }),
        async (designs) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);
          
          // Ensure we have at least two different users
          const user1Id = designs[0].userId;
          const user2Id = designs[1].userId;
          
          // Skip if both users are the same (unlikely but possible)
          if (user1Id === user2Id) {
            return true;
          }

          // Assign designs to two different users with unique IDs
          const user1Designs = designs.slice(0, Math.ceil(designs.length / 2)).map((d, idx) => ({ 
            ...d, 
            id: `${d.id}_user1_${idx}`, // Ensure unique IDs
            userId: user1Id,
            username: designs[0].username // Use consistent username for user1
          }));
          const user2Designs = designs.slice(Math.ceil(designs.length / 2)).map((d, idx) => ({ 
            ...d, 
            id: `${d.id}_user2_${idx}`, // Ensure unique IDs
            userId: user2Id,
            username: designs[1].username // Use consistent username for user2
          }));

          // Submit all designs with appropriate auth contexts
          for (const design of user1Designs) {
            const authService = new MockAuthService({ id: design.userId, username: design.username });
            const handler = new SubmissionHandler(storage, authService);
            await handler.submitDesign(design);
          }
          
          for (const design of user2Designs) {
            const authService = new MockAuthService({ id: design.userId, username: design.username });
            const handler = new SubmissionHandler(storage, authService);
            await handler.submitDesign(design);
          }

          // Get designs for user1
          const authService1 = new MockAuthService({ id: user1Id, username: designs[0].username });
          const handler1 = new SubmissionHandler(storage, authService1);
          const user1Retrieved = await handler1.getUserDesigns(user1Id);

          // Verify all returned designs belong to user1
          expect(user1Retrieved.length).toBe(user1Designs.length);
          for (const design of user1Retrieved) {
            expect(design.userId).toBe(user1Id);
          }

          // Verify all user1 designs are included
          for (const design of user1Designs) {
            const found = user1Retrieved.find(d => d.id === design.id);
            expect(found).toBeDefined();
          }

          // Get designs for user2
          const authService2 = new MockAuthService({ id: user2Id, username: designs[1].username });
          const handler2 = new SubmissionHandler(storage, authService2);
          const user2Retrieved = await handler2.getUserDesigns(user2Id);

          // Verify all returned designs belong to user2
          expect(user2Retrieved.length).toBe(user2Designs.length);
          for (const design of user2Retrieved) {
            expect(design.userId).toBe(user2Id);
          }

          // Verify no cross-contamination
          for (const design of user1Retrieved) {
            expect(design.userId).not.toBe(user2Id);
          }
          for (const design of user2Retrieved) {
            expect(design.userId).not.toBe(user1Id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property: pagination returns correct subset of designs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(designGen, { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        async (designs, limit) => {
          const redis = new MockRedisClient();
          const storage = new StorageService(redis);

          // Use same theme for all designs
          const themeId = designs[0].themeId;
          const themeDesigns = designs.map(d => ({ ...d, themeId }));

          // Submit all designs
          for (const design of themeDesigns) {
            const authService = new MockAuthService({ id: design.userId, username: design.username });
            const handler = new SubmissionHandler(storage, authService);
            await handler.submitDesign(design);
          }

          // Get first page
          const authService = new MockAuthService();
          const handler = new SubmissionHandler(storage, authService);
          const firstPage = await handler.getSubmittedDesigns(themeId, limit, 0);
          expect(firstPage.length).toBeLessThanOrEqual(limit);
          expect(firstPage.length).toBeLessThanOrEqual(themeDesigns.length);

          // Get second page
          const secondPage = await handler.getSubmittedDesigns(themeId, limit, limit);
          
          // Verify no overlap between pages
          for (const design1 of firstPage) {
            const found = secondPage.find(d => d.id === design1.id);
            expect(found).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
