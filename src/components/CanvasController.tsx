/**
 * CanvasController - Manages canvas interactions including drag-and-drop and keyboard controls
 * This component wraps the Canvas and provides desktop-specific interaction handling
 */

import { Devvit, useState, useInterval } from '@devvit/public-api';
import { Design, Asset } from '../types/models.js';
import { Canvas } from './Canvas.js';
import { AutoSaveManager } from '../utils/AutoSaveManager.js';
import { SaveStatusIndicator } from './SaveStatusIndicator.js';
import { useAutoSave } from '../hooks/useAutoSave.js';

export interface CanvasControllerProps {
  design: Design;
  mode: 'edit' | 'preview';
  assets?: Asset[];
  onDesignUpdate: (design: Design) => void;
  onAssetPlace?: (assetId: string) => void;
  onSubmit?: () => void;
  isSubmitted?: boolean;
  autoSaveManager?: AutoSaveManager | null;
}

/**
 * CanvasController component that manages canvas interactions
 */
export const CanvasController = (props: CanvasControllerProps): JSX.Element => {
  const { design, mode, assets, onDesignUpdate, onAssetPlace, onSubmit, isSubmitted, autoSaveManager } = props;

  // Track selected asset
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | undefined>(undefined);
  
  // Track drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);

  // Use auto-save hook
  const { saveStatus, lastSaveTime, saveError } = useAutoSave(design, autoSaveManager || null);

  /**
   * Handle asset click - select the asset
   */
  const handleAssetClick = (assetIndex: number) => {
    setSelectedAssetIndex(assetIndex);
    setIsDragging(false);
  };

  /**
   * Handle background click - deselect or place new asset
   */
  const handleBackgroundClick = (x: number, y: number) => {
    if (selectedAssetIndex !== undefined) {
      // Deselect current asset
      setSelectedAssetIndex(undefined);
    }
  };

  /**
   * Handle asset drag - update position in real-time
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
   * Handle asset rotation (keyboard shortcut R)
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
   * Handle asset deletion (keyboard shortcut Delete)
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
    <vstack width="100%" height="100%" gap="small">
      {/* Save status indicator */}
      {autoSaveManager && (
        <hstack width="100%" alignment="end" padding="small">
          <SaveStatusIndicator 
            status={saveStatus} 
            lastSaveTime={lastSaveTime}
            error={saveError}
          />
        </hstack>
      )}
      
      {/* Canvas */}
      <Canvas
        design={design}
        mode={mode}
        assets={assets}
        selectedAssetIndex={selectedAssetIndex}
        onAssetClick={handleAssetClick}
        onBackgroundClick={handleBackgroundClick}
        onAssetDrag={handleAssetDrag}
        onAssetRotate={handleAssetRotate}
        onAssetDelete={handleAssetDelete}
        onSubmit={onSubmit}
        isSubmitted={isSubmitted}
      />
    </vstack>
  );
};
