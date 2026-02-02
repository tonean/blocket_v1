/**
 * Unit tests for core data models validation functions
 */

import { describe, test, expect } from 'vitest';
import {
  isValidRotation,
  isValidCoordinate,
  isValidHexColor,
  validatePlacedAsset,
  validateDesign,
  validateAsset,
  validateTheme,
  validateLeaderboardEntry,
  AssetCategory,
  type PlacedAsset,
  type Design,
  type Asset,
  type Theme,
  type LeaderboardEntry
} from '../types/models';

describe('Unit Tests: Type Validation Functions', () => {
  describe('isValidRotation', () => {
    test('should accept valid rotation values', () => {
      expect(isValidRotation(0)).toBe(true);
      expect(isValidRotation(90)).toBe(true);
      expect(isValidRotation(180)).toBe(true);
      expect(isValidRotation(270)).toBe(true);
    });

    test('should reject invalid rotation values', () => {
      expect(isValidRotation(45)).toBe(false);
      expect(isValidRotation(360)).toBe(false);
      expect(isValidRotation(-90)).toBe(false);
      expect(isValidRotation(135)).toBe(false);
    });
  });

  describe('isValidCoordinate', () => {
    test('should accept coordinates within bounds', () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(400, 300)).toBe(true);
      expect(isValidCoordinate(800, 600)).toBe(true);
    });

    test('should accept coordinates at exact boundaries', () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(800, 0)).toBe(true);
      expect(isValidCoordinate(0, 600)).toBe(true);
      expect(isValidCoordinate(800, 600)).toBe(true);
    });

    test('should reject coordinates outside bounds', () => {
      expect(isValidCoordinate(-1, 0)).toBe(false);
      expect(isValidCoordinate(0, -1)).toBe(false);
      expect(isValidCoordinate(801, 0)).toBe(false);
      expect(isValidCoordinate(0, 601)).toBe(false);
      expect(isValidCoordinate(1000, 1000)).toBe(false);
    });

    test('should support custom canvas dimensions', () => {
      expect(isValidCoordinate(500, 500, 1000, 1000)).toBe(true);
      expect(isValidCoordinate(1001, 500, 1000, 1000)).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    test('should accept valid hex colors', () => {
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#E8F4F8')).toBe(true);
      expect(isValidHexColor('#abc123')).toBe(true);
    });

    test('should reject invalid hex colors', () => {
      expect(isValidHexColor('000000')).toBe(false); // missing #
      expect(isValidHexColor('#FFF')).toBe(false); // too short
      expect(isValidHexColor('#GGGGGG')).toBe(false); // invalid characters
      expect(isValidHexColor('#12345')).toBe(false); // too short
      expect(isValidHexColor('#1234567')).toBe(false); // too long
    });
  });

  describe('validatePlacedAsset', () => {
    test('should accept valid placed asset', () => {
      const asset: PlacedAsset = {
        assetId: 'desk_01',
        x: 150,
        y: 200,
        rotation: 90,
        zIndex: 1
      };
      expect(validatePlacedAsset(asset)).toBe(true);
    });

    test('should reject asset with invalid coordinates', () => {
      const asset: PlacedAsset = {
        assetId: 'desk_01',
        x: -10,
        y: 200,
        rotation: 90,
        zIndex: 1
      };
      expect(validatePlacedAsset(asset)).toBe(false);
    });

    test('should reject asset with invalid rotation', () => {
      const asset: PlacedAsset = {
        assetId: 'desk_01',
        x: 150,
        y: 200,
        rotation: 45,
        zIndex: 1
      };
      expect(validatePlacedAsset(asset)).toBe(false);
    });

    test('should reject asset with negative zIndex', () => {
      const asset: PlacedAsset = {
        assetId: 'desk_01',
        x: 150,
        y: 200,
        rotation: 90,
        zIndex: -1
      };
      expect(validatePlacedAsset(asset)).toBe(false);
    });

    test('should reject asset at boundary edge cases', () => {
      const assetOutOfBoundsX: PlacedAsset = {
        assetId: 'desk_01',
        x: 801,
        y: 200,
        rotation: 0,
        zIndex: 1
      };
      expect(validatePlacedAsset(assetOutOfBoundsX)).toBe(false);

      const assetOutOfBoundsY: PlacedAsset = {
        assetId: 'desk_01',
        x: 150,
        y: 601,
        rotation: 0,
        zIndex: 1
      };
      expect(validatePlacedAsset(assetOutOfBoundsY)).toBe(false);
    });
  });

  describe('validateDesign', () => {
    test('should accept valid design', () => {
      const design: Design = {
        id: 'design_123',
        userId: 'user_456',
        username: 'testuser',
        themeId: 'theme_789',
        backgroundColor: '#E8F4F8',
        assets: [
          {
            assetId: 'desk_01',
            x: 150,
            y: 200,
            rotation: 0,
            zIndex: 1
          }
        ],
        createdAt: 1704067200000,
        updatedAt: 1704070800000,
        submitted: false,
        voteCount: 0
      };
      expect(validateDesign(design)).toBe(true);
    });

    test('should reject design with invalid background color', () => {
      const design: Design = {
        id: 'design_123',
        userId: 'user_456',
        username: 'testuser',
        themeId: 'theme_789',
        backgroundColor: 'invalid',
        assets: [],
        createdAt: 1704067200000,
        updatedAt: 1704070800000,
        submitted: false,
        voteCount: 0
      };
      expect(validateDesign(design)).toBe(false);
    });

    test('should reject design with invalid asset', () => {
      const design: Design = {
        id: 'design_123',
        userId: 'user_456',
        username: 'testuser',
        themeId: 'theme_789',
        backgroundColor: '#E8F4F8',
        assets: [
          {
            assetId: 'desk_01',
            x: -10,
            y: 200,
            rotation: 0,
            zIndex: 1
          }
        ],
        createdAt: 1704067200000,
        updatedAt: 1704070800000,
        submitted: false,
        voteCount: 0
      };
      expect(validateDesign(design)).toBe(false);
    });
  });

  describe('validateAsset', () => {
    test('should accept valid asset', () => {
      const asset: Asset = {
        id: 'desk_01',
        name: 'Desk',
        category: AssetCategory.DECORATION,
        imageUrl: '/assets/desk.png',
        thumbnailUrl: '/assets/desk_thumb.png',
        width: 100,
        height: 80
      };
      expect(validateAsset(asset)).toBe(true);
    });

    test('should reject asset with invalid dimensions', () => {
      const asset: Asset = {
        id: 'desk_01',
        name: 'Desk',
        category: AssetCategory.DECORATION,
        imageUrl: '/assets/desk.png',
        thumbnailUrl: '/assets/desk_thumb.png',
        width: 0,
        height: 80
      };
      expect(validateAsset(asset)).toBe(false);
    });
  });

  describe('validateTheme', () => {
    test('should accept valid theme', () => {
      const theme: Theme = {
        id: 'theme_school',
        name: 'School',
        description: 'Design a classroom',
        startTime: 1704067200000,
        endTime: 1704153600000,
        active: true
      };
      expect(validateTheme(theme)).toBe(true);
    });

    test('should reject theme with endTime before startTime', () => {
      const theme: Theme = {
        id: 'theme_school',
        name: 'School',
        description: 'Design a classroom',
        startTime: 1704153600000,
        endTime: 1704067200000,
        active: true
      };
      expect(validateTheme(theme)).toBe(false);
    });
  });

  describe('validateLeaderboardEntry', () => {
    test('should accept valid leaderboard entry', () => {
      const entry: LeaderboardEntry = {
        rank: 1,
        design: {
          id: 'design_123',
          userId: 'user_456',
          username: 'testuser',
          themeId: 'theme_789',
          backgroundColor: '#E8F4F8',
          assets: [],
          createdAt: 1704067200000,
          updatedAt: 1704070800000,
          submitted: true,
          voteCount: 42
        },
        username: 'testuser',
        voteCount: 42
      };
      expect(validateLeaderboardEntry(entry)).toBe(true);
    });

    test('should reject entry with invalid rank', () => {
      const entry: LeaderboardEntry = {
        rank: 0,
        design: {
          id: 'design_123',
          userId: 'user_456',
          username: 'testuser',
          themeId: 'theme_789',
          backgroundColor: '#E8F4F8',
          assets: [],
          createdAt: 1704067200000,
          updatedAt: 1704070800000,
          submitted: true,
          voteCount: 42
        },
        username: 'testuser',
        voteCount: 42
      };
      expect(validateLeaderboardEntry(entry)).toBe(false);
    });
  });
});
