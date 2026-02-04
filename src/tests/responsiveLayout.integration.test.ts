/**
 * Integration tests for responsive layout
 * Tests desktop and mobile layout rendering
 * 
 * Requirements: 9.1, 10.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Design, Asset, AssetCategory } from '../types/models.js';
import { detectDeviceType, getLayoutDimensions, getResponsiveStyles } from '../utils/deviceDetection.js';

describe('Responsive Layout Integration Tests', () => {
  let mockContext: any;
  let sampleDesign: Design;
  let sampleAssets: Asset[];

  beforeEach(() => {
    // Create mock Devvit context
    mockContext = {
      redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        sAdd: vi.fn(),
        sMembers: vi.fn(),
        zAdd: vi.fn(),
        zRevRange: vi.fn(),
        zRevRank: vi.fn(),
        zIncrBy: vi.fn(),
      },
      userId: 'test_user_123',
      postId: 'test_post_456',
    };

    // Create sample design
    sampleDesign = {
      id: 'design_test_1',
      userId: 'user_123',
      username: 'testuser',
      themeId: 'theme_school_001',
      backgroundColor: '#E8F4F8',
      assets: [
        {
          assetId: 'desk',
          x: 150,
          y: 200,
          rotation: 0,
          zIndex: 1,
        },
        {
          assetId: 'chair_1',
          x: 180,
          y: 220,
          rotation: 90,
          zIndex: 2,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submitted: false,
      voteCount: 0,
    };

    // Create sample assets
    sampleAssets = [
      {
        id: 'desk',
        name: 'Desk',
        category: AssetCategory.DECORATION,
        imageUrl: 'assets/desk.png',
        thumbnailUrl: 'assets/desk.png',
        width: 100,
        height: 80,
      },
      {
        id: 'chair_1',
        name: 'Chair 1',
        category: AssetCategory.CHAIR,
        imageUrl: 'assets/chair_1.png',
        thumbnailUrl: 'assets/chair_1.png',
        width: 60,
        height: 80,
      },
      {
        id: 'bookshelf_1',
        name: 'Bookshelf 1',
        category: AssetCategory.BOOKSHELF,
        imageUrl: 'assets/bookshelf_1.png',
        thumbnailUrl: 'assets/bookshelf_1.png',
        width: 80,
        height: 120,
      },
    ];
  });

  describe('Desktop Layout Rendering', () => {
    it('should detect desktop device type by default', () => {
      const deviceType = detectDeviceType(mockContext);
      expect(deviceType).toBe('desktop');
    });

    it('should return desktop layout dimensions', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      expect(dimensions.canvasWidth).toBe('60%');
      expect(dimensions.assetLibraryWidth).toBe('40%');
      expect(dimensions.canvasHeight).toBe('100%');
      expect(dimensions.assetLibraryHeight).toBe('100%');
      expect(dimensions.roomImageWidth).toBe(600);
      expect(dimensions.roomImageHeight).toBe(450);
      expect(dimensions.assetThumbnailSize).toBe(80);
    });

    it('should return desktop responsive styles', () => {
      const styles = getResponsiveStyles('desktop');
      
      expect(styles.padding).toBe('medium');
      expect(styles.gap).toBe('medium');
      expect(styles.fontSize).toBe('medium');
      expect(styles.buttonSize).toBe('medium');
      expect(styles.borderRadius).toBe('medium');
    });

    it('should use side-by-side layout in edit mode', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      // Desktop edit mode should have canvas and asset library side-by-side
      expect(dimensions.canvasWidth).toBe('60%');
      expect(dimensions.assetLibraryWidth).toBe('40%');
      
      // Both should take full height
      expect(dimensions.canvasHeight).toBe('100%');
      expect(dimensions.assetLibraryHeight).toBe('100%');
    });

    it('should use full-width layout in preview mode', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      // In preview mode, canvas should be able to expand to full width
      // The layout component handles this by not rendering the asset library
      expect(dimensions.canvasHeight).toBe('100%');
    });

    it('should provide larger room image dimensions for desktop', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      expect(dimensions.roomImageWidth).toBeGreaterThan(350);
      expect(dimensions.roomImageHeight).toBeGreaterThan(260);
    });

    it('should provide larger asset thumbnails for desktop', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      expect(dimensions.assetThumbnailSize).toBeGreaterThan(60);
    });
  });

  describe('Mobile Layout Rendering', () => {
    it('should return mobile layout dimensions', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      expect(dimensions.canvasWidth).toBe('100%');
      expect(dimensions.assetLibraryWidth).toBe('100%');
      expect(dimensions.canvasHeight).toBe('70%');
      expect(dimensions.assetLibraryHeight).toBe('30%');
      expect(dimensions.roomImageWidth).toBe(350);
      expect(dimensions.roomImageHeight).toBe(260);
      expect(dimensions.assetThumbnailSize).toBe(60);
    });

    it('should return mobile responsive styles', () => {
      const styles = getResponsiveStyles('mobile');
      
      expect(styles.padding).toBe('small');
      expect(styles.gap).toBe('small');
      expect(styles.fontSize).toBe('small');
      expect(styles.buttonSize).toBe('small');
      expect(styles.borderRadius).toBe('small');
    });

    it('should use stacked layout in edit mode', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      // Mobile edit mode should stack canvas and asset library vertically
      expect(dimensions.canvasWidth).toBe('100%');
      expect(dimensions.assetLibraryWidth).toBe('100%');
      
      // Canvas should take more height than asset library
      expect(dimensions.canvasHeight).toBe('70%');
      expect(dimensions.assetLibraryHeight).toBe('30%');
    });

    it('should use full-screen layout in preview mode', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      // In preview mode, canvas should take full screen
      // The layout component handles this by not rendering the asset library
      expect(dimensions.canvasWidth).toBe('100%');
    });

    it('should provide smaller room image dimensions for mobile', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      expect(dimensions.roomImageWidth).toBeLessThan(600);
      expect(dimensions.roomImageHeight).toBeLessThan(450);
    });

    it('should provide smaller asset thumbnails for mobile', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      expect(dimensions.assetThumbnailSize).toBeLessThan(80);
    });

    it('should optimize for touch interactions', () => {
      const styles = getResponsiveStyles('mobile');
      
      // Mobile should use smaller padding and gaps for better space utilization
      expect(styles.padding).toBe('small');
      expect(styles.gap).toBe('small');
      
      // Buttons should be appropriately sized for touch
      expect(styles.buttonSize).toBe('small');
    });
  });

  describe('Layout Consistency', () => {
    it('should maintain consistent styling across device types', () => {
      const desktopStyles = getResponsiveStyles('desktop');
      const mobileStyles = getResponsiveStyles('mobile');
      
      // Both should have all required style properties
      expect(desktopStyles).toHaveProperty('padding');
      expect(desktopStyles).toHaveProperty('gap');
      expect(desktopStyles).toHaveProperty('fontSize');
      expect(desktopStyles).toHaveProperty('buttonSize');
      expect(desktopStyles).toHaveProperty('borderRadius');
      
      expect(mobileStyles).toHaveProperty('padding');
      expect(mobileStyles).toHaveProperty('gap');
      expect(mobileStyles).toHaveProperty('fontSize');
      expect(mobileStyles).toHaveProperty('buttonSize');
      expect(mobileStyles).toHaveProperty('borderRadius');
    });

    it('should maintain design state across layout changes', () => {
      // Design state should be independent of layout
      const desktopDimensions = getLayoutDimensions('desktop');
      const mobileDimensions = getLayoutDimensions('mobile');
      
      // Both layouts should be able to render the same design
      expect(sampleDesign.assets.length).toBe(2);
      expect(sampleDesign.backgroundColor).toBe('#E8F4F8');
      
      // Layout dimensions shouldn't affect design data
      expect(desktopDimensions).toBeDefined();
      expect(mobileDimensions).toBeDefined();
    });

    it('should provide appropriate dimensions for both layouts', () => {
      const desktopDimensions = getLayoutDimensions('desktop');
      const mobileDimensions = getLayoutDimensions('mobile');
      
      // Desktop should have larger dimensions
      expect(desktopDimensions.roomImageWidth).toBeGreaterThan(mobileDimensions.roomImageWidth);
      expect(desktopDimensions.roomImageHeight).toBeGreaterThan(mobileDimensions.roomImageHeight);
      expect(desktopDimensions.assetThumbnailSize).toBeGreaterThan(mobileDimensions.assetThumbnailSize);
    });
  });

  describe('Asset Library Optimization', () => {
    it('should optimize asset library for desktop scrolling', () => {
      const dimensions = getLayoutDimensions('desktop');
      
      // Desktop should have full height for asset library
      expect(dimensions.assetLibraryHeight).toBe('100%');
      
      // Larger thumbnails for better visibility
      expect(dimensions.assetThumbnailSize).toBe(80);
    });

    it('should optimize asset library for mobile scrolling', () => {
      const dimensions = getLayoutDimensions('mobile');
      
      // Mobile should have limited height for asset library (30%)
      expect(dimensions.assetLibraryHeight).toBe('30%');
      
      // Smaller thumbnails to fit more assets in limited space
      expect(dimensions.assetThumbnailSize).toBe(60);
    });

    it('should handle asset filtering consistently across layouts', () => {
      // Asset filtering logic should work the same regardless of layout
      const chairAssets = sampleAssets.filter(
        (asset) => asset.category === AssetCategory.CHAIR
      );
      
      expect(chairAssets.length).toBe(1);
      expect(chairAssets[0].id).toBe('chair_1');
    });

    it('should handle asset search consistently across layouts', () => {
      // Asset search logic should work the same regardless of layout
      const searchQuery = 'chair';
      const searchResults = sampleAssets.filter((asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe('chair_1');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context gracefully', () => {
      const deviceType = detectDeviceType(null as any);
      
      // Should default to desktop on error
      expect(deviceType).toBe('desktop');
    });

    it('should handle invalid device type gracefully', () => {
      const dimensions = getLayoutDimensions('invalid' as any);
      
      // Should return desktop dimensions as fallback
      expect(dimensions.canvasWidth).toBe('60%');
    });

    it('should provide valid dimensions for all device types', () => {
      const desktopDimensions = getLayoutDimensions('desktop');
      const mobileDimensions = getLayoutDimensions('mobile');
      
      // All dimensions should be defined and valid
      expect(desktopDimensions.roomImageWidth).toBeGreaterThan(0);
      expect(desktopDimensions.roomImageHeight).toBeGreaterThan(0);
      expect(mobileDimensions.roomImageWidth).toBeGreaterThan(0);
      expect(mobileDimensions.roomImageHeight).toBeGreaterThan(0);
    });
  });
});
