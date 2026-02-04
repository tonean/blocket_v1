/**
 * Canvas Component - Renders the isometric room view with placed assets
 * Supports both edit and preview modes with drag-and-drop and keyboard controls
 */

import { Devvit } from '@devvit/public-api';
import { Design, PlacedAsset, Theme } from '../types/models.js';
import { ThemeDisplay } from './ThemeDisplay.js';

export interface CanvasProps {
  design: Design;
  mode: 'edit' | 'preview';
  theme?: Theme | null;
  timeRemaining?: number;
  selectedAssetIndex?: number;
  onAssetClick?: (assetIndex: number) => void;
  onBackgroundClick?: (x: number, y: number) => void;
  onAssetDrag?: (assetIndex: number, x: number, y: number) => void;
  onAssetRotate?: (assetIndex: number) => void;
  onAssetDelete?: (assetIndex: number) => void;
  onSubmit?: () => void;
  isSubmitted?: boolean;
  // Responsive styling props
  roomImageWidth?: number;
  roomImageHeight?: number;
  padding?: 'small' | 'medium' | 'large';
  gap?: 'small' | 'medium' | 'large';
}

/**
 * Canvas component that renders the room design
 */
export const Canvas = (props: CanvasProps): JSX.Element => {
  const {
    design,
    mode,
    theme,
    timeRemaining = 0,
    selectedAssetIndex,
    onAssetClick,
    onBackgroundClick,
    onAssetDrag,
    onAssetRotate,
    onAssetDelete,
    onSubmit,
    isSubmitted = false,
    roomImageWidth = 600,
    roomImageHeight = 450,
    padding = 'medium',
    gap = 'medium',
  } = props;

  // Use pink background to match screenshot
  const backgroundColor = design.backgroundColor || '#F9E8E8';

  // Sort assets by z-index for proper layering
  const sortedAssets = [...design.assets]
    .map((asset, index) => ({ asset, originalIndex: index }))
    .sort((a, b) => a.asset.zIndex - b.asset.zIndex);

  // Render a single asset with optional selection indicator and controls
  const renderAsset = (placedAsset: PlacedAsset, originalIndex: number, isSelected: boolean) => {
    const assetImageUrl = `assets/${placedAsset.assetId}.png`;

    return (
      <vstack
        key={`asset-${originalIndex}`}
        alignment="start top"
        onPress={() => onAssetClick?.(originalIndex)}
      >
        <image
          url={assetImageUrl}
          imageWidth={100}
          imageHeight={100}
          description={`Asset ${placedAsset.assetId}`}
        />
        {isSelected && mode === 'edit' && (
          <vstack
            backgroundColor="#3B82F6"
            borderColor="#2563EB"
            padding="small"
            cornerRadius="small"
            gap="small"
          >
            <text size="xsmall" color="#FFFFFF">Selected</text>

            {/* Desktop control buttons */}
            <hstack gap="small">
              <button
                size="small"
                appearance="primary"
                onPress={() => onAssetRotate?.(originalIndex)}
              >
                Rotate (R)
              </button>
              <button
                size="small"
                appearance="destructive"
                onPress={() => onAssetDelete?.(originalIndex)}
              >
                Delete
              </button>
            </hstack>

            {/* Position info */}
            <text size="xsmall" color="#FFFFFF">
              x: {placedAsset.x}, y: {placedAsset.y}
            </text>
            <text size="xsmall" color="#FFFFFF">
              rotation: {placedAsset.rotation}°
            </text>
          </vstack>
        )}
      </vstack>
    );
  };

  // Render the canvas in edit mode (room shifted left, asset panel on right)
  if (mode === 'edit') {
    return (
      <vstack width="100%" height="100%" gap={gap}>
        {/* Theme display at the top */}
        <ThemeDisplay theme={theme || null} timeRemaining={timeRemaining} />

        <hstack width="100%" height="100%" gap={gap}>
          {/* Left side: Room canvas */}
          <vstack
            width="60%"
            height="100%"
            gap="small"
          >
            {/* Desktop keyboard shortcuts info */}
            <hstack
              backgroundColor="#EFF6FF"
              padding={padding}
              cornerRadius="small"
              gap="small"
            >
              <text size="xsmall" color="#1E40AF" weight="bold">
                Desktop Controls:
              </text>
              <text size="xsmall" color="#1E40AF">
                Click to select • R to rotate • Delete to remove
              </text>
            </hstack>

            {/* Canvas area */}
            <vstack
              grow
              backgroundColor={design.backgroundColor}
              alignment="center middle"
              onPress={(event) => {
                // Handle background click for asset placement
                if (onBackgroundClick) {
                  // Note: Devvit doesn't provide exact click coordinates in blocks API
                  // This is a simplified implementation
                  onBackgroundClick(400, 300);
                }
              }}
            >
              {/* Base room image */}
              <image
                url="room_1.png"
                imageWidth={roomImageWidth}
                imageHeight={roomImageHeight}
                description="Room base"
              />

              {/* Render placed assets in z-index order */}
              <vstack alignment="start top">
                {sortedAssets.map(({ asset, originalIndex }) =>
                  renderAsset(
                    asset,
                    originalIndex,
                    selectedAssetIndex === originalIndex
                  )
                )}
              </vstack>
            </vstack>
          </vstack>

          {/* Right side: Asset panel placeholder */}
          <vstack
            width="40%"
            height="100%"
            backgroundColor="#F3F4F6"
            alignment="center middle"
            padding={padding}
          >
            <text size="medium" weight="bold">Asset Library</text>
            <text size="small" color="#6B7280">Assets will appear here</text>
          </vstack>
        </hstack>
      </vstack>
    );
  }

  // Render the canvas in preview mode (full-width)
  return (
    <vstack
      width="100%"
      height="100%"
      gap={gap}
      alignment="center middle"
    >
      {/* Theme display at the top */}
      <ThemeDisplay theme={theme || null} timeRemaining={timeRemaining} />

      {/* Canvas area with room and assets */}
      <vstack
        grow
        width="100%"
        backgroundColor={backgroundColor}
        alignment="center middle"
      >
        {/* Base room image */}
        <image
          url="room_1.png"
          imageWidth={roomImageWidth}
          imageHeight={roomImageHeight}
          description="Room base"
        />

        {/* Render placed assets in z-index order */}
        <vstack alignment="start top">
          {sortedAssets.map(({ asset, originalIndex }) =>
            renderAsset(asset, originalIndex, false)
          )}
        </vstack>
      </vstack>

      {/* Submit button (only show if not already submitted) */}
      {!isSubmitted && onSubmit && (
        <vstack padding={padding} alignment="center middle">
          <button
            appearance="primary"
            size="large"
            onPress={onSubmit}
          >
            Submit Design
          </button>
          <text size="small" color="#6B7280">
            Share your design with the community
          </text>
        </vstack>
      )}

      {/* Already submitted message */}
      {isSubmitted && (
        <vstack
          padding={padding}
          alignment="center middle"
          backgroundColor="#EFF6FF"
          cornerRadius="medium"
        >
          <text size="medium" weight="bold" color="#1E40AF">
            ✓ Design Already Submitted
          </text>
          <text size="small" color="#3B82F6">
            You've already submitted a design for this theme
          </text>
        </vstack>
      )}
    </vstack>
  );
};
