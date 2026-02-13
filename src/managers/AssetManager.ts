/**
 * AssetManager - Manages asset library, loading, categorization, and filtering
 */

import { Asset, AssetCategory } from '../types/models.js';
import { Context } from '@devvit/public-api';

export class AssetManager {
  private assets: Asset[] = [];
  private context?: Context;

  constructor(context?: Context) {
    this.context = context;
  }

  /**
   * Load all assets from the assets folder
   * Scans filenames to determine categories and generates metadata
   */
  loadAssets(): Asset[] {
    // Asset filenames from the assets folder - ALL lowercase .png
    const assetFiles = [
      'backpack_1.png',
      'backpack_2.png',
      'book.png',
      'bookshelf_1.png',
      'bookshelf_2.png',
      'bookshelf_3.png',
      'calendar.png',
      'chair_1.png',
      'chair_2.png',
      'chair_3.png',
      'chair_4.png',
      'chair_5.png',
      'chalkboard.png',
      'clock.png',
      'coffee_machine.png',
      'cube.png',
      'cube_2.png',
      'cup.png',
      'curtain_1.png',
      'desk.png',
      'desk_2.png',
      'lamp.png',
      'laptop.png',
      'light_switch.png',
      'mouse.png',
      'plant.png',
      'plant_1.png',
      'plant_2.png',
      'plant_3.png',
      'plant_4.png',
      'plant_5.png',
      'plant_6.png',
      'plant_7.png',
      'plant_8.png',
      'poster_1.png',
      'printer.png',
      'rug_1.png',
      'rug_2.png',
      'rug_3.png',
      'shelf_1.png',
      'student_1.png',
      'student_2.png',
      'teacher.png',
      'to_do.png',
      'trash.png',
      'trashcan.png',
    ];

    this.assets = assetFiles.map((filename) => {
      const category = this.categorizeAsset(filename);
      const id = filename.replace(/\.png$/, '');
      const name = this.generateAssetName(filename);

      // In Devvit, assets are served directly by filename from the assets folder
      // The context.assets.getURL() returns the proper CDN URL
      let assetUrl: string;
      if (this.context) {
        try {
          assetUrl = this.context.assets.getURL(filename);
          console.log(`Loaded asset ${filename}: ${assetUrl}`);
        } catch (error) {
          console.error(`Failed to get URL for ${filename}:`, error);
          assetUrl = filename; // Fallback to just filename
        }
      } else {
        assetUrl = filename; // Local development
      }

      // Get realistic dimensions based on object type
      const { width, height } = this.getAssetDimensions(filename);

      return {
        id,
        name,
        category,
        imageUrl: assetUrl,
        thumbnailUrl: assetUrl,
        width,
        height,
      };
    });

    return this.assets;
  }

  /**
   * Get realistic dimensions for assets based on their real-world size
   */
  private getAssetDimensions(filename: string): { width: number; height: number } {
    const lowerFilename = filename.toLowerCase();

    // Large furniture (300-350px)
    if (lowerFilename.includes('bookshelf') || lowerFilename.includes('desk')) {
      return { width: 320, height: 320 };
    }

    // Medium-large furniture (260-280px)
    if (lowerFilename.includes('chair') || lowerFilename.includes('chalkboard')) {
      return { width: 270, height: 270 };
    }

    // People (250-270px - slightly smaller than chairs)
    if (lowerFilename.includes('student') || lowerFilename.includes('teacher')) {
      return { width: 250, height: 250 };
    }

    // Rugs (300-350px wide, flatter)
    if (lowerFilename.includes('rug')) {
      return { width: 320, height: 260 };
    }

    // Medium items (180-220px)
    if (lowerFilename.includes('plant') || lowerFilename.includes('lamp') || 
        lowerFilename.includes('clock') || lowerFilename.includes('backpack') ||
        lowerFilename.includes('printer') || lowerFilename.includes('coffee_machine') ||
        lowerFilename.includes('trash')) {
      return { width: 200, height: 200 };
    }

    // Small-medium items (150-180px)
    if (lowerFilename.includes('laptop') || lowerFilename.includes('poster') ||
        lowerFilename.includes('calendar') || lowerFilename.includes('shelf') ||
        lowerFilename.includes('curtain')) {
      return { width: 160, height: 160 };
    }

    // Small items (100-130px)
    if (lowerFilename.includes('cup') || lowerFilename.includes('mouse') ||
        lowerFilename.includes('book') || lowerFilename.includes('cube') ||
        lowerFilename.includes('light_switch') || lowerFilename.includes('to_do')) {
      return { width: 120, height: 120 };
    }

    // Default medium size
    return { width: 180, height: 180 };
  }

  /**
   * Categorize an asset based on its filename
   */
  private categorizeAsset(filename: string): AssetCategory {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.startsWith('bookshelf')) {
      return AssetCategory.BOOKSHELF;
    } else if (lowerFilename.startsWith('chair')) {
      return AssetCategory.CHAIR;
    } else if (lowerFilename.startsWith('rug')) {
      return AssetCategory.RUG;
    } else if (
      lowerFilename.startsWith('desk') ||
      lowerFilename.startsWith('shelf') ||
      lowerFilename.startsWith('curtain') ||
      lowerFilename.startsWith('chalkboard')
    ) {
      return AssetCategory.FURNITURE;
    } else if (
      lowerFilename.startsWith('laptop') ||
      lowerFilename.startsWith('mouse') ||
      lowerFilename.startsWith('coffee_machine') ||
      lowerFilename.startsWith('printer') ||
      lowerFilename.startsWith('light_switch')
    ) {
      return AssetCategory.ELECTRONICS;
    } else if (lowerFilename.startsWith('lamp')) {
      return AssetCategory.LIGHTING;
    } else if (
      lowerFilename.startsWith('student') ||
      lowerFilename.startsWith('teacher')
    ) {
      return AssetCategory.PEOPLE;
    } else {
      // All other items are decorations (clock, cup, plant, poster, calendar, etc.)
      return AssetCategory.DECORATION;
    }
  }

  /**
   * Generate a human-readable name from filename
   */
  private generateAssetName(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.png$/, '');

    // Replace underscores with spaces and capitalize
    const words = nameWithoutExt.split('_');
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get asset by ID
   */
  getAssetById(id: string): Asset | null {
    return this.assets.find((asset) => asset.id === id) || null;
  }

  /**
   * Get all assets
   */
  getAllAssets(): Asset[] {
    return [...this.assets];
  }

  /**
   * Search assets by name (case-insensitive)
   */
  searchAssets(query: string): Asset[] {
    if (!query) {
      return this.getAllAssets();
    }

    const lowerQuery = query.toLowerCase();
    return this.assets.filter((asset) =>
      asset.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get assets by category
   */
  getAssetsByCategory(category: AssetCategory): Asset[] {
    return this.assets.filter((asset) => asset.category === category);
  }

  /**
   * Sort assets by specified criterion
   */
  sortAssets(assets: Asset[], sortBy: 'name' | 'category'): Asset[] {
    const sorted = [...assets];

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      sorted.sort((a, b) => a.category.localeCompare(b.category));
    }

    return sorted;
  }
}
