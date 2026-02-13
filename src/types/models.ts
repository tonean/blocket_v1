/**
 * Core data models for Reddit Room Design Game
 */

export enum AssetCategory {
  BOOKSHELF = 'bookshelf',
  CHAIR = 'chair',
  DECORATION = 'decoration',
  ELECTRONICS = 'electronics',
  FURNITURE = 'furniture',
  LIGHTING = 'lighting',
  PEOPLE = 'people',
  RUG = 'rug'
}

export interface PlacedAsset {
  assetId: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  zIndex: number;
}

export interface Design {
  id: string;
  userId: string;
  username: string;
  themeId: string;
  backgroundColor: string;
  assets: PlacedAsset[];
  createdAt: number;
  updatedAt: number;
  submitted: boolean;
  voteCount: number;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  active: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  design: Design;
  username: string;
  voteCount: number;
}

// Validation helper functions

export function isValidRotation(rotation: number): boolean {
  return rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270;
}

export function isValidCoordinate(x: number, y: number, canvasWidth: number = 800, canvasHeight: number = 600): boolean {
  return x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight;
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function validatePlacedAsset(asset: PlacedAsset, canvasWidth: number = 800, canvasHeight: number = 600): boolean {
  if (!asset.assetId || typeof asset.assetId !== 'string') {
    return false;
  }
  if (!isValidCoordinate(asset.x, asset.y, canvasWidth, canvasHeight)) {
    return false;
  }
  if (!isValidRotation(asset.rotation)) {
    return false;
  }
  if (typeof asset.zIndex !== 'number' || asset.zIndex < 0) {
    return false;
  }
  return true;
}

export function validateDesign(design: Design): boolean {
  if (!design.id || typeof design.id !== 'string') {
    return false;
  }
  if (!design.userId || typeof design.userId !== 'string') {
    return false;
  }
  if (!design.username || typeof design.username !== 'string') {
    return false;
  }
  if (!design.themeId || typeof design.themeId !== 'string') {
    return false;
  }
  if (!isValidHexColor(design.backgroundColor)) {
    return false;
  }
  if (!Array.isArray(design.assets)) {
    return false;
  }
  for (const asset of design.assets) {
    if (!validatePlacedAsset(asset)) {
      return false;
    }
  }
  if (typeof design.createdAt !== 'number' || design.createdAt <= 0) {
    return false;
  }
  if (typeof design.updatedAt !== 'number' || design.updatedAt <= 0) {
    return false;
  }
  if (typeof design.submitted !== 'boolean') {
    return false;
  }
  if (typeof design.voteCount !== 'number') {
    return false;
  }
  return true;
}

export function validateAsset(asset: Asset): boolean {
  if (!asset.id || typeof asset.id !== 'string') {
    return false;
  }
  if (!asset.name || typeof asset.name !== 'string') {
    return false;
  }
  if (!Object.values(AssetCategory).includes(asset.category)) {
    return false;
  }
  if (!asset.imageUrl || typeof asset.imageUrl !== 'string') {
    return false;
  }
  if (!asset.thumbnailUrl || typeof asset.thumbnailUrl !== 'string') {
    return false;
  }
  if (typeof asset.width !== 'number' || asset.width <= 0) {
    return false;
  }
  if (typeof asset.height !== 'number' || asset.height <= 0) {
    return false;
  }
  return true;
}

export function validateTheme(theme: Theme): boolean {
  if (!theme.id || typeof theme.id !== 'string') {
    return false;
  }
  if (!theme.name || typeof theme.name !== 'string') {
    return false;
  }
  if (!theme.description || typeof theme.description !== 'string') {
    return false;
  }
  if (typeof theme.startTime !== 'number' || theme.startTime <= 0) {
    return false;
  }
  if (typeof theme.endTime !== 'number' || theme.endTime <= 0) {
    return false;
  }
  if (theme.endTime <= theme.startTime) {
    return false;
  }
  if (typeof theme.active !== 'boolean') {
    return false;
  }
  return true;
}

export function validateLeaderboardEntry(entry: LeaderboardEntry): boolean {
  if (typeof entry.rank !== 'number' || entry.rank < 1) {
    return false;
  }
  if (!validateDesign(entry.design)) {
    return false;
  }
  if (!entry.username || typeof entry.username !== 'string') {
    return false;
  }
  if (typeof entry.voteCount !== 'number') {
    return false;
  }
  return true;
}

// Helper function to rotate an asset by 90 degrees
export function rotateAsset(currentRotation: number): number {
  return (currentRotation + 90) % 360;
}
