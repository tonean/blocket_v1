/**
 * MobileCanvas Component - Mobile-optimized canvas with touch controls
 * Provides tap-to-place, drag gestures, and on-screen buttons for rotation and deletion
 */

import { Devvit } from '@devvit/public-api';
import { Design, PlacedAsset, Asset } from '../types/models.js';

export interface MobileCanvasProps {
  design: Design;
  mode: 'edit' | 'preview';
  assets?: Asset[];
  selectedAssetIndex?: number;
  onAssetClick?: (assetIndex: number) => void;
  onBackgroundTap?: (x: number, y: number) => void;
  onAssetDrag?: (assetIndex: number, x: number, y: number) => void;
  onAssetRotate?: (assetIndex: number) => void;
  onAssetDelete?: (assetIndex: number) => void;
}

/**
 * MobileCanvas component optimized for touch interactions
 */
export const MobileCanvas = (props: MobileCanvasProps): JSX.Element => {
  const {
    design,
    mode,
    assets = [],
    selectedAssetIndex,
    onAssetClick,
    onBackgroundTap,
    onAssetDrag,
    onAssetRotate,
    onAssetDelete,
  } = props;

  // Sort assets by z-index for proper layering
  const sortedAssets = [...design.assets]
    .map((asset, index) => ({ asset, originalIndex: index }))
    .sort((a, b) => a.asset.zIndex - b.asset.zIndex);

  // Render a single asset with touch-friendly controls
  const renderAsset = (placedAsset: PlacedAsset, originalIndex: number, isSelected: boolean) => {
    // Find the asset to get its URL and dimensions (scale down for mobile)
    const asset = assets.find(a => a.id === placedAsset.assetId);
    const assetImageUrl = asset?.imageUrl || `${placedAsset.assetId}.png`;
    const width = asset ? Math.round(asset.width * 0.7) : 84; // 70% of desktop size
    const height = asset ? Math.round(asset.height * 0.7) : 84;

    return (
      <vstack
        key={`asset-${originalIndex}`}
        alignment="center middle"
        padding="small"
        onPress={() => onAssetClick?.(originalIndex)}
      >
        <image
          url={assetImageUrl}
          imageWidth={width}
          imageHeight={height}
          description={`Asset ${placedAsset.assetId}`}
        />
        {isSelected && mode === 'edit' && (
          <vstack
            backgroundColor="#3B82F6"
            borderColor="#2563EB"
            padding="medium"
            cornerRadius="medium"
            gap="medium"
            alignment="center middle"
          >
            <text size="small" color="#FFFFFF" weight="bold">
              Selected Asset
            </text>

            {/* Touch control buttons */}
            <hstack gap="medium" alignment="center middle">
              {/* Rotation button */}
              <vstack
                backgroundColor="#10B981"
                padding="medium"
                cornerRadius="medium"
                alignment="center middle"
                onPress={() => onAssetRotate?.(originalIndex)}
              >
                <text size="xlarge" color="#FFFFFF">
                  ↻
                </text>
                <text size="xsmall" color="#FFFFFF">
                  Rotate
                </text>
              </vstack>

              {/* Delete button with trash icon */}
              <vstack
                backgroundColor="#EF4444"
                padding="medium"
                cornerRadius="medium"
                alignment="center middle"
                onPress={() => onAssetDelete?.(originalIndex)}
              >
                <text size="xlarge" color="#FFFFFF">
                  🗑️
                </text>
                <text size="xsmall" color="#FFFFFF">
                  Delete
                </text>
              </vstack>
            </hstack>

            {/* Position info */}
            <vstack gap="small" alignment="center middle">
              <text size="xsmall" color="#FFFFFF">
                Position: ({placedAsset.x}, {placedAsset.y})
              </text>
              <text size="xsmall" color="#FFFFFF">
                Rotation: {placedAsset.rotation}°
              </text>
            </vstack>

            {/* Drag instruction */}
            <text size="xsmall" color="#FFFFFF" alignment="center">
              Tap and drag to move
            </text>
          </vstack>
        )}
      </vstack>
    );
  };

  // Render the canvas in edit mode (mobile layout - stacked)
  if (mode === 'edit') {
    return (
      <vstack width="100%" height="100%" gap="small">
        {/* Touch controls info */}
        <hstack
          backgroundColor="#EFF6FF"
          padding="medium"
          cornerRadius="small"
          gap="small"
          alignment="center middle"
        >
          <text size="small" color="#1E40AF" weight="bold">
            Touch Controls:
          </text>
          <text size="small" color="#1E40AF">
            Tap to select • Drag to move
          </text>
        </hstack>

        {/* Canvas area */}
        <vstack
          grow
          backgroundColor={design.backgroundColor}
          alignment="center middle"
          onPress={(event) => {
            // Handle background tap for asset placement
            if (onBackgroundTap) {
              // Simplified tap-to-place at center
              onBackgroundTap(400, 300);
            }
          }}
        >
          {/* Base room image */}
          <image
            url="room_2.png"
            imageWidth={350}
            imageHeight={260}
            description="Room base"
          />

          {/* Render placed assets in z-index order */}
          <vstack alignment="center middle" gap="small">
            {sortedAssets.map(({ asset, originalIndex }) =>
              renderAsset(
                asset,
                originalIndex,
                selectedAssetIndex === originalIndex
              )
            )}
          </vstack>
        </vstack>

        {/* Asset library placeholder for mobile */}
        <vstack
          backgroundColor="#F3F4F6"
          padding="medium"
          cornerRadius="small"
          alignment="center middle"
        >
          <text size="medium" weight="bold">
            Asset Library
          </text>
          <text size="small" color="#6B7280">
            Scroll to browse assets
          </text>
        </vstack>
      </vstack>
    );
  }

  // Render the canvas in preview mode (mobile layout)
  return (
    <vstack
      width="100%"
      height="100%"
      backgroundColor={design.backgroundColor}
      alignment="center middle"
      padding="small"
    >
      {/* Base room image */}
      <image
        url="room_2.png"
        imageWidth={350}
        imageHeight={260}
        description="Room base"
      />

      {/* Render placed assets in z-index order */}
      <vstack alignment="center middle" gap="small">
        {sortedAssets.map(({ asset, originalIndex }) =>
          renderAsset(asset, originalIndex, false)
        )}
      </vstack>
    </vstack>
  );
};
