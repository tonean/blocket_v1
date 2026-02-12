/**
 * Asset Loader Utility
 * 
 * This module provides utilities for loading assets from the /assets folder.
 * Assets are loaded at build time and made available to the Devvit app.
 */

export interface AssetMetadata {
  id: string;
  name: string;
  path: string;
  category: string;
}

/**
 * Asset paths configuration
 * These paths reference the assets folder in the project root
 */
export const ASSET_PATHS = {
  ROOM_BASE: 'assets/room_2.png',
  BOOKSHELVES: [
    'assets/bookshelf_1.png',
    'assets/bookshelf_2.png',
    'assets/bookshelf_3.png',
  ],
  CHAIRS: [
    'assets/chair_1.png',
    'assets/chair_2.png',
    'assets/chair_3.PNG',
    'assets/chair_4.PNG',
    'assets/chair_5.PNG',
  ],
  DECORATIONS: [
    'assets/clock.png',
    'assets/cup.png',
    'assets/desk.png',
    'assets/lamp.png',
    'assets/laptop.png',
    'assets/mouse.png',
  ],
  RUGS: [
    'assets/rug_1.png',
    'assets/rug_2.png',
    'assets/rug_3.png',
  ],
  TRASH: 'assets/trash.png',
};

/**
 * Generate asset metadata from file paths
 */
export function generateAssetMetadata(): AssetMetadata[] {
  const assets: AssetMetadata[] = [];

  // Add bookshelves
  ASSET_PATHS.BOOKSHELVES.forEach((path, index) => {
    assets.push({
      id: `bookshelf_${index + 1}`,
      name: `Bookshelf ${index + 1}`,
      path,
      category: 'bookshelf',
    });
  });

  // Add chairs
  ASSET_PATHS.CHAIRS.forEach((path, index) => {
    assets.push({
      id: `chair_${index + 1}`,
      name: `Chair ${index + 1}`,
      path,
      category: 'chair',
    });
  });

  // Add decorations
  const decorationNames = ['Clock', 'Cup', 'Desk', 'Lamp', 'Laptop', 'Mouse'];
  ASSET_PATHS.DECORATIONS.forEach((path, index) => {
    const name = decorationNames[index];
    assets.push({
      id: name.toLowerCase(),
      name,
      path,
      category: 'decoration',
    });
  });

  // Add rugs
  ASSET_PATHS.RUGS.forEach((path, index) => {
    assets.push({
      id: `rug_${index + 1}`,
      name: `Rug ${index + 1}`,
      path,
      category: 'rug',
    });
  });

  return assets;
}
