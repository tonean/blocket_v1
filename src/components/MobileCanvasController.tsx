/**
 * MobileCanvasController - Manages mobile canvas interactions with touch gestures
 * Handles tap-to-place, drag gestures, and touch-friendly controls
 */

import { Devvit, useState } from '@devvit/public-api';
import { Design, Asset } from '../types/models.js';
import { MobileCanvas } from './MobileCanvas.js';

export interface MobileCanvasControllerProps {
  design: Design;
  mode: 'edit' | 'preview';
  assets?: Asset[];
  onDesignUpdate: (design: Design) => void;
  onAssetPlace?: (assetId: string) => void;
}

/**
 * MobileCanvasController component that manages mobile touch interactions
 */
export const MobileCanvasController = (props: MobileCanvasControllerProps): JSX.Element => {
  const { design, mode, assets, onDesignUpdate, onAssetPlace } = props;

  // Track selected asset
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | undefined>(undefined);

  // Track touch state for drag gestures
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Handle asset tap - select the asset
   */
  const handleAssetClick = (assetIndex: number) => {
    setSelectedAssetIndex(assetIndex);
    setIsDragging(false);
  };

  /**
   * Handle background tap - deselect or place new asset
   */
  const handleBackgroundTap = (x: number, y: number) => {
    if (selectedAssetIndex !== undefined) {
      // Deselect current asset
      setSelectedAssetIndex(undefined);
    } else if (onAssetPlace) {
      // Place new asset at tap location
      // This would be called when an asset is selected from the library
    }
  };

  /**
   * Handle asset drag - update position with touch gesture
   */
  const handleAssetDrag = (assetIndex: number, x: number, y: number) => {
    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      return;
    }

    // Create updated design with new asset position
    const updatedDesign = { ...design };
    updatedDesign.assets = [...design.assets];
    updatedDesign.assets[assetIndex] = {
      ...updatedDesign.assets[assetIndex],
      x,
      y,
    };
    updatedDesign.updatedAt = Date.now();

    onDesignUpdate(updatedDesign);
  };

  /**
   * Handle asset rotation (on-screen button)
   */
  const handleAssetRotate = (assetIndex: number) => {
    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      return;
    }

    // Create updated design with rotated asset
    const updatedDesign = { ...design };
    updatedDesign.assets = [...design.assets];
    const currentRotation = updatedDesign.assets[assetIndex].rotation;
    updatedDesign.assets[assetIndex] = {
      ...updatedDesign.assets[assetIndex],
      rotation: (currentRotation + 90) % 360,
    };
    updatedDesign.updatedAt = Date.now();

    onDesignUpdate(updatedDesign);
  };

  /**
   * Handle asset deletion (on-screen trash button)
   */
  const handleAssetDelete = (assetIndex: number) => {
    if (assetIndex < 0 || assetIndex >= design.assets.length) {
      return;
    }

    // Create updated design with asset removed
    const updatedDesign = { ...design };
    updatedDesign.assets = design.assets.filter((_, index) => index !== assetIndex);
    updatedDesign.updatedAt = Date.now();

    // Clear selection
    setSelectedAssetIndex(undefined);

    onDesignUpdate(updatedDesign);
  };

  return (
    <MobileCanvas
      design={design}
      mode={mode}
      assets={assets}
      selectedAssetIndex={selectedAssetIndex}
      onAssetClick={handleAssetClick}
      onBackgroundTap={handleBackgroundTap}
      onAssetDrag={handleAssetDrag}
      onAssetRotate={handleAssetRotate}
      onAssetDelete={handleAssetDelete}
    />
  );
};
