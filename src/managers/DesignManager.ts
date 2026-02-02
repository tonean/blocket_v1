/**
 * DesignManager - Manages design state, CRUD operations, and asset manipulation
 */

import { Design, PlacedAsset, isValidCoordinate, isValidHexColor } from '../types/models.js';

export interface DesignManagerConfig {
  canvasWidth?: number;
  canvasHeight?: number;
}

export class DesignManager {
  private designs: Map<string, Design> = new Map();
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(config: DesignManagerConfig = {}) {
    this.canvasWidth = config.canvasWidth || 800;
    this.canvasHeight = config.canvasHeight || 600;
  }

  /**
   * Create a new design
   */
  createDesign(userId: string, themeId: string, username: string = 'user'): Design {
    const now = Date.now();
    const design: Design = {
      id: `design_${userId}_${themeId}_${now}`,
      userId,
      username,
      themeId,
      backgroundColor: '#FFFFFF',
      assets: [],
      createdAt: now,
      updatedAt: now,
      submitted: false,
      voteCount: 0,
    };

    this.designs.set(design.id, design);
    return design;
  }

  /**
   * Update background color of a design
   */
  updateBackgroundColor(designId: string, color: string): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    if (!isValidHexColor(color)) {
      throw new Error(`Invalid hex color: ${color}`);
    }

    design.backgroundColor = color;
    design.updatedAt = Date.now();
  }

  /**
   * Place an asset on the canvas with boundary validation
   */
  placeAsset(designId: string, assetId: string, x: number, y: number): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    // Clamp coordinates to canvas boundaries
    const clampedX = Math.max(0, Math.min(x, this.canvasWidth));
    const clampedY = Math.max(0, Math.min(y, this.canvasHeight));

    // Calculate next z-index (highest current + 1)
    const maxZIndex = design.assets.length > 0
      ? Math.max(...design.assets.map(a => a.zIndex))
      : -1;

    const placedAsset: PlacedAsset = {
      assetId,
      x: clampedX,
      y: clampedY,
      rotation: 0,
      zIndex: maxZIndex + 1,
    };

    design.assets.push(placedAsset);
    design.updatedAt = Date.now();
  }

  /**
   * Move an asset to a new position with boundary enforcement
   */
  moveAsset(designId: string, assetIndex: number, x: number, y: number): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    // Clamp coordinates to canvas boundaries
    const clampedX = Math.max(0, Math.min(x, this.canvasWidth));
    const clampedY = Math.max(0, Math.min(y, this.canvasHeight));

    design.assets[assetIndex].x = clampedX;
    design.assets[assetIndex].y = clampedY;
    design.updatedAt = Date.now();
  }

  /**
   * Rotate an asset by 90 degrees
   */
  rotateAsset(designId: string, assetIndex: number): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    const asset = design.assets[assetIndex];
    asset.rotation = (asset.rotation + 90) % 360;
    design.updatedAt = Date.now();
  }

  /**
   * Remove an asset from the canvas
   */
  removeAsset(designId: string, assetIndex: number): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    design.assets.splice(assetIndex, 1);
    design.updatedAt = Date.now();
  }

  /**
   * Adjust z-index of an asset (layering)
   */
  adjustZIndex(designId: string, assetIndex: number, direction: 'up' | 'down'): void {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design not found: ${designId}`);
    }

    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      throw new Error(`Invalid asset index: ${assetIndex}`);
    }

    const asset = design.assets[assetIndex];
    
    if (direction === 'up') {
      asset.zIndex += 1;
    } else if (direction === 'down') {
      asset.zIndex = Math.max(0, asset.zIndex - 1);
    }

    design.updatedAt = Date.now();
  }

  /**
   * Get a design by ID
   */
  getDesign(designId: string): Design | undefined {
    return this.designs.get(designId);
  }

  /**
   * Get all designs
   */
  getAllDesigns(): Design[] {
    return Array.from(this.designs.values());
  }

  /**
   * Delete a design
   */
  deleteDesign(designId: string): boolean {
    return this.designs.delete(designId);
  }
}
