/**
 * AssetManager - Manages asset library, loading, categorization, and filtering
 */

import { Asset, AssetCategory } from '../types/models.js';

export class AssetManager {
  private assets: Asset[] = [];

  /**
   * Load all assets from the assets folder
   * Scans filenames to determine categories and generates metadata
   */
  loadAssets(): Asset[] {
    // Asset filenames from the assets folder
    const assetFiles = [
      'bookshelf_1.png',
      'bookshelf_2.png',
      'bookshelf_3.png',
      'chair_1.png',
      'chair_2.png',
      'chair_3.PNG',
      'chair_4.PNG',
      'chair_5.PNG',
      'clock.png',
      'cup.png',
      'desk.png',
      'lamp.png',
      'laptop.png',
      'mouse.png',
      'rug_1.png',
      'rug_2.png',
      'rug_3.png',
      'trash.png',
    ];

    this.assets = assetFiles.map((filename) => {
      const category = this.categorizeAsset(filename);
      const id = filename.replace(/\.(png|PNG)$/, '');
      const name = this.generateAssetName(filename);

      return {
        id,
        name,
        category,
        imageUrl: `/assets/${filename}`,
        thumbnailUrl: `/assets/${filename}`,
        width: 100, // Default dimensions
        height: 100,
      };
    });

    return this.assets;
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
    } else {
      // All other items are decorations (clock, cup, desk, lamp, laptop, mouse, trash)
      return AssetCategory.DECORATION;
    }
  }

  /**
   * Generate a human-readable name from filename
   */
  private generateAssetName(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(png|PNG)$/, '');
    
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
